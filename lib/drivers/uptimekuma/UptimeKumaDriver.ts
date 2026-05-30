/**
 * Uptime Kuma monitoring system driver implementation
 *
 * Connects to Uptime Kuma's push monitor API (api/v1/) using API key
 * authentication. Converts Uptime Kuma monitor and heartbeat data into the
 * Nezha-compatible format consumed by the rest of NezhaDash Pro.
 */

import { connection } from "next/server"
import { BaseDriver } from "../base"
import type {
  DriverConfig,
  NezhaAPI,
  NezhaAPIHost,
  NezhaAPIMonitor,
  NezhaAPIStatus,
  ServerApi,
} from "../types"
import { DriverConfigError, DriverOperationError } from "../types"

// ---------------------------------------------------------------------------
// Uptime Kuma API response types
// ---------------------------------------------------------------------------

/** Represents a single Uptime Kuma monitor */
interface UptimeKumaMonitor {
  id: number
  name: string
  url: string
  type: string // "http" | "keyword" | "tcp" | "ping" | "dns" | "push" | …
  interval: number
  retryInterval: number
  resendInterval: number
  maxretries: number
  hostname?: string
  port?: number
  active: boolean
  forceInactive: boolean
  accepted_statuscodes: string[]
  dns_resolve_type: string
  dns_resolve_server: string
  notificationIDList: Record<string, boolean>
  tags: Array<{ id: number; name: string; color: string }>
}

/** A heartbeat entry from Uptime Kuma */
interface UptimeKumaHeartbeat {
  id: number
  monitor_id: number
  status: number // 0 = down, 1 = up, 2 = pending, 3 = maintenance
  msg: string
  time: string
  ping: number | null // latency in ms
  important: boolean
  duration: number
}

/** Incident / important heartbeat */
interface UptimeKumaIncident {
  id: number
  monitor_id: number
  status: number
  msg: string
  time: string
  ping: number | null
}

/** A single monitor's aggregated data from the API */
interface UptimeKumaMonitorData {
  monitor: UptimeKumaMonitor
  heartbeats: UptimeKumaHeartbeat[]
  importantHeartbeats: UptimeKumaHeartbeat[]
  uptime: number // 0-1 ratio, e.g. 0.998
}

/** /api/v1/monitors response shape */
interface UptimeKumaMonitorsResponse {
  ok: boolean
  monitors: Record<string, UptimeKumaMonitorData>
}

/** /api/v1/monitor/:id response shape */
interface UptimeKumaMonitorDetailResponse {
  ok: boolean
  monitor: UptimeKumaMonitorData
}

// ---------------------------------------------------------------------------
// UptimeKumaDriver
// ---------------------------------------------------------------------------

export class UptimeKumaDriver extends BaseDriver {
  /** Cached monitor data keyed by Uptime Kuma monitor ID */
  private monitorCache: Map<number, UptimeKumaMonitorData> = new Map()
  /** Map of generated Nezha numeric IDs → Uptime Kuma monitor IDs */
  private idMap: Map<number, number> = new Map()

  constructor() {
    super("uptimekuma", {
      supportsMonitoring: true,
      supportsRealTimeData: true,
      supportsHistoricalData: true,
      supportsIpInfo: false,
      supportsPacketLoss: true,
      supportsAlerts: true,
    })
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  protected async onInitialize(config: DriverConfig): Promise<void> {
    if (!config.auth) {
      throw new DriverConfigError(
        this.name,
        "API key is required. Set it via the `auth` config field.",
      )
    }
  }

  protected async onDispose(): Promise<void> {
    this.monitorCache.clear()
    this.idMap.clear()
  }

  protected async onHealthCheck(): Promise<void> {
    await this.fetchMonitors()
  }

  // -----------------------------------------------------------------------
  // Public driver interface
  // -----------------------------------------------------------------------

  /**
   * Fetch all monitors from Uptime Kuma and return them as a Nezha-compatible
   * ServerApi. Each Uptime Kuma monitor is treated as a "server".
   */
  async getServers(): Promise<ServerApi> {
    await connection()
    this.ensureInitialized()

    const monitors = await this.fetchMonitors()
    const timestamp = Math.floor(Date.now() / 1000)

    const data: ServerApi = {
      live_servers: 0,
      offline_servers: 0,
      total_out_bandwidth: 0,
      total_in_bandwidth: 0,
      total_out_speed: 0,
      total_in_speed: 0,
      result: [],
    }

    for (const entry of Object.values(monitors)) {
      const server = this.convertMonitorToNezha(entry, timestamp)

      if (server.online_status) {
        data.live_servers += 1
      } else {
        data.offline_servers += 1
      }

      data.result.push(server)
    }

    // Sort by display_index (which we derive from monitor id)
    data.result.sort((a, b) => a.display_index - b.display_index)

    return data
  }

  /**
   * Get detailed information for a single monitor (treated as a "server").
   */
  async getServerDetail(serverId: number): Promise<NezhaAPI> {
    await connection()
    this.ensureInitialized()

    const ukId = this.resolveUkId(serverId)
    const monitorData = await this.fetchMonitorDetail(ukId)
    const timestamp = Math.floor(Date.now() / 1000)

    return this.convertMonitorToNezha(monitorData, timestamp)
  }

  /**
   * Get historical monitoring data (heartbeat history) for a monitor,
   * converted to the NezhaAPIMonitor chart format.
   */
  protected async onGetServerMonitor(serverId: number): Promise<NezhaAPIMonitor[]> {
    await connection()
    this.ensureInitialized()

    const ukId = this.resolveUkId(serverId)
    const monitorData = await this.fetchMonitorDetail(ukId)

    if (!monitorData.heartbeats || monitorData.heartbeats.length === 0) {
      return []
    }

    // Group heartbeats by a rough "monitor name" key — here we use the
    // monitor name since Uptime Kuma doesn't have Nezha-style monitor groups.
    const created_at: number[] = []
    const avg_delay: number[] = []
    const packet_loss: number[] = []

    for (const hb of monitorData.heartbeats) {
      const ts = Math.floor(new Date(hb.time).getTime() / 1000)
      created_at.push(ts)
      avg_delay.push(hb.ping ?? 0)
      packet_loss.push(hb.status === 0 ? 100 : 0)
    }

    const monitor: NezhaAPIMonitor = {
      monitor_id: ukId,
      monitor_name: monitorData.monitor.name,
      server_id: serverId,
      server_name: monitorData.monitor.name,
      created_at,
      avg_delay,
      packet_loss,
    }

    return [monitor]
  }

  /**
   * Uptime Kuma does not expose host IP information directly.
   */
  protected async onGetServerIP(_serverId: number): Promise<string> {
    return ""
  }

  // -----------------------------------------------------------------------
  // Uptime Kuma API helpers
  // -----------------------------------------------------------------------

  /**
   * Fetch all monitors with their heartbeat data.
   * Uses GET /api/v1/monitors.
   */
  private async fetchMonitors(): Promise<Record<string, UptimeKumaMonitorData>> {
    const response = await fetch(
      `${this.config?.baseUrl}/api/v1/monitors`,
      this.createFetchOptions(this.buildAuthHeaders()),
    )

    const data: UptimeKumaMonitorsResponse = await this.handleFetchResponse(response)

    if (!data.ok || !data.monitors) {
      throw new DriverOperationError(this.name, "fetchMonitors", "API returned ok=false or missing monitors")
    }

    // Update cache
    this.monitorCache.clear()
    for (const [idStr, monitorData] of Object.entries(data.monitors)) {
      const id = Number.parseInt(idStr, 10)
      this.monitorCache.set(id, monitorData)
      // Ensure ID mapping is populated
      const nezhaId = this.generateNezhaId(id)
      this.idMap.set(nezhaId, id)
    }

    return data.monitors
  }

  /**
   * Fetch detail for a single monitor.
   * Uses GET /api/v1/monitor/:id.
   */
  private async fetchMonitorDetail(ukMonitorId: number): Promise<UptimeKumaMonitorData> {
    // Check cache first
    const cached = this.monitorCache.get(ukMonitorId)
    if (cached) {
      return cached
    }

    const response = await fetch(
      `${this.config?.baseUrl}/api/v1/monitor/${ukMonitorId}`,
      this.createFetchOptions(this.buildAuthHeaders()),
    )

    const data: UptimeKumaMonitorDetailResponse = await this.handleFetchResponse(response)

    if (!data.ok || !data.monitor) {
      throw new DriverOperationError(
        this.name,
        "fetchMonitorDetail",
        `Failed to fetch monitor ${ukMonitorId}`,
      )
    }

    this.monitorCache.set(ukMonitorId, data.monitor)
    return data.monitor
  }

  // -----------------------------------------------------------------------
  // Data conversion
  // -----------------------------------------------------------------------

  /**
   * Convert a UptimeKumaMonitorData entry into a NezhaAPI-compatible object.
   */
  private convertMonitorToNezha(
    monitorData: UptimeKumaMonitorData,
    timestamp: number,
  ): NezhaAPI {
    const { monitor, heartbeats, uptime } = monitorData

    const nezhaId = this.generateNezhaId(monitor.id)
    this.idMap.set(nezhaId, monitor.id)

    // Determine online status from most recent heartbeat
    const latestHb = heartbeats.length > 0 ? heartbeats[heartbeats.length - 1] : null
    const isOnline = latestHb ? latestHb.status === 1 && monitor.active : false

    // Calculate average latency from recent heartbeats
    const recentPings = heartbeats
      .slice(-20)
      .map((hb) => hb.ping)
      .filter((p): p is number => p !== null && p > 0)
    const avgPing = recentPings.length > 0
      ? recentPings.reduce((sum, p) => sum + p, 0) / recentPings.length
      : 0

    // Calculate packet loss from recent heartbeats
    const recentHeartbeats = heartbeats.slice(-20)
    const downCount = recentHeartbeats.filter((hb) => hb.status === 0).length
    const packetLossPercent = recentHeartbeats.length > 0
      ? (downCount / recentHeartbeats.length) * 100
      : 0

    // Determine last active time
    const lastActive = latestHb
      ? Math.floor(new Date(latestHb.time).getTime() / 1000)
      : timestamp

    // Build host info (limited in Uptime Kuma)
    const host: NezhaAPIHost = {
      Platform: "",
      PlatformVersion: "",
      CPU: [],
      MemTotal: 0,
      DiskTotal: 0,
      SwapTotal: 0,
      Arch: "",
      Virtualization: "",
      BootTime: 0,
      CountryCode: "",
      Version: "",
      GPU: [],
    }

    // Build status info using available Uptime Kuma data
    const status: NezhaAPIStatus = {
      CPU: 0,
      MemUsed: 0,
      SwapUsed: 0,
      DiskUsed: 0,
      NetInTransfer: 0,
      NetOutTransfer: 0,
      NetInSpeed: 0,
      NetOutSpeed: 0,
      Uptime: uptime ? Math.floor(uptime * 86400) : 0, // uptime ratio → seconds approximation
      Load1: avgPing,
      Load5: 0,
      Load15: 0,
      TcpConnCount: 0,
      UdpConnCount: 0,
      ProcessCount: 0,
      Temperatures: packetLossPercent,
      GPU: 0,
    }

    return {
      id: nezhaId,
      name: monitor.name,
      tag: this.extractTags(monitor),
      last_active: lastActive,
      online_status: isOnline,
      ipv4: "",
      ipv6: "",
      valid_ip: "",
      display_index: monitor.id,
      hide_for_guest: !monitor.active,
      host,
      status,
    }
  }

  // -----------------------------------------------------------------------
  // Utility helpers
  // -----------------------------------------------------------------------

  /**
   * Build authentication headers for Uptime Kuma API.
   * Uses the Authorization header with the API key.
   */
  private buildAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config?.auth || ""}`,
    }
  }

  /**
   * Generate a deterministic numeric ID from a Uptime Kuma monitor ID.
   * Adds a large offset to avoid collisions with IDs from other drivers.
   */
  private generateNezhaId(ukId: number): number {
    // Prefix with 800000 to distinguish from other drivers
    return 800000 + ukId
  }

  /**
   * Resolve a Nezha-style server ID back to a Uptime Kuma monitor ID.
   */
  private resolveUkId(nezhaId: number): number {
    const cached = this.idMap.get(nezhaId)
    if (cached !== undefined) {
      return cached
    }

    // Try direct reverse mapping
    if (nezhaId > 800000) {
      return nezhaId - 800000
    }

    throw new DriverOperationError(
      this.name,
      "resolveUkId",
      `Cannot resolve Uptime Kuma monitor ID for server ${nezhaId}`,
    )
  }

  /**
   * Extract a human-readable tag string from monitor tags.
   */
  private extractTags(monitor: UptimeKumaMonitor): string {
    if (!monitor.tags || monitor.tags.length === 0) {
      return monitor.type.toUpperCase()
    }
    return monitor.tags.map((t) => t.name).join(", ")
  }
}

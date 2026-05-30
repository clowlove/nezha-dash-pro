// WebSocket server for real-time updates
// Server status push, alert notifications, live metrics streaming

import { getEventBus, type ServerStatusEvent, type AlertEvent, type MetricsEvent } from '../core/event-bus';
import { getLogger } from '../core/logger';
import type { NextRequest } from 'next/server';

// ── Types ─────────────────────────────────────────────────────────────────

export interface WSClient {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  connectedAt: number;
  lastPing: number;
  metadata: Map<string, unknown>;
}

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong' | 'data' | 'error' | 'welcome';
  channel?: string;
  payload?: unknown;
  timestamp?: number;
  clientId?: string;
}

export type ChannelType = 'server:status' | 'server:metrics' | 'alerts' | 'system' | string;

// ── WebSocket Manager ─────────────────────────────────────────────────────

export class RealtimeManager {
  private clients = new Map<string, WSClient>();
  private channelSubscribers = new Map<string, Set<string>>();
  private eventBus = getEventBus();
  private logger = getLogger('realtime');
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private metricsBuffer = new Map<string, MetricsEvent[]>();
  private bufferFlushInterval: ReturnType<typeof setInterval> | null = null;
  private maxBufferSize = 100;

  constructor() {
    this.setupEventListeners();
    this.startPingLoop();
    this.startMetricsFlush();
  }

  /** Register a new WebSocket connection */
  connect(socket: WebSocket, metadata?: Map<string, unknown>): WSClient {
    const client: WSClient = {
      id: crypto.randomUUID(),
      socket,
      subscriptions: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
      metadata: metadata ?? new Map(),
    };

    this.clients.set(client.id, client);

    // Send welcome
    this.send(client, {
      type: 'welcome',
      clientId: client.id,
      timestamp: Date.now(),
    });

    // Setup message handler
    socket.addEventListener('message', (event) => this.handleMessage(client, event));
    socket.addEventListener('close', () => this.disconnect(client.id));
    socket.addEventListener('error', () => this.disconnect(client.id));

    this.logger.info('client.connected', {
      clientId: client.id,
      totalClients: this.clients.size,
    });

    return client;
  }

  /** Disconnect a client */
  disconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    for (const channel of client.subscriptions) {
      const subs = this.channelSubscribers.get(channel);
      subs?.delete(clientId);
      if (subs && subs.size === 0) this.channelSubscribers.delete(channel);
    }

    this.clients.delete(clientId);

    this.logger.info('client.disconnected', {
      clientId,
      totalClients: this.clients.size,
    });
  }

  /** Subscribe a client to a channel */
  subscribe(clientId: string, channel: ChannelType): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);

    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(clientId);

    this.logger.debug('channel.subscribed', { clientId, channel });
  }

  /** Unsubscribe a client from a channel */
  unsubscribe(clientId: string, channel: ChannelType): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    this.channelSubscribers.get(channel)?.delete(clientId);

    this.logger.debug('channel.unsubscribed', { clientId, channel });
  }

  /** Broadcast to all clients subscribed to a channel */
  broadcast(channel: string, payload: unknown): void {
    const subscribers = this.channelSubscribers.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const message: WSMessage = {
      type: 'data',
      channel,
      payload,
      timestamp: Date.now(),
    };

    let sent = 0;
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        this.send(client, message);
        sent++;
      }
    }

    this.logger.debug('broadcast', { channel, recipients: sent });
  }

  /** Send a message to a specific client */
  send(client: WSClient, message: WSMessage): void {
    if (client.socket.readyState !== WebSocket.OPEN) return;
    try {
      client.socket.send(JSON.stringify(message));
    } catch (err) {
      this.logger.error('send.failed', { clientId: client.id, error: String(err) });
      this.disconnect(client.id);
    }
  }

  /** Get connected clients count */
  getClientCount(): number {
    return this.clients.size;
  }

  /** Get channel subscriber count */
  getChannelCount(channel: string): number {
    return this.channelSubscribers.get(channel)?.size ?? 0;
  }

  /** Get all active channels */
  getActiveChannels(): string[] {
    return Array.from(this.channelSubscribers.keys());
  }

  /** Shutdown gracefully */
  shutdown(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.bufferFlushInterval) clearInterval(this.bufferFlushInterval);

    for (const [, client] of this.clients) {
      client.socket.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.channelSubscribers.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private handleMessage(client: WSClient, event: MessageEvent): void {
    let msg: WSMessage;
    try {
      msg = JSON.parse(event.data as string) as WSMessage;
    } catch {
      this.send(client, { type: 'error', payload: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'subscribe':
        if (msg.channel) this.subscribe(client.id, msg.channel);
        break;
      case 'unsubscribe':
        if (msg.channel) this.unsubscribe(client.id, msg.channel);
        break;
      case 'ping':
        client.lastPing = Date.now();
        this.send(client, { type: 'pong', timestamp: Date.now() });
        break;
      default:
        this.send(client, { type: 'error', payload: `Unknown message type: ${msg.type}` });
    }
  }

  private setupEventListeners(): void {
    // Forward server status changes
    this.eventBus.on<ServerStatusEvent>('server:status', (event) => {
      this.broadcast('server:status', event);
    });

    // Forward alert events
    this.eventBus.on<AlertEvent>('alert:fired', (event) => {
      this.broadcast('alerts', { action: 'fired', ...event });
    });
    this.eventBus.on<AlertEvent>('alert:resolved', (event) => {
      this.broadcast('alerts', { action: 'resolved', ...event });
    });

    // Buffer metrics for batched delivery
    this.eventBus.on<MetricsEvent>('server:metrics', (event) => {
      const key = `server:${event.serverId}`;
      if (!this.metricsBuffer.has(key)) {
        this.metricsBuffer.set(key, []);
      }
      const buf = this.metricsBuffer.get(key)!;
      buf.push(event);
      if (buf.length >= this.maxBufferSize) buf.shift();

      // Immediate push for live metrics channel
      this.broadcast(`server:metrics:${event.serverId}`, event);
    });
  }

  private startPingLoop(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, client] of this.clients) {
        // Disconnect stale clients (no pong for 60s)
        if (now - client.lastPing > 60_000) {
          this.logger.warn('client.stale', { clientId: id });
          this.disconnect(id);
          continue;
        }
        this.send(client, { type: 'ping', timestamp: now });
      }
    }, 30_000);
  }

  private startMetricsFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      for (const [key, buffer] of this.metricsBuffer) {
        if (buffer.length > 0) {
          const serverId = key.split(':')[1];
          this.broadcast(`server:metrics:batch:${serverId}`, buffer);
          this.metricsBuffer.set(key, []);
        }
      }
    }, 5_000);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _realtime: RealtimeManager | null = null;

export function getRealtimeManager(): RealtimeManager {
  if (!_realtime) _realtime = new RealtimeManager();
  return _realtime;
}

// ── HTTP upgrade helper (for Next.js API route) ───────────────────────────

export function handleUpgrade(req: NextRequest): Response | null {
  const upgrade = req.headers.get('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') return null;
  // Actual upgrade handling depends on the deployment environment
  // For Next.js, this is typically handled at the custom server level
  return null;
}

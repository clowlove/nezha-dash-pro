/**
 * Alert Manager
 *
 * Core engine that evaluates alert rules against server data,
 * manages the alert lifecycle (active → resolved/acknowledged),
 * and dispatches notifications.
 */

import { randomUUID } from "crypto"
import type {
  Alert,
  AlertEvent,
  AlertRule,
  AlertStatus,
} from "./types"
import type { NezhaAPI, ServerApi } from "../drivers/types"
import { getEnabledRules, evaluateRule } from "./rules"
import { requestAIDiagnosis } from "./ai-diagnosis"

// ---------------------------------------------------------------------------
// In-memory alert store (swap for DB in production)
// ---------------------------------------------------------------------------

const alertsStore: Map<string, Alert> = new Map()

/** Track last-triggered timestamps per rule+server to enforce cooldowns */
const lastTriggeredMap: Map<string, number> = new Map()

/** Track how long a condition has been continuously true (rule+server → seconds) */
const conditionStartMap: Map<string, number> = new Map()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cooldownKey(ruleId: string, serverId: number): string {
  return `${ruleId}:${serverId}`
}

function buildAlertMessage(rule: AlertRule, serverName: string, value: number): string {
  const metricLabels: Record<string, string> = {
    cpu: "CPU",
    memory: "Memory",
    disk: "Disk",
    packet_loss: "Packet Loss",
    offline: "Offline Duration",
    load: "Load",
    gpu: "GPU",
    custom: "Custom",
  }
  const label = metricLabels[rule.metric] ?? rule.metric
  const unit = rule.metric === "packet_loss" ? "%" : rule.metric === "offline" ? "s" : "%"
  return `[${serverName}] ${label} is ${value}${unit} (threshold: ${rule.operator}${rule.threshold}${unit})`
}

/**
 * Extract the current metric value from a server record.
 * Returns null if the metric is not available.
 */
function extractMetricValue(
  metric: string,
  server: NezhaAPI,
  serverApi?: ServerApi,
): number | null {
  const status = server.status
  const host = server.host

  switch (metric) {
    case "cpu":
      return status.CPU
    case "memory":
      return host.MemTotal > 0 ? (status.MemUsed / host.MemTotal) * 100 : 0
    case "disk":
      return host.DiskTotal > 0 ? (status.DiskUsed / host.DiskTotal) * 100 : 0
    case "gpu":
      return status.GPU
    case "load":
      return status.Load1
    case "offline": {
      // last_active is a unix timestamp (seconds).  Value = seconds since last seen.
      const nowSeconds = Math.floor(Date.now() / 1000)
      return server.last_active > 0 ? nowSeconds - server.last_active : Infinity
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate all enabled rules against the provided server data.
 * Returns any newly triggered alerts.
 */
export function evaluateAllRules(serverData: ServerApi): Alert[] {
  const rules = getEnabledRules()
  const servers = serverData.result
  const now = Date.now()
  const newlyTriggered: Alert[] = []

  for (const rule of rules) {
    for (const server of servers) {
      // Skip servers not in the rule's filter (if set)
      if (rule.serverIds && rule.serverIds.length > 0 && !rule.serverIds.includes(server.id)) {
        continue
      }

      const value = extractMetricValue(rule.metric, server, serverData)
      if (value === null) continue

      const key = cooldownKey(rule.id, server.id)
      const conditionMet = evaluateRule(rule, value)

      if (conditionMet) {
        // Track how long the condition has been true
        if (!conditionStartMap.has(key)) {
          conditionStartMap.set(key, now)
        }

        const conditionDurationMs = now - (conditionStartMap.get(key) ?? now)
        const conditionDurationSec = conditionDurationMs / 1000

        // Check if the rule's required duration is satisfied
        if (conditionDurationSec < rule.duration) continue

        // Check cooldown
        const lastTriggered = lastTriggeredMap.get(key) ?? 0
        const cooldownMs = rule.cooldown * 1000
        if (now - lastTriggered < cooldownMs) continue

        // Check if there's already an active alert for this rule+server
        const existingActive = Array.from(alertsStore.values()).find(
          (a) => a.ruleId === rule.id && a.serverId === server.id && a.status === "active",
        )
        if (existingActive) continue

        // Trigger new alert
        const alert: Alert = {
          id: randomUUID(),
          ruleId: rule.id,
          ruleName: rule.name,
          serverId: server.id,
          serverName: server.name,
          metricValue: Number(value.toFixed(2)),
          threshold: rule.threshold,
          operator: rule.operator,
          severity: rule.severity,
          status: "active",
          message: buildAlertMessage(rule, server.name, Number(value.toFixed(2))),
          triggeredAt: new Date().toISOString(),
          notificationStatus: {},
        }

        alertsStore.set(alert.id, alert)
        lastTriggeredMap.set(key, now)
        newlyTriggered.push(alert)

        // Fire-and-forget AI diagnosis
        requestAIDiagnosis({
          alertId: alert.id,
          serverName: server.name,
          metric: rule.metric,
          metricValue: alert.metricValue,
          threshold: rule.threshold,
          severity: rule.severity,
          context: {
            host: server.host,
            status: server.status,
          },
        }).then((diagnosis) => {
          const stored = alertsStore.get(alert.id)
          if (stored && diagnosis) {
            stored.aiDiagnosis = `${diagnosis.rootCause}\n\nFix suggestions:\n${diagnosis.suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
          }
        }).catch((err) => {
          console.error(`AI diagnosis failed for alert ${alert.id}:`, err)
        })
      } else {
        // Condition no longer met → reset duration tracker
        conditionStartMap.delete(key)

        // Auto-resolve any active alert for this rule+server
        const existingActive = Array.from(alertsStore.values()).find(
          (a) => a.ruleId === rule.id && a.serverId === server.id && a.status === "active",
        )
        if (existingActive) {
          existingActive.status = "resolved"
          existingActive.resolvedAt = new Date().toISOString()
        }
      }
    }
  }

  return newlyTriggered
}

// ---------------------------------------------------------------------------
// Alert lifecycle
// ---------------------------------------------------------------------------

export function acknowledgeAlert(alertId: string, acknowledgedBy = "user"): Alert {
  const alert = alertsStore.get(alertId)
  if (!alert) {
    throw new Error(`Alert not found: ${alertId}`)
  }
  if (alert.status !== "active") {
    throw new Error(`Alert ${alertId} is not active (current: ${alert.status})`)
  }
  alert.status = "acknowledged"
  alert.acknowledgedAt = new Date().toISOString()
  alert.acknowledgedBy = acknowledgedBy
  return alert
}

export function resolveAlert(alertId: string): Alert {
  const alert = alertsStore.get(alertId)
  if (!alert) {
    throw new Error(`Alert not found: ${alertId}`)
  }
  alert.status = "resolved"
  alert.resolvedAt = new Date().toISOString()
  return alert
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getAllAlerts(): Alert[] {
  return Array.from(alertsStore.values()).sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
  )
}

export function getActiveAlerts(): Alert[] {
  return getAllAlerts().filter((a) => a.status === "active")
}

export function getAlertsByServer(serverId: number): Alert[] {
  return getAllAlerts().filter((a) => a.serverId === serverId)
}

export function getAlertsBySeverity(severity: string): Alert[] {
  return getAllAlerts().filter((a) => a.severity === severity)
}

export function getAlertById(alertId: string): Alert | undefined {
  return alertsStore.get(alertId)
}

/**
 * Purge resolved/acknowledged alerts older than `maxAgeMs` (default 7 days).
 */
export function purgeStaleAlerts(maxAgeMs = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs
  let purged = 0
  for (const [id, alert] of alertsStore) {
    if (alert.status !== "active" && new Date(alert.triggeredAt).getTime() < cutoff) {
      alertsStore.delete(id)
      purged++
    }
  }
  return purged
}

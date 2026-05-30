/**
 * Alert Rules - Default rules and CRUD operations
 *
 * Provides out-of-the-box alert rules for common server issues and
 * an in-memory CRUD store. In production you'd swap the store for a
 * database; the interface stays the same.
 */

import { randomUUID } from "crypto"
import type { AlertRule, AlertMetricType, AlertSeverity, ComparisonOperator, CreateAlertRuleRequest, UpdateAlertRuleRequest } from "./types"
import { AlertRuleNotFoundError } from "./types"

// ---------------------------------------------------------------------------
// In-memory store (swap for DB in production)
// ---------------------------------------------------------------------------

const rulesStore: Map<string, AlertRule> = new Map()

// ---------------------------------------------------------------------------
// Default rules
// ---------------------------------------------------------------------------

export const DEFAULT_RULES: Omit<AlertRule, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "High CPU Usage",
    description: "Triggers when CPU usage exceeds 90% for 5 minutes",
    enabled: true,
    metric: "cpu",
    operator: ">",
    threshold: 90,
    severity: "critical",
    duration: 300,
    cooldown: 600,
    notificationChannelIds: [],
  },
  {
    name: "High Memory Usage",
    description: "Triggers when memory usage exceeds 95% for 3 minutes",
    enabled: true,
    metric: "memory",
    operator: ">",
    threshold: 95,
    severity: "critical",
    duration: 180,
    cooldown: 600,
    notificationChannelIds: [],
  },
  {
    name: "High Disk Usage",
    description: "Triggers when disk usage exceeds 90%",
    enabled: true,
    metric: "disk",
    operator: ">",
    threshold: 90,
    severity: "warning",
    duration: 60,
    cooldown: 1800,
    notificationChannelIds: [],
  },
  {
    name: "High Packet Loss",
    description: "Triggers when packet loss exceeds 5%",
    enabled: true,
    metric: "packet_loss",
    operator: ">",
    threshold: 5,
    severity: "warning",
    duration: 120,
    cooldown: 600,
    notificationChannelIds: [],
  },
  {
    name: "Server Offline",
    description: "Triggers when a server has been offline for more than 5 minutes",
    enabled: true,
    metric: "offline",
    operator: ">",
    threshold: 300, // seconds
    severity: "critical",
    duration: 0,
    cooldown: 300,
    notificationChannelIds: [],
  },
]

// ---------------------------------------------------------------------------
// Initialise defaults if store is empty
// ---------------------------------------------------------------------------

function ensureDefaults(): void {
  if (rulesStore.size === 0) {
    const now = new Date().toISOString()
    for (const rule of DEFAULT_RULES) {
      const id = randomUUID()
      rulesStore.set(id, { ...rule, id, createdAt: now, updatedAt: now })
    }
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAllRules(): AlertRule[] {
  ensureDefaults()
  return Array.from(rulesStore.values())
}

export function getRuleById(id: string): AlertRule {
  ensureDefaults()
  const rule = rulesStore.get(id)
  if (!rule) throw new AlertRuleNotFoundError(id)
  return rule
}

export function getEnabledRules(): AlertRule[] {
  ensureDefaults()
  return getAllRules().filter((r) => r.enabled)
}

export function createRule(request: CreateAlertRuleRequest): AlertRule {
  ensureDefaults()
  const now = new Date().toISOString()
  const rule: AlertRule = {
    id: randomUUID(),
    name: request.name,
    description: request.description,
    enabled: request.enabled ?? true,
    metric: request.metric,
    operator: request.operator,
    threshold: request.threshold,
    severity: request.severity,
    duration: request.duration ?? 0,
    cooldown: request.cooldown ?? 600,
    notificationChannelIds: request.notificationChannelIds ?? [],
    serverIds: request.serverIds,
    createdAt: now,
    updatedAt: now,
  }
  rulesStore.set(rule.id, rule)
  return rule
}

export function updateRule(request: UpdateAlertRuleRequest): AlertRule {
  ensureDefaults()
  const existing = rulesStore.get(request.id)
  if (!existing) throw new AlertRuleNotFoundError(request.id)

  const updated: AlertRule = {
    ...existing,
    name: request.name ?? existing.name,
    description: request.description ?? existing.description,
    enabled: request.enabled ?? existing.enabled,
    metric: request.metric ?? existing.metric,
    operator: request.operator ?? existing.operator,
    threshold: request.threshold ?? existing.threshold,
    severity: request.severity ?? existing.severity,
    duration: request.duration ?? existing.duration,
    cooldown: request.cooldown ?? existing.cooldown,
    notificationChannelIds: request.notificationChannelIds ?? existing.notificationChannelIds,
    serverIds: request.serverIds ?? existing.serverIds,
    updatedAt: new Date().toISOString(),
  }

  rulesStore.set(updated.id, updated)
  return updated
}

export function deleteRule(id: string): boolean {
  ensureDefaults()
  if (!rulesStore.has(id)) throw new AlertRuleNotFoundError(id)
  return rulesStore.delete(id)
}

/**
 * Evaluate a metric value against a rule's threshold.
 * Returns true if the condition is met.
 */
export function evaluateRule(rule: AlertRule, currentValue: number): boolean {
  switch (rule.operator) {
    case ">":
      return currentValue > rule.threshold
    case ">=":
      return currentValue >= rule.threshold
    case "<":
      return currentValue < rule.threshold
    case "<=":
      return currentValue <= rule.threshold
    case "==":
      return currentValue === rule.threshold
    case "!=":
      return currentValue !== rule.threshold
    default:
      return false
  }
}

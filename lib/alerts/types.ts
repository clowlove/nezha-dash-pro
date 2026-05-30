/**
 * Alert System Types and Interfaces
 *
 * Centralized type definitions for the NezhaDash Pro AI Alert system.
 * Covers alert rules, alert instances, severity levels, statuses,
 * and notification channel configuration.
 */

// ---------------------------------------------------------------------------
// Enums / Literal Unions
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "warning" | "info"

export type AlertStatus = "active" | "resolved" | "acknowledged"

export type AlertMetricType =
  | "cpu"
  | "memory"
  | "disk"
  | "packet_loss"
  | "offline"
  | "load"
  | "gpu"
  | "custom"

export type ComparisonOperator = ">" | ">=" | "<" | "<=" | "==" | "!="

export type NotificationChannelType = "webhook" | "telegram" | "discord" | "email" | "slack" | "bark"

// ---------------------------------------------------------------------------
// Notification Channel
// ---------------------------------------------------------------------------

export interface NotificationChannel {
  /** Unique channel identifier */
  id: string
  /** Human-readable channel name */
  name: string
  /** Channel type */
  type: NotificationChannelType
  /** Webhook URL / API endpoint */
  endpoint: string
  /** Optional secret or token for authentication */
  secret?: string
  /** Whether the channel is currently enabled */
  enabled: boolean
  /** Additional per-channel options (e.g. chat_id for Telegram) */
  options?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Alert Rule
// ---------------------------------------------------------------------------

export interface AlertRule {
  /** Unique rule identifier (uuid) */
  id: string
  /** Human-readable rule name */
  name: string
  /** Optional description */
  description?: string
  /** Whether this rule is active */
  enabled: boolean
  /** Which metric to evaluate */
  metric: AlertMetricType
  /** Comparison operator for the threshold */
  operator: ComparisonOperator
  /** Threshold value (percentage for cpu/mem/disk, absolute for packet_loss) */
  threshold: number
  /** Severity assigned to alerts triggered by this rule */
  severity: AlertSeverity
  /** How long (seconds) the condition must hold before triggering */
  duration: number
  /** Cooldown (seconds) before the same rule can fire again for the same server */
  cooldown: number
  /** IDs of notification channels to use */
  notificationChannelIds: string[]
  /** Optional: limit to specific server IDs (empty = all servers) */
  serverIds?: number[]
  /** Creation timestamp (ISO-8601) */
  createdAt: string
  /** Last update timestamp (ISO-8601) */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Alert Instance
// ---------------------------------------------------------------------------

export interface Alert {
  /** Unique alert identifier (uuid) */
  id: string
  /** The rule that triggered this alert */
  ruleId: string
  /** Rule name snapshot (so it survives rule edits/deletes) */
  ruleName: string
  /** ID of the server that triggered the alert */
  serverId: number
  /** Name of the server at trigger time */
  serverName: string
  /** Current metric value that breached the threshold */
  metricValue: number
  /** The threshold that was breached */
  threshold: number
  /** Operator used for comparison */
  operator: ComparisonOperator
  /** Severity of the alert */
  severity: AlertSeverity
  /** Current status */
  status: AlertStatus
  /** Human-readable message */
  message: string
  /** AI-generated diagnosis (filled asynchronously) */
  aiDiagnosis?: string
  /** Timestamp when the alert was first triggered (ISO-8601) */
  triggeredAt: string
  /** Timestamp when the alert was resolved (ISO-8601) */
  resolvedAt?: string
  /** Timestamp when the alert was acknowledged (ISO-8601) */
  acknowledgedAt?: string
  /** Who acknowledged the alert */
  acknowledgedBy?: string
  /** Notification delivery status per channel */
  notificationStatus?: Record<string, "pending" | "sent" | "failed">
}

// ---------------------------------------------------------------------------
// AI Diagnosis
// ---------------------------------------------------------------------------

export interface AIDiagnosisRequest {
  alertId: string
  serverName: string
  metric: AlertMetricType
  metricValue: number
  threshold: number
  severity: AlertSeverity
  /** Optional context like server host info, recent history, etc. */
  context?: Record<string, unknown>
}

export interface AIDiagnosisResult {
  alertId: string
  /** Short root-cause summary */
  rootCause: string
  /** Numbered fix suggestions */
  suggestions: string[]
  /** Whether the AI considers this actionable */
  actionable: boolean
  /** Raw LLM response for debugging */
  rawResponse?: string
  /** Timestamp of diagnosis */
  diagnosedAt: string
}

// ---------------------------------------------------------------------------
// Alert Manager Events
// ---------------------------------------------------------------------------

export interface AlertEvent {
  type: "triggered" | "resolved" | "acknowledged" | "diagnosis"
  alert: Alert
  timestamp: string
}

// ---------------------------------------------------------------------------
// API Payloads
// ---------------------------------------------------------------------------

export interface AlertListResponse {
  alerts: Alert[]
  total: number
}

export interface AlertRuleListResponse {
  rules: AlertRule[]
  total: number
}

export interface AcknowledgeAlertRequest {
  alertId: string
  acknowledgedBy?: string
}

export interface CreateAlertRuleRequest {
  name: string
  description?: string
  enabled?: boolean
  metric: AlertMetricType
  operator: ComparisonOperator
  threshold: number
  severity: AlertSeverity
  duration?: number
  cooldown?: number
  notificationChannelIds?: string[]
  serverIds?: number[]
}

export interface UpdateAlertRuleRequest extends Partial<CreateAlertRuleRequest> {
  id: string
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AlertError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = "AlertError"
  }
}

export class AlertRuleNotFoundError extends AlertError {
  constructor(ruleId: string) {
    super(`Alert rule not found: ${ruleId}`, "RULE_NOT_FOUND")
    this.name = "AlertRuleNotFoundError"
  }
}

export class AlertNotFoundError extends AlertError {
  constructor(alertId: string) {
    super(`Alert not found: ${alertId}`, "ALERT_NOT_FOUND")
    this.name = "AlertNotFoundError"
  }
}

// Webhook System Types for NezhaDash Pro

export type WebhookEventType =
  | 'server.online'
  | 'server.offline'
  | 'alert.triggered'
  | 'alert.resolved'
  | 'deploy.completed';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
  createdBy: string;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  payload: Record<string, unknown>;
  createdAt: string;
  webhookId: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: WebhookDeliveryStatus;
  statusCode?: number;
  responseBody?: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  responseHeaders?: Record<string, string>;
  duration?: number;
  attempt: number;
  maxAttempts: number;
  nextRetryAt?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface WebhookCreateInput {
  name: string;
  url: string;
  events: WebhookEventType[];
  active?: boolean;
  headers?: Record<string, string>;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  events?: WebhookEventType[];
  active?: boolean;
  headers?: Record<string, string>;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  duration?: number;
  error?: string;
}

// Event payload type maps for type-safe event handling
export interface ServerOnlinePayload {
  serverId: number;
  serverName: string;
  host: string;
  timestamp: string;
  uptime: number;
}

export interface ServerOfflinePayload {
  serverId: number;
  serverName: string;
  host: string;
  timestamp: string;
  lastSeen: string;
}

export interface AlertTriggeredPayload {
  alertId: number;
  alertName: string;
  serverId: number;
  serverName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface AlertResolvedPayload {
  alertId: number;
  alertName: string;
  serverId: number;
  serverName: string;
  resolvedAt: string;
  duration: number;
}

export interface DeployCompletedPayload {
  deployId: string;
  serverId: number;
  serverName: string;
  status: 'success' | 'failed';
  version?: string;
  duration: number;
  logs?: string;
  timestamp: string;
}

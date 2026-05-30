// SDK Type Definitions for NezhaDash Pro API

// ===== Server Types =====

export interface Server {
  id: number;
  name: string;
  host: string;
  ip: string;
  location: string;
  country_code: string;
  os: string;
  arch: string;
  virtualization: string;
  status: 'online' | 'offline';
  uptime: number;
  load1: number;
  load5: number;
  load15: number;
  cpu_percent: number;
  memory_total: number;
  memory_used: number;
  memory_percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
  disk_total: number;
  disk_used: number;
  disk_percent: number;
  network_up: number;
  network_down: number;
  network_total_up: number;
  network_total_down: number;
  process_count: number;
  tcp_connection_count: number;
  udp_connection_count: number;
  created_at: string;
  updated_at: string;
  display_name?: string;
  hide_for_guest: boolean;
  note?: string;
  tags: string[];
}

export interface ServerListResponse {
  servers: Server[];
  total: number;
  page: number;
  page_size: number;
}

export interface ServerDetailResponse {
  server: Server;
}

// ===== Alert Types =====

export interface AlertRule {
  id: number;
  name: string;
  server_id?: number;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'load' | 'offline' | 'transfer';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;
  duration: number;
  notify_channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  rule_id: number;
  rule_name: string;
  server_id: number;
  server_name: string;
  type: string;
  message: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved';
  triggered_at: string;
  resolved_at?: string;
  notifications_sent: boolean;
}

export interface AlertListResponse {
  alerts: Alert[];
  total: number;
  page: number;
  page_size: number;
}

// ===== Notification Types =====

export interface NotificationChannel {
  id: number;
  name: string;
  type: 'telegram' | 'discord' | 'slack' | 'email' | 'webhook' | 'wechat' | 'dingtalk';
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: number;
  channel_id: number;
  channel_name: string;
  alert_id: number;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sent_at: string;
}

export interface NotificationListResponse {
  channels: NotificationChannel[];
  total: number;
}

// ===== Billing Types =====

export interface BillingPlan {
  id: number;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  limits: {
    servers: number;
    alerts: number;
    api_calls: number;
    webhooks: number;
    storage_gb: number;
  };
  created_at: string;
}

export interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  usage: {
    servers: number;
    alerts: number;
    api_calls: number;
    webhooks: number;
    storage_gb: number;
  };
  created_at: string;
}

export interface Invoice {
  id: number;
  subscription_id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  period_start: string;
  period_end: string;
  paid_at?: string;
  created_at: string;
}

export interface BillingListResponse {
  plans?: BillingPlan[];
  subscription?: Subscription;
  invoices?: Invoice[];
  total?: number;
}

// ===== Deploy Types =====

export interface Deploy {
  id: string;
  server_id: number;
  server_name: string;
  version?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  progress: number;
  logs: string[];
  started_at: string;
  completed_at?: string;
  duration?: number;
  triggered_by: string;
  config: Record<string, unknown>;
}

export interface DeployCreateInput {
  server_id: number;
  version?: string;
  config?: Record<string, unknown>;
}

export interface DeployListResponse {
  deploys: Deploy[];
  total: number;
  page: number;
  page_size: number;
}

// ===== Webhook Types =====

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
  last_triggered_at?: string;
  failure_count: number;
}

export interface WebhookCreateInput {
  name: string;
  url: string;
  events: string[];
  active?: boolean;
  headers?: Record<string, string>;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  events?: string[];
  active?: boolean;
  headers?: Record<string, string>;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  status_code?: number;
  response_body?: string;
  duration?: number;
  attempt: number;
  error?: string;
  created_at: string;
}

export interface WebhookTestResult {
  success: boolean;
  status_code?: number;
  duration?: number;
  error?: string;
}

// ===== Common Types =====

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

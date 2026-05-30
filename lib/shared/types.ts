// Shared type definitions — single source of truth
// All modules should import from here instead of defining their own

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';

export type NotificationChannelType = 'telegram' | 'discord' | 'webhook' | 'email' | 'slack';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
}

export interface NotificationChannel {
  id: string;
  type: NotificationChannelType;
  name: string;
  enabled: boolean;
  config: TelegramConfig | DiscordConfig | WebhookConfig;
  createdAt: number;
  updatedAt: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  duration: number;
  cooldown: number;
  severity: AlertSeverity;
  enabled: boolean;
  channels: string[];
  serverIds?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface NotificationMessage {
  title: string;
  body: string;
  severity: AlertSeverity;
  serverId?: number;
  serverName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  serverId: number;
  serverName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  aiDiagnosis?: string;
  triggeredAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  notificationsSent: boolean;
}

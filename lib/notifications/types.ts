/**
 * Notification system types for NezhaDash Pro
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ChannelType = 'telegram' | 'discord' | 'webhook';

export interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  config: TelegramConfig | DiscordConfig | WebhookConfig;
  createdAt: number;
  updatedAt: number;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
}

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  serverId?: string;
  serverName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  source: string;
}

export interface Notifier {
  readonly type: ChannelType;
  send(channel: NotificationChannel, message: NotificationMessage): Promise<boolean>;
  test(channel: NotificationChannel): Promise<boolean>;
}

export interface NotificationLog {
  id: string;
  channelId: string;
  messageId: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sentAt: number;
}

export interface AlertRule {
  id: string;
  name: string;
  serverId?: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: AlertSeverity;
  cooldownMs: number;
  channelIds: string[];
  enabled: boolean;
  lastTriggered?: number;
}

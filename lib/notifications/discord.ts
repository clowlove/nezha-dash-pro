/**
 * Discord notification channel using Webhook API
 */

import { Notifier, NotificationChannel, NotificationMessage, DiscordConfig } from './types';

export class DiscordNotifier implements Notifier {
  readonly type = 'discord' as const;

  async send(channel: NotificationChannel, message: NotificationMessage): Promise<boolean> {
    const config = channel.config as DiscordConfig;
    const embed = this.buildEmbed(message);
    return this.sendWebhook(config, [embed]);
  }

  async test(channel: NotificationChannel): Promise<boolean> {
    const config = channel.config as DiscordConfig;
    const embed = {
      title: '🔔 NezhaDash Pro Test',
      description: 'Notification channel is configured correctly!',
      color: 0x22c55e,
      timestamp: new Date().toISOString(),
    };
    return this.sendWebhook(config, [embed]);
  }

  private async sendWebhook(config: DiscordConfig, embeds: Record<string, unknown>[]): Promise<boolean> {
    const body: Record<string, unknown> = { embeds };
    if (config.username) body.username = config.username;
    if (config.avatarUrl) body.avatar_url = config.avatarUrl;

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Discord webhook error ${response.status}: ${errorBody}`);
    }

    return true;
  }

  private buildEmbed(msg: NotificationMessage): Record<string, unknown> {
    const colorMap = {
      info: 0x3b82f6,
      warning: 0xf59e0b,
      critical: 0xef4444,
    };

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    const emoji = severityEmoji[msg.severity] || '📢';
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (msg.serverName) {
      fields.push({ name: 'Server', value: msg.serverName, inline: true });
    }
    if (msg.metric) {
      fields.push({ name: 'Metric', value: msg.metric, inline: true });
    }
    if (msg.value !== undefined) {
      fields.push({ name: 'Value', value: String(msg.value), inline: true });
    }
    if (msg.threshold !== undefined) {
      fields.push({ name: 'Threshold', value: String(msg.threshold), inline: true });
    }

    return {
      title: `${emoji} ${msg.title}`,
      description: msg.body,
      color: colorMap[msg.severity] || 0x6b7280,
      fields,
      footer: { text: `Source: ${msg.source}` },
      timestamp: new Date(msg.timestamp).toISOString(),
    };
  }
}

/**
 * Telegram notification channel using Bot API
 */

import { Notifier, NotificationChannel, NotificationMessage, TelegramConfig } from './types';

export class TelegramNotifier implements Notifier {
  readonly type = 'telegram' as const;

  async send(channel: NotificationChannel, message: NotificationMessage): Promise<boolean> {
    const config = channel.config as TelegramConfig;
    const text = this.formatMessage(message);
    return this.sendMessage(config, text);
  }

  async test(channel: NotificationChannel): Promise<boolean> {
    const config = channel.config as TelegramConfig;
    const text = '🔔 <b>NezhaDash Pro Test</b>\n\nNotification channel is configured correctly!';
    return this.sendMessage(config, text);
  }

  private async sendMessage(config: TelegramConfig, text: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const body: Record<string, unknown> = {
      chat_id: config.chatId,
      text,
      parse_mode: config.parseMode || 'HTML',
      disable_web_page_preview: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Telegram API error ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      return result.ok === true;
    } finally {
      clearTimeout(timeout);
    }
  }

  private formatMessage(msg: NotificationMessage): string {
    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    const emoji = severityEmoji[msg.severity] || '📢';
    const lines: string[] = [];

    lines.push(`${emoji} <b>${this.escapeHtml(msg.title)}</b>`);
    lines.push('');
    lines.push(this.escapeHtml(msg.body));

    if (msg.serverName) {
      lines.push(`\n🖥 <b>Server:</b> ${this.escapeHtml(msg.serverName)}`);
    }
    if (msg.metric && msg.value !== undefined) {
      lines.push(`📊 <b>${this.escapeHtml(msg.metric)}:</b> ${msg.value}`);
    }
    if (msg.threshold !== undefined) {
      lines.push(`🎯 <b>Threshold:</b> ${msg.threshold}`);
    }

    lines.push(`\n🕐 <i>${new Date(msg.timestamp).toISOString()}</i>`);

    return lines.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

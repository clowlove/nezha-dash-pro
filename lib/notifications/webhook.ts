/**
 * Generic webhook notification channel for custom HTTP endpoints
 */

import { createHmac } from 'crypto';
import { Notifier, NotificationChannel, NotificationMessage, WebhookConfig } from './types';

export class WebhookNotifier implements Notifier {
  readonly type = 'webhook' as const;

  async send(channel: NotificationChannel, message: NotificationMessage): Promise<boolean> {
    const config = channel.config as WebhookConfig;
    const payload = this.buildPayload(message);
    return this.sendRequest(config, payload);
  }

  async test(channel: NotificationChannel): Promise<boolean> {
    const config = channel.config as WebhookConfig;
    const payload = {
      event: 'test',
      message: 'NezhaDash Pro webhook test',
      timestamp: Date.now(),
    };
    return this.sendRequest(config, payload);
  }

  private async sendRequest(config: WebhookConfig, payload: Record<string, unknown>): Promise<boolean> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NezhaDash-Pro/1.0',
      ...(config.headers || {}),
    };

    if (config.secret) {
      const signature = createHmac('sha256', config.secret).update(body).digest('hex');
      headers['X-Signature-256'] = `sha256=${signature}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Webhook error ${response.status}: ${errorBody}`);
      }

      return true;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPayload(msg: NotificationMessage): Record<string, unknown> {
    return {
      event: 'alert',
      alert: {
        id: msg.id,
        title: msg.title,
        body: msg.body,
        severity: msg.severity,
        server: msg.serverId ? { id: msg.serverId, name: msg.serverName } : null,
        metric: msg.metric || null,
        value: msg.value ?? null,
        threshold: msg.threshold ?? null,
        source: msg.source,
        timestamp: msg.timestamp,
        timestampISO: new Date(msg.timestamp).toISOString(),
      },
    };
  }
}

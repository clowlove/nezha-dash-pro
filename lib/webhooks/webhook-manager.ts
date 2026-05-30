import { createHmac, randomBytes } from 'crypto';
import type {
  Webhook,
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookEvent,
  WebhookEventType,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookTestResult,
} from './types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff in ms
const TIMEOUT_MS = 10000;

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function generateSecret(): string {
  return `whsec_${randomBytes(32).toString('hex')}`;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function buildSignatureHeader(payload: string, secret: string, timestamp: string): string {
  const signature = signPayload(`${timestamp}.${payload}`, secret);
  return `t=${timestamp},v1=${signature}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory store (replace with database in production)
const webhooks = new Map<string, Webhook>();
const deliveries = new Map<string, WebhookDelivery>();

export class WebhookManager {
  // ===== CRUD Operations =====

  async create(input: WebhookCreateInput, userId: string): Promise<Webhook> {
    const now = new Date().toISOString();
    const webhook: Webhook = {
      id: generateId(),
      name: input.name,
      url: input.url,
      secret: generateSecret(),
      events: input.events,
      active: input.active ?? true,
      headers: input.headers,
      createdAt: now,
      updatedAt: now,
      failureCount: 0,
      createdBy: userId,
    };

    webhooks.set(webhook.id, webhook);
    return webhook;
  }

  async list(filters?: { active?: boolean; event?: WebhookEventType }): Promise<Webhook[]> {
    let results = Array.from(webhooks.values());

    if (filters?.active !== undefined) {
      results = results.filter((w) => w.active === filters.active);
    }
    if (filters?.event) {
      results = results.filter((w) => w.events.includes(filters.event));
    }

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Webhook | null> {
    return webhooks.get(id) ?? null;
  }

  async update(id: string, input: WebhookUpdateInput): Promise<Webhook | null> {
    const webhook = webhooks.get(id);
    if (!webhook) return null;

    const updated: Webhook = {
      ...webhook,
      name: input.name ?? webhook.name,
      url: input.url ?? webhook.url,
      events: input.events ?? webhook.events,
      active: input.active ?? webhook.active,
      headers: input.headers ?? webhook.headers,
      updatedAt: new Date().toISOString(),
    };

    webhooks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (!webhooks.has(id)) return false;
    webhooks.delete(id);

    // Clean up associated deliveries
    for (const [key, delivery] of deliveries) {
      if (delivery.webhookId === id) {
        deliveries.delete(key);
      }
    }
    return true;
  }

  async regenerateSecret(id: string): Promise<string | null> {
    const webhook = webhooks.get(id);
    if (!webhook) return null;

    const newSecret = generateSecret();
    webhook.secret = newSecret;
    webhook.updatedAt = new Date().toISOString();
    webhooks.set(id, webhook);
    return newSecret;
  }

  // ===== Event Dispatch =====

  async dispatch(eventType: WebhookEventType, payload: Record<string, unknown>): Promise<void> {
    const targetWebhooks = Array.from(webhooks.values()).filter(
      (w) => w.active && w.events.includes(eventType)
    );

    const event: WebhookEvent = {
      id: generateId(),
      type: eventType,
      payload,
      createdAt: new Date().toISOString(),
      webhookId: '', // Will be set per delivery
    };

    const deliveryPromises = targetWebhooks.map((webhook) =>
      this.deliverWithRetry(webhook, { ...event, webhookId: webhook.id })
    );

    await Promise.allSettled(deliveryPromises);
  }

  async deliverWithRetry(webhook: Webhook, event: WebhookEvent): Promise<WebhookDelivery> {
    let lastDelivery: WebhookDelivery | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      if (attempt > 1 && RETRY_DELAYS[attempt - 2]) {
        await sleep(RETRY_DELAYS[attempt - 2]);
      }

      lastDelivery = await this.deliver(webhook, event, attempt);

      if (lastDelivery.status === 'success') {
        webhook.lastTriggeredAt = new Date().toISOString();
        webhook.failureCount = 0;
        webhooks.set(webhook.id, webhook);
        return lastDelivery;
      }
    }

    // All attempts failed
    if (lastDelivery) {
      webhook.failureCount += 1;
      webhooks.set(webhook.id, webhook);
    }

    return lastDelivery!;
  }

  async deliver(webhook: Webhook, event: WebhookEvent, attempt: number): Promise<WebhookDelivery> {
    const deliveryId = generateId();
    const payload = JSON.stringify(event.payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignatureHeader(payload, webhook.secret, timestamp);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NezhaDash-Webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Event-ID': event.id,
      'X-Event-Type': event.type,
      'X-Timestamp': timestamp,
      'X-Signature-256': signature,
      ...webhook.headers,
    };

    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId: webhook.id,
      eventId: event.id,
      status: 'pending',
      requestHeaders,
      requestBody: payload,
      attempt,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      createdAt: new Date().toISOString(),
    };

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: requestHeaders,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      delivery.statusCode = response.status;
      delivery.responseBody = responseBody.slice(0, 4096); // Limit response size
      delivery.duration = duration;
      delivery.completedAt = new Date().toISOString();

      // Collect response headers
      delivery.responseHeaders = {};
      response.headers.forEach((value, key) => {
        delivery.responseHeaders![key] = value;
      });

      if (response.ok) {
        delivery.status = 'success';
      } else {
        delivery.status = attempt < MAX_RETRY_ATTEMPTS ? 'retrying' : 'failed';
        delivery.error = `HTTP ${response.status}: ${responseBody.slice(0, 256)}`;
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      delivery.duration = duration;
      delivery.completedAt = new Date().toISOString();
      delivery.status = attempt < MAX_RETRY_ATTEMPTS ? 'retrying' : 'failed';
      delivery.error = err instanceof Error ? err.message : 'Unknown error';
    }

    deliveries.set(deliveryId, delivery);
    return delivery;
  }

  // ===== Testing =====

  async test(webhookId: string): Promise<WebhookTestResult> {
    const webhook = webhooks.get(webhookId);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload = {
      event: 'webhook.test',
      message: 'This is a test webhook delivery from NezhaDash Pro',
      timestamp: new Date().toISOString(),
    };

    const payload = JSON.stringify(testPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignatureHeader(payload, webhook.secret, timestamp);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NezhaDash-Webhook/1.0',
          'X-Webhook-ID': webhook.id,
          'X-Event-Type': 'webhook.test',
          'X-Timestamp': timestamp,
          'X-Signature-256': signature,
          ...webhook.headers,
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        success: response.ok,
        statusCode: response.status,
        duration: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ===== Delivery History =====

  async getDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
    return Array.from(deliveries.values())
      .filter((d) => d.webhookId === webhookId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return deliveries.get(deliveryId) ?? null;
  }

  // ===== Signature Verification (for consumers) =====

  static verifySignature(
    payload: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const signature = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !signature) return false;

    const expected = signPayload(`${timestamp}.${payload}`, secret);
    return signature === expected;
  }
}

// Singleton instance
export const webhookManager = new WebhookManager();

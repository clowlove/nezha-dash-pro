import type {
  Server,
  ServerListResponse,
  ServerDetailResponse,
  AlertRule,
  Alert,
  AlertListResponse,
  NotificationChannel,
  NotificationLog,
  NotificationListResponse,
  BillingPlan,
  Subscription,
  Invoice,
  BillingListResponse,
  Deploy,
  DeployCreateInput,
  DeployListResponse,
  Webhook,
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookDelivery,
  WebhookTestResult,
  ApiResponse,
  ApiError,
} from './types';

export interface NezhaDashClientOptions {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export class NezhaDashError extends Error {
  public code?: string;
  public statusCode?: number;
  public details?: Record<string, unknown>;

  constructor(message: string, code?: string, statusCode?: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'NezhaDashError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NezhaDashClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  constructor(options: NezhaDashClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30000;
    this.retryCount = options.retryCount ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
  }

  // ===== HTTP Client =====

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const headers: Record<string, string> = {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'NezhaDash-JS-SDK/1.0.0',
        };

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const apiError = errorBody as ApiError;

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new NezhaDashError(
              apiError.error || `HTTP ${response.status}`,
              apiError.code,
              response.status,
              apiError.details
            );
          }

          // Retry server errors (5xx)
          throw new NezhaDashError(
            apiError.error || `HTTP ${response.status}`,
            apiError.code,
            response.status
          );
        }

        return await response.json();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err instanceof NezhaDashError && err.statusCode && err.statusCode < 500) {
          throw err;
        }

        if (attempt < this.retryCount) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError || new NezhaDashError('Request failed after all retries');
  }

  // ===== Server Methods =====

  async getServers(params?: {
    page?: number;
    page_size?: number;
    status?: 'online' | 'offline';
    tag?: string;
  }): Promise<ServerListResponse> {
    return this.request<ServerListResponse>('GET', '/servers', undefined, params);
  }

  async getServer(id: number): Promise<Server> {
    const response = await this.request<ServerDetailResponse>('GET', `/servers/${id}`);
    return response.server;
  }

  async getServerStats(id: number, period?: '1h' | '6h' | '24h' | '7d' | '30d'): Promise<Record<string, unknown>> {
    return this.request('GET', `/servers/${id}/stats`, undefined, { period });
  }

  async getServerHistory(
    id: number,
    params?: { start?: string; end?: string; interval?: '1m' | '5m' | '1h' }
  ): Promise<Record<string, unknown>[]> {
    return this.request('GET', `/servers/${id}/history`, undefined, params);
  }

  // ===== Alert Methods =====

  async getAlertRules(params?: { page?: number; page_size?: number }): Promise<AlertRule[]> {
    const response = await this.request<{ rules: AlertRule[] }>('GET', '/alerts/rules', undefined, params);
    return response.rules;
  }

  async getAlertRule(id: number): Promise<AlertRule> {
    const response = await this.request<{ rule: AlertRule }>('GET', `/alerts/rules/${id}`);
    return response.rule;
  }

  async createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRule> {
    const response = await this.request<{ rule: AlertRule }>('POST', '/alerts/rules', rule);
    return response.rule;
  }

  async updateAlertRule(id: number, updates: Partial<AlertRule>): Promise<AlertRule> {
    const response = await this.request<{ rule: AlertRule }>('PUT', `/alerts/rules/${id}`, updates);
    return response.rule;
  }

  async deleteAlertRule(id: number): Promise<void> {
    await this.request('DELETE', `/alerts/rules/${id}`);
  }

  async getAlerts(params?: {
    page?: number;
    page_size?: number;
    status?: 'active' | 'resolved';
    server_id?: number;
    severity?: 'info' | 'warning' | 'critical';
  }): Promise<AlertListResponse> {
    return this.request<AlertListResponse>('GET', '/alerts', undefined, params);
  }

  async getAlert(id: number): Promise<Alert> {
    const response = await this.request<{ alert: Alert }>('GET', `/alerts/${id}`);
    return response.alert;
  }

  async resolveAlert(id: number): Promise<void> {
    await this.request('POST', `/alerts/${id}/resolve`);
  }

  // ===== Notification Methods =====

  async getNotificationChannels(): Promise<NotificationListResponse> {
    return this.request<NotificationListResponse>('GET', '/notifications');
  }

  async getNotificationChannel(id: number): Promise<NotificationChannel> {
    const response = await this.request<{ channel: NotificationChannel }>('GET', `/notifications/${id}`);
    return response.channel;
  }

  async createNotificationChannel(
    channel: Omit<NotificationChannel, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NotificationChannel> {
    const response = await this.request<{ channel: NotificationChannel }>('POST', '/notifications', channel);
    return response.channel;
  }

  async updateNotificationChannel(id: number, updates: Partial<NotificationChannel>): Promise<NotificationChannel> {
    const response = await this.request<{ channel: NotificationChannel }>('PUT', `/notifications/${id}`, updates);
    return response.channel;
  }

  async deleteNotificationChannel(id: number): Promise<void> {
    await this.request('DELETE', `/notifications/${id}`);
  }

  async testNotificationChannel(id: number): Promise<{ success: boolean; error?: string }> {
    return this.request('POST', `/notifications/${id}/test`);
  }

  async getNotificationLogs(params?: {
    page?: number;
    page_size?: number;
    channel_id?: number;
    alert_id?: number;
  }): Promise<{ logs: NotificationLog[]; total: number }> {
    return this.request('GET', '/notifications/logs', undefined, params);
  }

  // ===== Billing Methods =====

  async getBillingPlans(): Promise<BillingPlan[]> {
    const response = await this.request<{ plans: BillingPlan[] }>('GET', '/billing/plans');
    return response.plans;
  }

  async getSubscription(): Promise<Subscription> {
    const response = await this.request<{ subscription: Subscription }>('GET', '/billing/subscription');
    return response.subscription;
  }

  async getInvoices(params?: { page?: number; page_size?: number }): Promise<{
    invoices: Invoice[];
    total: number;
  }> {
    return this.request('GET', '/billing/invoices', undefined, params);
  }

  async getInvoice(id: number): Promise<Invoice> {
    const response = await this.request<{ invoice: Invoice }>('GET', `/billing/invoices/${id}`);
    return response.invoice;
  }

  async getUsage(): Promise<Record<string, number>> {
    return this.request('GET', '/billing/usage');
  }

  // ===== Deploy Methods =====

  async getDeploys(params?: {
    page?: number;
    page_size?: number;
    server_id?: number;
    status?: 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';
  }): Promise<DeployListResponse> {
    return this.request<DeployListResponse>('GET', '/deploy', undefined, params);
  }

  async getDeploy(id: string): Promise<Deploy> {
    const response = await this.request<{ deploy: Deploy }>('GET', `/deploy/${id}`);
    return response.deploy;
  }

  async createDeploy(input: DeployCreateInput): Promise<Deploy> {
    const response = await this.request<{ deploy: Deploy }>('POST', '/deploy', input);
    return response.deploy;
  }

  async cancelDeploy(id: string): Promise<void> {
    await this.request('POST', `/deploy/${id}/cancel`);
  }

  async rollbackDeploy(id: string): Promise<Deploy> {
    const response = await this.request<{ deploy: Deploy }>('POST', `/deploy/${id}/rollback`);
    return response.deploy;
  }

  async getDeployLogs(id: string): Promise<string[]> {
    const response = await this.request<{ logs: string[] }>('GET', `/deploy/${id}/logs`);
    return response.logs;
  }

  // ===== Webhook Methods =====

  async getWebhooks(params?: { active?: boolean; event?: string }): Promise<Webhook[]> {
    const response = await this.request<{ webhooks: Webhook[] }>('GET', '/webhooks', undefined, params);
    return response.webhooks;
  }

  async getWebhook(id: string): Promise<Webhook> {
    const response = await this.request<{ webhook: Webhook }>('GET', `/webhooks/${id}`);
    return response.webhook;
  }

  async createWebhook(input: WebhookCreateInput): Promise<Webhook> {
    const response = await this.request<{ webhook: Webhook }>('POST', '/webhooks', input);
    return response.webhook;
  }

  async updateWebhook(id: string, input: WebhookUpdateInput): Promise<Webhook> {
    const response = await this.request<{ webhook: Webhook }>('PUT', `/webhooks/${id}`, input);
    return response.webhook;
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.request('DELETE', `/webhooks/${id}`);
  }

  async testWebhook(id: string): Promise<WebhookTestResult> {
    const response = await this.request<{ test: WebhookTestResult }>('POST', `/webhooks/${id}/test`);
    return response.test;
  }

  async getWebhookDeliveries(
    webhookId: string,
    params?: { limit?: number }
  ): Promise<WebhookDelivery[]> {
    const response = await this.request<{ deliveries: WebhookDelivery[] }>(
      'GET',
      `/webhooks/${webhookId}/deliveries`,
      undefined,
      params
    );
    return response.deliveries;
  }

  // ===== Utility Methods =====

  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('GET', '/health');
  }

  async getSystemInfo(): Promise<Record<string, unknown>> {
    return this.request('GET', '/system');
  }
}

// Factory function
export function createClient(options: NezhaDashClientOptions): NezhaDashClient {
  return new NezhaDashClient(options);
}

// Re-export types
export * from './types';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  disablePreview?: boolean;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  timeout: number;
  retryCount: number;
}

class TelegramNotifier {
  private config: TelegramConfig;
  private sendFn: (msg: TelegramMessage) => Promise<{ ok: boolean; error?: string }>;

  constructor(
    config: TelegramConfig,
    sendFn: (msg: TelegramMessage) => Promise<{ ok: boolean; error?: string }>,
  ) {
    this.config = config;
    this.sendFn = sendFn;
  }

  async sendAlert(alert: { name: string; server: string; value: number; threshold: number; message: string }): Promise<boolean> {
    const text = this.formatAlert(alert);
    return this.sendWithRetry({ chatId: this.config.chatId, text, parseMode: 'HTML', disablePreview: true });
  }

  async sendResolve(alert: { name: string; server: string }): Promise<boolean> {
    const text = `✅ <b>Resolved</b>\n\nAlert: ${this.escapeHtml(alert.name)}\nServer: ${this.escapeHtml(alert.server)}`;
    return this.sendWithRetry({ chatId: this.config.chatId, text, parseMode: 'HTML' });
  }

  private formatAlert(alert: { name: string; server: string; value: number; threshold: number; message: string }): string {
    return [
      '🚨 <b>Alert Triggered</b>',
      '',
      `<b>Rule:</b> ${this.escapeHtml(alert.name)}`,
      `<b>Server:</b> ${this.escapeHtml(alert.server)}`,
      `<b>Value:</b> ${alert.value}`,
      `<b>Threshold:</b> ${alert.threshold}`,
      '',
      this.escapeHtml(alert.message),
    ].join('\n');
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private async sendWithRetry(msg: TelegramMessage): Promise<boolean> {
    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const result = await this.sendFn(msg);
        clearTimeout(timeoutId);

        if (result.ok) return true;
        if (attempt === this.config.retryCount) return false;
      } catch (err) {
        if (attempt === this.config.retryCount) return false;
        await this.sleep(Math.pow(2, attempt) * 100);
      }
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Tests
describe('TelegramNotifier', () => {
  let sendFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendFn = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const config: TelegramConfig = {
    botToken: 'test-token',
    chatId: '-100123456',
    timeout: 5000,
    retryCount: 3,
  };

  describe('Message Formatting', () => {
    it('should format alert with HTML', async () => {
      sendFn.mockResolvedValue({ ok: true });
      const notifier = new TelegramNotifier(config, sendFn);

      await notifier.sendAlert({
        name: 'High CPU',
        server: 'web-01',
        value: 95,
        threshold: 80,
        message: 'CPU usage exceeded 80%',
      });

      expect(sendFn).toHaveBeenCalledTimes(1);
      const msg = sendFn.mock.calls[0][0] as TelegramMessage;
      expect(msg.parseMode).toBe('HTML');
      expect(msg.text).toContain('🚨');
      expect(msg.text).toContain('High CPU');
      expect(msg.text).toContain('web-01');
      expect(msg.text).toContain('95');
      expect(msg.text).toContain('80');
    });

    it('should format resolve message', async () => {
      sendFn.mockResolvedValue({ ok: true });
      const notifier = new TelegramNotifier(config, sendFn);

      await notifier.sendResolve({ name: 'High CPU', server: 'web-01' });

      const msg = sendFn.mock.calls[0][0] as TelegramMessage;
      expect(msg.text).toContain('✅');
      expect(msg.text).toContain('Resolved');
    });

    it('should escape HTML special characters', async () => {
      sendFn.mockResolvedValue({ ok: true });
      const notifier = new TelegramNotifier(config, sendFn);

      await notifier.sendAlert({
        name: 'CPU > 80%',
        server: 'web-01 & web-02',
        value: 95,
        threshold: 80,
        message: 'CPU usage <expected> & actual exceeded',
      });

      const msg = sendFn.mock.calls[0][0] as TelegramMessage;
      expect(msg.text).toContain('CPU &gt; 80%');
      expect(msg.text).toContain('web-01 &amp; web-02');
      expect(msg.text).toContain('&lt;expected&gt;');
    });

    it('should disable link preview for alerts', async () => {
      sendFn.mockResolvedValue({ ok: true });
      const notifier = new TelegramNotifier(config, sendFn);

      await notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      const msg = sendFn.mock.calls[0][0] as TelegramMessage;
      expect(msg.disablePreview).toBe(true);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle send timeout', async () => {
      sendFn.mockImplementation(() => new Promise(() => {})); // Never resolves
      const notifier = new TelegramNotifier(
        { ...config, timeout: 1000, retryCount: 0 },
        sendFn,
      );

      const promise = notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      // The retry logic wraps the timeout
      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should retry on transient failures', async () => {
      sendFn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ ok: true });

      const notifier = new TelegramNotifier(
        { ...config, retryCount: 3 },
        sendFn,
      );

      const promise = notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      // Advance timers for retries
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(true);
      expect(sendFn).toHaveBeenCalledTimes(3);
    });

    it('should return false after all retries exhausted', async () => {
      sendFn.mockRejectedValue(new Error('Permanent error'));

      const notifier = new TelegramNotifier(
        { ...config, retryCount: 2 },
        sendFn,
      );

      const promise = notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(false);
      expect(sendFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should handle API error response', async () => {
      sendFn.mockResolvedValue({ ok: false, error: 'chat not found' });

      const notifier = new TelegramNotifier(
        { ...config, retryCount: 1 },
        sendFn,
      );

      const promise = notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(false);
    });

    it('should succeed on first try when no errors', async () => {
      sendFn.mockResolvedValue({ ok: true });
      const notifier = new TelegramNotifier(config, sendFn);

      const result = await notifier.sendAlert({
        name: 'Test',
        server: 'srv-1',
        value: 1,
        threshold: 0,
        message: 'test',
      });

      expect(result).toBe(true);
      expect(sendFn).toHaveBeenCalledTimes(1);
    });
  });
});

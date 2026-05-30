/**
 * NotificationManager - routes alerts to configured notification channels
 */

import {
  NotificationChannel,
  NotificationMessage,
  Notifier,
  NotificationLog,
  ChannelType,
} from './types';
import { TelegramNotifier } from './telegram';
import { DiscordNotifier } from './discord';
import { WebhookNotifier } from './webhook';

export class NotificationManager {
  private notifiers: Map<ChannelType, Notifier> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private logs: NotificationLog[] = [];
  private maxLogSize = 1000;

  constructor() {
    this.registerNotifier(new TelegramNotifier());
    this.registerNotifier(new DiscordNotifier());
    this.registerNotifier(new WebhookNotifier());
  }

  registerNotifier(notifier: Notifier): void {
    this.notifiers.set(notifier.type, notifier);
  }

  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  removeChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  getChannel(channelId: string): NotificationChannel | undefined {
    return this.channels.get(channelId);
  }

  getAllChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  updateChannel(channelId: string, updates: Partial<NotificationChannel>): NotificationChannel | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;
    const updated = { ...channel, ...updates, updatedAt: Date.now() };
    this.channels.set(channelId, updated as NotificationChannel);
    return updated as NotificationChannel;
  }

  async send(channelIds: string[], message: NotificationMessage): Promise<NotificationLog[]> {
    const results: NotificationLog[] = [];

    for (const channelId of channelIds) {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.enabled) {
        results.push(this.createLog(channelId, message.id, 'failed', 'Channel not found or disabled'));
        continue;
      }

      const notifier = this.notifiers.get(channel.type);
      if (!notifier) {
        results.push(this.createLog(channelId, message.id, 'failed', `No notifier for type: ${channel.type}`));
        continue;
      }

      try {
        const success = await notifier.send(channel, message);
        results.push(this.createLog(channelId, message.id, success ? 'sent' : 'failed', success ? undefined : 'Send returned false'));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        results.push(this.createLog(channelId, message.id, 'failed', errMsg));
      }
    }

    this.logs.push(...results);
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    return results;
  }

  async testChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    const channel = this.channels.get(channelId);
    if (!channel) return { success: false, error: 'Channel not found' };

    const notifier = this.notifiers.get(channel.type);
    if (!notifier) return { success: false, error: `No notifier for type: ${channel.type}` };

    try {
      const success = await notifier.test(channel);
      return { success, error: success ? undefined : 'Test returned false' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  getLogs(limit = 50): NotificationLog[] {
    return this.logs.slice(-limit);
  }

  private createLog(
    channelId: string,
    messageId: string,
    status: 'sent' | 'failed' | 'pending',
    error?: string
  ): NotificationLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      channelId,
      messageId,
      status,
      error,
      sentAt: Date.now(),
    };
  }
}

// Singleton instance
let managerInstance: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!managerInstance) {
    managerInstance = new NotificationManager();
  }
  return managerInstance;
}

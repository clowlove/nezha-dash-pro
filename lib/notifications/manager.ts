/**
 * NotificationManager - routes alerts to configured notification channels
 *
 * Persistence: channels are backed by SQLite; delivery logs are written
 * through to SQLite and loaded on startup (most recent first).
 */

import { randomUUID } from 'crypto';
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
import { getDb, runMigrations } from '../shared/database';

export class NotificationManager {
  private notifiers: Map<ChannelType, Notifier> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private logs: NotificationLog[] = [];
  private maxLogSize = 1000;
  private _dbInitialised = false;

  constructor() {
    this.registerNotifier(new TelegramNotifier());
    this.registerNotifier(new DiscordNotifier());
    this.registerNotifier(new WebhookNotifier());
  }

  // ── Database initialisation ──────────────────────────────────────────

  initDatabase(): void {
    if (this._dbInitialised) return;
    runMigrations();
    this.loadFromDb();
    this._dbInitialised = true;
  }

  private loadFromDb(): void {
    const db = getDb();

    // Load channels
    const channelRows = db.prepare('SELECT * FROM notification_channels').all() as Array<Record<string, unknown>>;
    for (const row of channelRows) {
      const ch: NotificationChannel = {
        id: row.id as string,
        name: row.name as string,
        type: row.type as ChannelType,
        enabled: Boolean(row.enabled),
        config: JSON.parse(row.config as string),
        createdAt: row.created_at as number,
        updatedAt: row.updated_at as number,
      };
      this.channels.set(ch.id, ch);
    }

    // Load recent logs
    const logRows = db.prepare(
      'SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT ?'
    ).all(this.maxLogSize) as Array<Record<string, unknown>>;

    this.logs = logRows.reverse().map((row) => ({
      id: row.id as string,
      channelId: row.channel_id as string,
      messageId: row.message_id as string,
      status: row.status as NotificationLog['status'],
      error: row.error as string | undefined,
      sentAt: row.sent_at as number,
    }));
  }

  // ── Persistence helpers ──────────────────────────────────────────────

  private persistChannel(channel: NotificationChannel): void {
    try {
      const db = getDb();
      db.prepare(
        `INSERT OR REPLACE INTO notification_channels
         (id, name, type, enabled, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        channel.id, channel.name, channel.type,
        channel.enabled ? 1 : 0, JSON.stringify(channel.config),
        channel.createdAt, channel.updatedAt,
      );
    } catch (err) {
      console.error('[notification-manager] Failed to persist channel:', err);
    }
  }

  private deleteChannelFromDb(id: string): void {
    try {
      getDb().prepare('DELETE FROM notification_channels WHERE id = ?').run(id);
    } catch (err) {
      console.error('[notification-manager] Failed to delete channel from DB:', err);
    }
  }

  private persistLog(log: NotificationLog): void {
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO notification_logs (id, channel_id, message_id, status, error, sent_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(log.id, log.channelId, log.messageId, log.status, log.error ?? null, log.sentAt);
    } catch (err) {
      console.error('[notification-manager] Failed to persist log:', err);
    }
  }

  // ── Notifier registration ────────────────────────────────────────────

  registerNotifier(notifier: Notifier): void {
    this.notifiers.set(notifier.type, notifier);
  }

  // ── Channel CRUD ─────────────────────────────────────────────────────

  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    this.persistChannel(channel);
  }

  removeChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);
    if (deleted) this.deleteChannelFromDb(channelId);
    return deleted;
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
    this.persistChannel(updated as NotificationChannel);
    return updated as NotificationChannel;
  }

  // ── Sending ──────────────────────────────────────────────────────────

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

    // Update in-memory logs
    this.logs.push(...results);
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Persist each log to SQLite
    for (const log of results) {
      this.persistLog(log);
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
      id: randomUUID(),
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

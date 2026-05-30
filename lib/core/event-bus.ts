// Event-driven architecture with typed event bus
// Supports subscribe/unsubscribe/emit, wildcard matching, async handlers, and replay

type Handler<T = unknown> = (payload: T) => void | Promise<void>;
type Unsubscribe = () => void;

interface Subscription<T = unknown> {
  handler: Handler<T>;
  once: boolean;
  priority: number;
}

interface EventRecord {
  timestamp: number;
  event: string;
  payload: unknown;
}

export class EventBus {
  private handlers = new Map<string, Subscription[]>();
  private eventLog: EventRecord[] = [];
  private maxReplaySize: number;
  private processing = new Set<string>();

  constructor(opts?: { maxReplaySize?: number }) {
    this.maxReplaySize = opts?.maxReplaySize ?? 1000;
  }

  /**
   * Subscribe to an event. Supports wildcards with '*' suffix.
   * e.g. on('server:*', handler) matches 'server:status', 'server:metrics', etc.
   */
  on<T = unknown>(
    event: string,
    handler: Handler<T>,
    opts?: { once?: boolean; priority?: number },
  ): Unsubscribe {
    const sub: Subscription<T> = {
      handler,
      once: opts?.once ?? false,
      priority: opts?.priority ?? 0,
    };

    const list = this.handlers.get(event) ?? [];
    list.push(sub as Subscription);
    list.sort((a, b) => b.priority - a.priority);
    this.handlers.set(event, list);

    return () => {
      const current = this.handlers.get(event);
      if (!current) return;
      const idx = current.indexOf(sub as Subscription);
      if (idx !== -1) current.splice(idx, 1);
      if (current.length === 0) this.handlers.delete(event);
    };
  }

  /** Subscribe to fire only once */
  once<T = unknown>(event: string, handler: Handler<T>): Unsubscribe {
    return this.on(event, handler, { once: true });
  }

  /** Unsubscribe all handlers for a given event */
  off(event: string): void {
    this.handlers.delete(event);
  }

  /** Emit an event to all matching subscribers (including wildcard matches) */
  async emit<T = unknown>(event: string, payload?: T): Promise<void> {
    // Record for replay
    this.eventLog.push({ timestamp: Date.now(), event, payload });
    if (this.eventLog.length > this.maxReplaySize) {
      this.eventLog = this.eventLog.slice(-this.maxReplaySize);
    }

    const matched = this.resolveHandlers(event);
    const toRemove: { event: string; sub: Subscription }[] = [];

    const promises = matched.map(async ({ eventKey, sub }) => {
      try {
        await sub.handler(payload);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${eventKey}":`, err);
      }
      if (sub.once) toRemove.push({ event: eventKey, sub });
    });

    await Promise.all(promises);

    // Clean up once-handlers
    for (const { event: ev, sub } of toRemove) {
      const list = this.handlers.get(ev);
      if (!list) continue;
      const idx = list.indexOf(sub);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /** Synchronous emit — fire and forget, no await */
  emitSync<T = unknown>(event: string, payload?: T): void {
    this.eventLog.push({ timestamp: Date.now(), event, payload });
    if (this.eventLog.length > this.maxReplaySize) {
      this.eventLog = this.eventLog.slice(-this.maxReplaySize);
    }

    const matched = this.resolveHandlers(event);
    const toRemove: { event: string; sub: Subscription }[] = [];

    for (const { eventKey, sub } of matched) {
      try {
        const result = sub.handler(payload);
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error(`[EventBus] Async handler error for "${eventKey}":`, err),
          );
        }
      } catch (err) {
        console.error(`[EventBus] Handler error for "${eventKey}":`, err);
      }
      if (sub.once) toRemove.push({ event: eventKey, sub });
    }

    for (const { event: ev, sub } of toRemove) {
      const list = this.handlers.get(ev);
      if (!list) continue;
      const idx = list.indexOf(sub);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  /** Replay historical events to a handler, optionally filtered */
  replay(handler: Handler<EventRecord>, filter?: { since?: number; event?: string }): void {
    let records = this.eventLog;
    if (filter?.since) records = records.filter((r) => r.timestamp >= filter.since!);
    if (filter?.event) {
      const pattern = filter.event;
      records = records.filter((r) => this.matchesPattern(r.event, pattern));
    }
    for (const record of records) handler(record);
  }

  /** Get all registered event names */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /** Get handler count for an event */
  listenerCount(event: string): number {
    return this.resolveHandlers(event).length;
  }

  /** Remove all handlers and clear event log */
  clear(): void {
    this.handlers.clear();
    this.eventLog = [];
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private resolveHandlers(event: string): { eventKey: string; sub: Subscription }[] {
    const result: { eventKey: string; sub: Subscription }[] = [];

    for (const [key, subs] of this.handlers) {
      if (this.matchesPattern(event, key)) {
        for (const sub of subs) result.push({ eventKey: key, sub });
      }
    }

    return result;
  }

  private matchesPattern(event: string, pattern: string): boolean {
    if (pattern === event) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return event.startsWith(prefix);
    }
    if (pattern.includes('*')) {
      const parts = pattern.split('*');
      let pos = 0;
      for (const part of parts) {
        const idx = event.indexOf(part, pos);
        if (idx === -1) return false;
        pos = idx + part.length;
      }
      return true;
    }
    return false;
  }
}

// ── Singleton instance ────────────────────────────────────────────────────
let _bus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!_bus) _bus = new EventBus({ maxReplaySize: 2000 });
  return _bus;
}

// ── Predefined event types for type safety ────────────────────────────────
export interface ServerStatusEvent {
  serverId: number;
  serverName: string;
  status: 'online' | 'offline' | 'degraded';
  timestamp: number;
}

export interface AlertEvent {
  alertId: string;
  ruleId: string;
  serverId: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface MetricsEvent {
  serverId: number;
  cpu: number;
  memory: number;
  disk: number;
  network: { rx: number; tx: number };
  timestamp: number;
}

export type NezhaEventMap = {
  'server:status': ServerStatusEvent;
  'server:metrics': MetricsEvent;
  'alert:fired': AlertEvent;
  'alert:resolved': AlertEvent;
  'cache:invalidated': { key: string };
  'middleware:error': { error: Error; request: string };
};

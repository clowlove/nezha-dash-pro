// Multi-tier cache: L1 in-memory + L2 Redis-compatible interface
// Supports cache-aside pattern, TTL, tag-based invalidation, and stampede prevention

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  tags: Set<string>;
  createdAt: number;
  hitCount: number;
}

interface CacheOptions {
  ttl?: number;           // Time-to-live in milliseconds (default: 60s)
  tags?: string[];        // Tags for group invalidation
  l2?: boolean;           // Also store in L2 (default: true)
  staleWhileRevalidate?: number; // Serve stale for N ms while refreshing
}

interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  evictions: number;
  sets: number;
  deletes: number;
}

// ── L2 Redis-compatible interface ─────────────────────────────────────────

export interface L2Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  flushdb(): Promise<void>;
}

/** In-memory L2 fallback when Redis is not configured */
export class MemoryL2Store implements L2Store {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async flushdb(): Promise<void> {
    this.store.clear();
  }
}

// ── Multi-tier Cache ──────────────────────────────────────────────────────

export class MultiTierCache {
  private l1 = new Map<string, CacheEntry>();
  private l2: L2Store;
  private stats: CacheStats = { l1Hits: 0, l1Misses: 0, l2Hits: 0, l2Misses: 0, evictions: 0, sets: 0, deletes: 0 };
  private maxSize: number;
  private defaultTtl: number;
  private inflight = new Map<string, Promise<unknown>>();

  constructor(opts?: { l2?: L2Store; maxSize?: number; defaultTtl?: number }) {
    this.l2 = opts?.l2 ?? new MemoryL2Store();
    this.maxSize = opts?.maxSize ?? 10_000;
    this.defaultTtl = opts?.defaultTtl ?? 60_000;
  }

  /**
   * Get a value — checks L1 first, then L2 (cache-aside).
   * If miss, calls the factory to populate both tiers.
   */
  async get<T>(key: string, factory?: () => Promise<T>, opts?: CacheOptions): Promise<T | null> {
    // L1 check
    const l1Entry = this.l1.get(key);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      l1Entry.hitCount++;
      this.stats.l1Hits++;
      return l1Entry.value as T;
    }
    this.stats.l1Misses++;

    // L2 check
    const l2Raw = await this.l2.get(key);
    if (l2Raw !== null) {
      this.stats.l2Hits++;
      const parsed = JSON.parse(l2Raw) as T;
      this.setL1(key, parsed, opts);
      return parsed;
    }
    this.stats.l2Misses++;

    // Cache-aside: call factory
    if (!factory) return null;

    // Stampede prevention
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }

    const promise = factory().then(async (value) => {
      await this.set(key, value, opts);
      this.inflight.delete(key);
      return value;
    }).catch((err) => {
      this.inflight.delete(key);
      throw err;
    });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Explicitly set a value in both cache tiers */
  async set<T>(key: string, value: T, opts?: CacheOptions): Promise<void> {
    const ttl = opts?.ttl ?? this.defaultTtl;
    const tags = new Set(opts?.tags ?? []);

    this.setL1(key, value, { ttl, tags });

    if (opts?.l2 !== false) {
      const ttlSeconds = Math.ceil(ttl / 1000);
      await this.l2.set(key, JSON.stringify(value), ttlSeconds);
    }

    this.stats.sets++;
  }

  /** Delete from both tiers */
  async del(key: string): Promise<void> {
    this.l1.delete(key);
    await this.l2.del(key);
    this.stats.deletes++;
  }

  /** Invalidate all entries matching a tag */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;

    // L1 invalidation
    for (const [key, entry] of this.l1) {
      if (entry.tags.has(tag)) {
        this.l1.delete(key);
        count++;
      }
    }

    // L2: best effort — delete keys that might match the tag pattern
    try {
      const keys = await this.l2.keys(`*tag:${tag}*`);
      for (const key of keys) {
        await this.l2.del(key);
        count++;
      }
    } catch {
      // L2 doesn't support pattern matching — ok
    }

    return count;
  }

  /** Invalidate entries matching a key prefix */
  async invalidateByPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.l1.keys()) {
      if (key.startsWith(prefix)) {
        this.l1.delete(key);
        count++;
      }
    }

    try {
      const keys = await this.l2.keys(`${prefix}*`);
      for (const key of keys) {
        await this.l2.del(key);
        count++;
      }
    } catch {
      // L2 pattern match not available
    }

    return count;
  }

  /** Flush all caches */
  async flush(): Promise<void> {
    this.l1.clear();
    await this.l2.flushdb();
  }

  /** Get cache statistics */
  getStats(): CacheStats & { l1Size: number; inflight: number } {
    return { ...this.stats, l1Size: this.l1.size, inflight: this.inflight.size };
  }

  /** Evict expired entries from L1 (call periodically) */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.l1) {
      if (entry.expiresAt <= now) {
        this.l1.delete(key);
        evicted++;
      }
    }
    this.stats.evictions += evicted;
    return evicted;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private setL1(key: string, value: unknown, opts?: { ttl?: number; tags?: Set<string> }): void {
    // Evict if at capacity (LRU-ish: evict least-hit entries)
    if (this.l1.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    const ttl = opts?.ttl ?? this.defaultTtl;
    this.l1.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      tags: opts?.tags ?? new Set(),
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  private evictLeastUsed(): void {
    let minHits = Infinity;
    let minKey = '';
    for (const [key, entry] of this.l1) {
      if (entry.hitCount < minHits) {
        minHits = entry.hitCount;
        minKey = key;
      }
    }
    if (minKey) {
      this.l1.delete(minKey);
      this.stats.evictions++;
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _cache: MultiTierCache | null = null;

export function getCache(): MultiTierCache {
  if (!_cache) _cache = new MultiTierCache({ maxSize: 50_000, defaultTtl: 60_000 });
  return _cache;
}

// ── Cache key helpers ─────────────────────────────────────────────────────

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export function serverCacheKey(serverId: number, metric?: string): string {
  return metric ? `server:${serverId}:${metric}` : `server:${serverId}`;
}

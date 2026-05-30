/**
 * SQLite storage for historical metrics using better-sqlite3
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import {
  MetricPoint,
  AggregatedMetric,
  QueryOptions,
  StorageProvider,
  AggregationInterval,
  INTERVAL_MS,
  DEFAULT_RETENTION,
  selectInterval,
} from './types';

export class SqliteStorage implements StorageProvider {
  private db: Database.Database;
  private insertRaw: Database.Statement;
  private insertAgg: Database.Statement;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'metrics.db');
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB
    this.init();
    this.insertRaw = this.db.prepare(
      `INSERT OR REPLACE INTO raw_metrics (server_id, metric, value, timestamp) VALUES (?, ?, ?, ?)`
    );
    this.insertAgg = this.db.prepare(
      `INSERT OR REPLACE INTO aggregated_metrics (server_id, metric, interval_name, timestamp, min, max, avg, sum, count, last)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS raw_metrics (
        server_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (server_id, metric, timestamp)
      );

      CREATE TABLE IF NOT EXISTS aggregated_metrics (
        server_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        interval_name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        min REAL NOT NULL,
        max REAL NOT NULL,
        avg REAL NOT NULL,
        sum REAL NOT NULL,
        count INTEGER NOT NULL,
        last REAL NOT NULL,
        PRIMARY KEY (server_id, metric, interval_name, timestamp)
      );

      CREATE INDEX IF NOT EXISTS idx_raw_lookup
        ON raw_metrics (server_id, metric, timestamp);

      CREATE INDEX IF NOT EXISTS idx_agg_lookup
        ON aggregated_metrics (server_id, metric, interval_name, timestamp);
    `);
  }

  store(point: MetricPoint): void {
    this.insertRaw.run(point.serverId, point.metric, point.value, point.timestamp);
  }

  storeBatch(points: MetricPoint[]): void {
    const tx = this.db.transaction((pts: MetricPoint[]) => {
      for (const p of pts) {
        this.insertRaw.run(p.serverId, p.metric, p.value, p.timestamp);
      }
    });
    tx(points);
  }

  getLatest(serverId: number, metric: string): MetricPoint | null {
    const row = this.db.prepare(
      `SELECT server_id, metric, value, timestamp FROM raw_metrics
       WHERE server_id = ? AND metric = ?
       ORDER BY timestamp DESC LIMIT 1`
    ).get(serverId, metric) as { server_id: string; metric: string; value: number; timestamp: number } | undefined;

    if (!row) return null;
    return { serverId: row.server_id, metric: row.metric, value: row.value, timestamp: row.timestamp };
  }

  queryRaw(sql: string, params: unknown[]): unknown[] {
    return this.db.prepare(sql).all(...params) as unknown[];
  }

  executeRaw(sql: string, params: unknown[]): { changes: number } {
    return this.db.prepare(sql).run(...params) as { changes: number };
  }

  query(options: QueryOptions): AggregatedMetric[] {
    const { serverId, metric, range, limit } = options;
    const rangeMs = range.end - range.start;
    const interval = options.interval || selectInterval(rangeMs);

    // For raw 5s interval, query raw_metrics directly
    if (interval === '5s') {
      return this.queryRawMetrics(serverId, metric, range, limit);
    }

    // Check if aggregated data exists, fallback to raw if not
    const aggRows = this.queryAggregated(serverId, metric, interval, range, limit);
    if (aggRows.length > 0) return aggRows;

    return this.queryAndAggregate(serverId, metric, interval, range, limit);
  }

  private queryRawMetrics(serverId: number, metric: string, range: { start: number; end: number }, limit?: number): AggregatedMetric[] {
    let sql = `SELECT server_id, metric, value, timestamp FROM raw_metrics
               WHERE server_id = ? AND metric = ? AND timestamp >= ? AND timestamp <= ?
               ORDER BY timestamp ASC`;
    if (limit) sql += ` LIMIT ${limit}`;

    const rows = this.db.prepare(sql).all(serverId, metric, range.start, range.end) as Array<{
      server_id: string; metric: string; value: number; timestamp: number;
    }>;

    return rows.map(r => ({
      serverId: r.server_id,
      metric: r.metric,
      interval: '5s' as AggregationInterval,
      timestamp: r.timestamp,
      min: r.value,
      max: r.value,
      avg: r.value,
      sum: r.value,
      count: 1,
      last: r.value,
    }));
  }

  private queryAggregated(serverId: number, metric: string, interval: AggregationInterval, range: { start: number; end: number }, limit?: number): AggregatedMetric[] {
    let sql = `SELECT * FROM aggregated_metrics
               WHERE server_id = ? AND metric = ? AND interval_name = ? AND timestamp >= ? AND timestamp <= ?
               ORDER BY timestamp ASC`;
    if (limit) sql += ` LIMIT ${limit}`;

    const rows = this.db.prepare(sql).all(serverId, metric, interval, range.start, range.end) as Array<{
      server_id: string; metric: string; interval_name: AggregationInterval; timestamp: number;
      min: number; max: number; avg: number; sum: number; count: number; last: number;
    }>;

    return rows.map(r => ({
      serverId: r.server_id,
      metric: r.metric,
      interval: r.interval_name,
      timestamp: r.timestamp,
      min: r.min,
      max: r.max,
      avg: r.avg,
      sum: r.sum,
      count: r.count,
      last: r.last,
    }));
  }

  private queryAndAggregate(serverId: number, metric: string, interval: AggregationInterval, range: { start: number; end: number }, limit?: number): AggregatedMetric[] {
    const intervalMs = INTERVAL_MS[interval];
    const rawRows = this.db.prepare(
      `SELECT value, timestamp FROM raw_metrics
       WHERE server_id = ? AND metric = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`
    ).all(serverId, metric, range.start, range.end) as Array<{ value: number; timestamp: number }>;

    if (rawRows.length === 0) return [];

    const buckets = new Map<number, number[]>();
    for (const row of rawRows) {
      const bucketTs = Math.floor(row.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketTs)) buckets.set(bucketTs, []);
      buckets.get(bucketTs)!.push(row.value);
    }

    const results: AggregatedMetric[] = [];
    const sortedKeys = Array.from(buckets.keys()).sort();

    for (const ts of sortedKeys) {
      const values = buckets.get(ts)!;
      const sum = values.reduce((a, b) => a + b, 0);
      results.push({
        serverId,
        metric,
        interval,
        timestamp: ts,
        min: values.reduce((a, b) => Math.min(a, b), Infinity),
        max: values.reduce((a, b) => Math.max(a, b), -Infinity),
        avg: sum / values.length,
        sum,
        count: values.length,
        last: values[values.length - 1],
      });
    }

    // Store aggregated data for future queries
    this.storeAggregated(results);

    return limit ? results.slice(0, limit) : results;
  }

  storeAggregated(metrics: AggregatedMetric[]): void {
    const tx = this.db.transaction((items: AggregatedMetric[]) => {
      for (const m of items) {
        this.insertAgg.run(m.serverId, m.metric, m.interval, m.timestamp, m.min, m.max, m.avg, m.sum, m.count, m.last);
      }
    });
    tx(metrics);
  }

  cleanup(olderThan: number): number {
    let total = 0;
    for (const [interval, retention] of Object.entries(DEFAULT_RETENTION)) {
      const cutoff = Date.now() - retention;
      const result = this.db.prepare(
        `DELETE FROM aggregated_metrics WHERE interval_name = ? AND timestamp < ?`
      ).run(interval, cutoff);
      total += result.changes;
    }

    const rawResult = this.db.prepare(`DELETE FROM raw_metrics WHERE timestamp < ?`).run(olderThan);
    total += rawResult.changes;

    return total;
  }

  close(): void {
    this.db.close();
  }
}

// Singleton
let storageInstance: SqliteStorage | null = null;

export function getStorage(dbPath?: string): SqliteStorage {
  if (!storageInstance) {
    storageInstance = new SqliteStorage(dbPath);
  }
  return storageInstance;
}

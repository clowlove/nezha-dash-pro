/**
 * Data aggregation - progressive rollup from 5s → 1min → 5min → 30min → 2h → 1d
 */

import { getStorage } from './sqlite';
import {
  MetricPoint,
  AggregatedMetric,
  AggregationInterval,
  INTERVAL_MS,
  DEFAULT_RETENTION,
} from './types';

interface AggregationStep {
  from: AggregationInterval;
  to: AggregationInterval;
  maxAge: number; // Min age of source data before aggregating
}

const AGGREGATION_PIPELINE: AggregationStep[] = [
  { from: '5s', to: '1min', maxAge: 2 * 60_000 },
  { from: '1min', to: '5min', maxAge: 10 * 60_000 },
  { from: '5min', to: '30min', maxAge: 60 * 60_000 },
  { from: '30min', to: '2h', maxAge: 4 * 60 * 60_000 },
  { from: '2h', to: '1d', maxAge: 24 * 60 * 60_000 },
];

export class MetricAggregator {
  private storage = getStorage();

  /**
   * Ingest a raw metric point and trigger aggregation checks
   */
  ingest(point: MetricPoint): void {
    this.storage.store(point);
  }

  /**
   * Ingest multiple raw metric points in a batch
   */
  ingestBatch(points: MetricPoint[]): void {
    this.storage.storeBatch(points);
  }

  /**
   * Run the aggregation pipeline for all steps
   */
  runAggregation(): { aggregated: number; cleaned: number } {
    let totalAggregated = 0;
    const now = Date.now();

    for (const step of AGGREGATION_PIPELINE) {
      const aggregated = this.aggregateStep(step, now);
      totalAggregated += aggregated;
    }

    // Cleanup old data
    const cleaned = this.cleanupOldData(now);

    return { aggregated: totalAggregated, cleaned };
  }

  /**
   * Aggregate a single step in the pipeline
   */
  private aggregateStep(step: AggregationStep, now: number): number {
    const fromIntervalMs = INTERVAL_MS[step.from];
    const toIntervalMs = INTERVAL_MS[step.to];
    const cutoff = now - step.maxAge;

    // Get raw data older than maxAge from source interval
    const rawMetrics = this.getUnaggregatedSource(step.from, cutoff);
    if (rawMetrics.length === 0) return 0;

    // Group by server+metric, then by target bucket
    const grouped = this.groupByTargetBucket(rawMetrics, toIntervalMs);
    const aggregated: AggregatedMetric[] = [];

    for (const [key, points] of grouped) {
      const [serverId, metric, bucketTs] = key.split('|');
      const values = points.map(p => p.value);
      const sum = values.reduce((a, b) => a + b, 0);

      aggregated.push({
        serverId: Number(serverId),
        metric,
        interval: step.to,
        timestamp: parseInt(bucketTs),
        min: values.reduce((a, b) => Math.min(a, b), Infinity),
        max: values.reduce((a, b) => Math.max(a, b), -Infinity),
        avg: sum / values.length,
        sum,
        count: values.length,
        last: values[values.length - 1],
      });
    }

    if (aggregated.length > 0) {
      this.storage.storeAggregated(aggregated);
    }

    return aggregated.length;
  }

  private getUnaggregatedSource(interval: AggregationInterval, before: number): Array<{ serverId: number; metric: string; value: number; timestamp: number }> {
    // For raw 5s data
    if (interval === '5s') {
      const rows = this.storage.queryRaw(
        `SELECT server_id, metric, value, timestamp FROM raw_metrics
         WHERE timestamp < ? ORDER BY server_id, metric, timestamp`,
        [before]
      ) as Array<{ server_id: string; metric: string; value: number; timestamp: number }>;

      return rows.map(r => ({ serverId: r.server_id, metric: r.metric, value: r.value, timestamp: r.timestamp }));
    }

    // For aggregated intervals
    const rows = this.storage.queryRaw(
      `SELECT server_id, metric, avg as value, timestamp FROM aggregated_metrics
       WHERE interval_name = ? AND timestamp < ?
       ORDER BY server_id, metric, timestamp`,
      [interval, before]
    ) as Array<{ server_id: string; metric: string; value: number; timestamp: number }>;

    return rows.map(r => ({ serverId: r.server_id, metric: r.metric, value: r.value, timestamp: r.timestamp }));
  }

  private groupByTargetBucket(
    points: Array<{ serverId: number; metric: string; value: number; timestamp: number }>,
    targetIntervalMs: number
  ): Map<string, Array<{ value: number; timestamp: number }>> {
    const groups = new Map<string, Array<{ value: number; timestamp: number }>>();

    for (const point of points) {
      const bucketTs = Math.floor(point.timestamp / targetIntervalMs) * targetIntervalMs;
      const key = `${point.serverId}|${point.metric}|${bucketTs}`;

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ value: point.value, timestamp: point.timestamp });
    }

    return groups;
  }

  private cleanupOldData(now: number): number {
    let total = 0;
    for (const [interval, retention] of Object.entries(DEFAULT_RETENTION) as Array<[AggregationInterval, number]>) {
      const cutoff = now - retention;
      const result = this.storage.executeRaw(
        `DELETE FROM aggregated_metrics WHERE interval_name = ? AND timestamp < ?`,
        [interval, cutoff]
      );
      total += result.changes;
    }

    // Clean raw data older than the shortest retention
    const rawCutoff = now - DEFAULT_RETENTION['5s'];
    const rawResult = this.storage.executeRaw(
      `DELETE FROM raw_metrics WHERE timestamp < ?`,
      [rawCutoff]
    );
    total += rawResult.changes;

    return total;
  }
}

// Singleton
let aggregatorInstance: MetricAggregator | null = null;

export function getAggregator(): MetricAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new MetricAggregator();
  }
  return aggregatorInstance;
}

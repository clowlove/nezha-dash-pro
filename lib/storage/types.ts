/**
 * Storage types for historical metric data
 */

export interface MetricPoint {
  serverId: number;
  metric: string;
  value: number;
  timestamp: number; // Unix ms
}

export interface TimeRange {
  start: number; // Unix ms
  end: number;   // Unix ms
}

export type AggregationInterval = '5s' | '1min' | '5min' | '30min' | '2h' | '1d';

export interface AggregatedMetric {
  serverId: number;
  metric: string;
  interval: AggregationInterval;
  timestamp: number; // Bucket start time
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
  last: number;
}

export interface QueryOptions {
  serverId: number;
  metric: string;
  range: TimeRange;
  interval?: AggregationInterval;
  limit?: number;
}

export interface StorageProvider {
  store(point: MetricPoint): void;
  storeBatch(points: MetricPoint[]): void;
  query(options: QueryOptions): AggregatedMetric[];
  getLatest(serverId: number, metric: string): MetricPoint | null;
  queryRaw(sql: string, params: unknown[]): unknown[];
  executeRaw(sql: string, params: unknown[]): { changes: number };
  cleanup(olderThan: number): number; // returns deleted count
  close(): void;
}

// Maps aggregation intervals to their duration in milliseconds
export const INTERVAL_MS: Record<AggregationInterval, number> = {
  '5s': 5_000,
  '1min': 60_000,
  '5min': 300_000,
  '30min': 1_800_000,
  '2h': 7_200_000,
  '1d': 86_400_000,
};

// Default retention periods for each aggregation level
export const DEFAULT_RETENTION: Record<AggregationInterval, number> = {
  '5s': 1 * 24 * 60 * 60 * 1000,      // 1 day
  '1min': 7 * 24 * 60 * 60 * 1000,     // 7 days
  '5min': 30 * 24 * 60 * 60 * 1000,    // 30 days
  '30min': 90 * 24 * 60 * 60 * 1000,   // 90 days
  '2h': 365 * 24 * 60 * 60 * 1000,     // 1 year
  '1d': 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
};

// Determines the best aggregation interval for a given time range
export function selectInterval(rangeMs: number, maxPoints = 500): AggregationInterval {
  const intervals: AggregationInterval[] = ['5s', '1min', '5min', '30min', '2h', '1d'];
  for (const interval of intervals) {
    const pointCount = Math.ceil(rangeMs / INTERVAL_MS[interval]);
    if (pointCount <= maxPoints) return interval;
  }
  return '1d';
}

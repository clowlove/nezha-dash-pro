// NezhaDash Pro - Traffic Tracker
// Stores traffic data in-memory with hooks for SQLite integration

import type { TrafficRecord, TrafficSnapshot, TrafficSummary, TrafficAlert } from './types';

// --- Storage (in-memory, with SQLite hook points) ---

const trafficRecords: Map<string, TrafficRecord[]> = new Map(); // serverId -> records
const alerts: TrafficAlert[] = [];
let alertIdCounter = 0;

// SQLite integration hook — replace these to persist data
const storageHook = {
  async saveRecord(record: TrafficRecord): Promise<void> {
    // TODO: INSERT INTO traffic_records (...)
  },
  async loadRecords(serverId: number, start: number, end: number): Promise<TrafficRecord[]> {
    // TODO: SELECT * FROM traffic_records WHERE server_id = ? AND timestamp BETWEEN ? AND ?
    return [];
  },
  async saveAlert(alert: TrafficAlert): Promise<void> {
    // TODO: INSERT INTO traffic_alerts (...)
  },
};

// --- Core tracking ---

/**
 * Record a traffic snapshot for a server. Calculates deltas from the previous record.
 */
export function recordTrafficSnapshot(
  serverId: number,
  serverName: string,
  snapshot: TrafficSnapshot,
): TrafficRecord | null {
  const records = getOrCreateRecords(serverId);
  const prev = records.length > 0 ? records[records.length - 1] : null;

  // First record is a baseline — no delta to compute
  if (!prev) {
    const record: TrafficRecord = {
      id: `${serverId}-${snapshot.timestamp}`,
      serverId,
      serverName,
      timestamp: snapshot.timestamp,
      upload: 0,
      download: 0,
      total: 0,
    };
    records.push(record);
    storageHook.saveRecord(record);
    return null;
  }

  // Handle counter wrap (reboot) — if current < previous, skip delta
  const uploadDelta = snapshot.upload >= prev.upload ? snapshot.upload - prev.upload : 0;
  const downloadDelta = snapshot.download >= prev.download ? snapshot.download - prev.download : 0;

  const record: TrafficRecord = {
    id: `${serverId}-${snapshot.timestamp}`,
    serverId,
    serverName,
    timestamp: snapshot.timestamp,
    upload: uploadDelta,
    download: downloadDelta,
    total: uploadDelta + downloadDelta,
  };

  records.push(record);
  storageHook.saveRecord(record);

  // Check for spikes
  detectSpike(serverId, serverName, records);

  return record;
}

/**
 * Bulk import records (for migration or replay).
 */
export function importRecords(serverId: number, records: TrafficRecord[]): void {
  const existing = getOrCreateRecords(serverId);
  existing.push(...records.sort((a, b) => a.timestamp - b.timestamp));
}

// --- Querying ---

/**
 * Get traffic records for a server within a time range.
 */
export function getTrafficRecords(
  serverId: number,
  startTime: number,
  endTime: number,
): TrafficRecord[] {
  const records = trafficRecords.get(String(serverId)) ?? [];
  return records.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
}

/**
 * Get all server IDs that have traffic data.
 */
export function getTrackedServerIds(): number[] {
  return Array.from(trafficRecords.keys()).map(Number);
}

/**
 * Calculate daily traffic summary for a server.
 */
export function getDailySummary(
  serverId: number,
  serverName: string,
  date: Date,
): TrafficSummary {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return calculateSummary(serverId, serverName, 'daily', dayStart.getTime(), dayEnd.getTime());
}

/**
 * Calculate monthly traffic summary for a server.
 */
export function getMonthlySummary(
  serverId: number,
  serverName: string,
  year: number,
  month: number, // 0-indexed
): TrafficSummary {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return calculateSummary(serverId, serverName, 'monthly', monthStart.getTime(), monthEnd.getTime());
}

/**
 * Get aggregated summaries for all servers in a time range.
 */
export function getAllServerSummaries(
  startTime: number,
  endTime: number,
): TrafficSummary[] {
  const summaries: TrafficSummary[] = [];
  for (const serverId of getTrackedServerIds()) {
    const records = getTrafficRecords(serverId, startTime, endTime);
    if (records.length === 0) continue;
    const serverName = records[0].serverName;
    summaries.push(calculateSummaryFromRecords(serverId, serverName, 'monthly', startTime, endTime, records));
  }
  return summaries;
}

/**
 * Get hourly traffic data points for charting.
 */
export function getHourlyAggregates(
  serverId: number,
  startTime: number,
  endTime: number,
): Array<{ timestamp: number; upload: number; download: number }> {
  const records = getTrafficRecords(serverId, startTime, endTime);
  const hourly = new Map<number, { upload: number; download: number }>();

  for (const r of records) {
    // Round to hour
    const hourTs = Math.floor(r.timestamp / 3600000) * 3600000;
    const existing = hourly.get(hourTs) ?? { upload: 0, download: 0 };
    existing.upload += r.upload;
    existing.download += r.download;
    hourly.set(hourTs, existing);
  }

  return Array.from(hourly.entries())
    .map(([timestamp, data]) => ({ timestamp, ...data }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// --- Spike detection ---

function detectSpike(serverId: number, serverName: string, records: TrafficRecord[]): void {
  if (records.length < 5) return; // Need at least 5 records for baseline

  const recent = records.slice(-1)[0];
  const baseline = records.slice(-10, -1);
  const avgTotal = baseline.reduce((sum, r) => sum + r.total, 0) / baseline.length;

  // Default spike multiplier: 3x
  const spikeMultiplier = 3;
  if (avgTotal > 0 && recent.total > avgTotal * spikeMultiplier) {
    const alert: TrafficAlert = {
      id: `spike-${++alertIdCounter}`,
      type: 'spike',
      serverId,
      message: `Traffic spike detected on ${serverName}: ${formatBytes(recent.total)} (${(recent.total / avgTotal).toFixed(1)}x average)`,
      value: recent.total,
      threshold: avgTotal * spikeMultiplier,
      timestamp: recent.timestamp,
      acknowledged: false,
    };
    alerts.push(alert);
    storageHook.saveAlert(alert);
  }
}

/**
 * Get unacknowledged alerts.
 */
export function getActiveAlerts(): TrafficAlert[] {
  return alerts.filter(a => !a.acknowledged);
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

// --- Helpers ---

function getOrCreateRecords(serverId: number): TrafficRecord[] {
  const key = String(serverId);
  if (!trafficRecords.has(key)) {
    trafficRecords.set(key, []);
  }
  return trafficRecords.get(key)!;
}

function calculateSummary(
  serverId: number,
  serverName: string,
  period: 'hourly' | 'daily' | 'monthly',
  startTime: number,
  endTime: number,
): TrafficSummary {
  const records = getTrafficRecords(serverId, startTime, endTime);
  return calculateSummaryFromRecords(serverId, serverName, period, startTime, endTime, records);
}

function calculateSummaryFromRecords(
  serverId: number,
  serverName: string,
  period: 'hourly' | 'daily' | 'monthly',
  startTime: number,
  endTime: number,
  records: TrafficRecord[],
): TrafficSummary {
  if (records.length === 0) {
    return {
      serverId, serverName, period, startTime, endTime,
      totalUpload: 0, totalDownload: 0, totalTraffic: 0,
      peakUpload: 0, peakDownload: 0, avgUpload: 0, avgDownload: 0, recordCount: 0,
    };
  }

  const totalUpload = records.reduce((s, r) => s + r.upload, 0);
  const totalDownload = records.reduce((s, r) => s + r.download, 0);
  const peakUpload = Math.max(...records.map(r => r.upload));
  const peakDownload = Math.max(...records.map(r => r.download));

  return {
    serverId, serverName, period, startTime, endTime,
    totalUpload,
    totalDownload,
    totalTraffic: totalUpload + totalDownload,
    peakUpload,
    peakDownload,
    avgUpload: totalUpload / records.length,
    avgDownload: totalDownload / records.length,
    recordCount: records.length,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Convert bytes to GB.
 */
export function toGB(bytes: number): number {
  return bytes / (1024 ** 3);
}

/**
 * Reset all data (for testing).
 */
export function resetTracker(): void {
  trafficRecords.clear();
  alerts.length = 0;
  alertIdCounter = 0;
}

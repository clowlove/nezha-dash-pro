// NezhaDash Pro - Report Generator
// Monthly/quarterly reports, server breakdown, export to JSON/CSV

import type {
  BillingReport, ServerCostEntry, TrendData,
  TrafficSummary, Currency,
} from './types';
import { getAllServerSummaries, toGB } from './traffic-tracker';
import {
  calculateServerBreakdown, calculateTrends,
  estimateMonthlyCost, formatCost, getConfig,
} from './cost-calculator';

// In-memory report cache
const reportCache: Map<string, BillingReport> = new Map();
let reportIdCounter = 0;

// SQLite hook
const reportStorageHook = {
  async saveReport(report: BillingReport): Promise<void> {
    // TODO: INSERT INTO billing_reports (...)
  },
  async loadReports(type?: 'monthly' | 'quarterly'): Promise<BillingReport[]> {
    // TODO: SELECT * FROM billing_reports WHERE type = ?
    return [];
  },
};

// --- Report generation ---

/**
 * Generate a monthly report for a given year/month.
 */
export function generateMonthlyReport(
  year: number,
  month: number, // 1-indexed
  currency?: Currency,
): BillingReport {
  const curr = currency ?? getConfig().currency;
  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const summaries = getAllServerSummaries(monthStart, monthEnd);
  const serverBreakdown = calculateServerBreakdown(summaries, curr);
  const topConsumers = serverBreakdown.slice(0, 10);
  const totalCost = serverBreakdown.reduce((s, e) => s + e.cost, 0);

  // Build trends from cache
  const trends = buildTrends(year, month, curr);

  const report: BillingReport = {
    id: `rpt-${++reportIdCounter}`,
    type: 'monthly',
    periodStart: monthStart,
    periodEnd: monthEnd,
    currency: curr,
    totalCost,
    serverBreakdown,
    topConsumers,
    trends,
    generatedAt: Date.now(),
  };

  reportCache.set(report.id, report);
  reportStorageHook.saveReport(report);
  return report;
}

/**
 * Generate a quarterly report.
 */
export function generateQuarterlyReport(
  year: number,
  quarter: number, // 1-4
  currency?: Currency,
): BillingReport {
  const curr = currency ?? getConfig().currency;
  const startMonth = (quarter - 1) * 3;
  const quarterStart = new Date(year, startMonth, 1).getTime();
  const quarterEnd = new Date(year, startMonth + 3, 0, 23, 59, 59, 999).getTime();

  const summaries = getAllServerSummaries(quarterStart, quarterEnd);
  const serverBreakdown = calculateServerBreakdown(summaries, curr);
  const topConsumers = serverBreakdown.slice(0, 10);
  const totalCost = serverBreakdown.reduce((s, e) => s + e.cost, 0);

  const trends: TrendData[] = [];
  for (let m = 0; m < 3; m++) {
    const mStart = new Date(year, startMonth + m, 1).getTime();
    const mEnd = new Date(year, startMonth + m + 1, 0, 23, 59, 59, 999).getTime();
    const mSummaries = getAllServerSummaries(mStart, mEnd);
    const mBreakdown = calculateServerBreakdown(mSummaries, curr);
    const mCost = mBreakdown.reduce((s, e) => s + e.cost, 0);
    const mTrafficGB = mSummaries.reduce((s, sum) => s + toGB(sum.totalTraffic), 0);

    trends.push({
      period: `${year}-${String(startMonth + m + 1).padStart(2, '0')}`,
      totalTrafficGB: mTrafficGB,
      totalCost: mCost,
      changePercent: 0,
    });
  }

  // Calculate change percentages
  for (let i = 1; i < trends.length; i++) {
    if (trends[i - 1].totalCost > 0) {
      trends[i].changePercent =
        ((trends[i].totalCost - trends[i - 1].totalCost) / trends[i - 1].totalCost) * 100;
    }
  }

  const report: BillingReport = {
    id: `rpt-${++reportIdCounter}`,
    type: 'quarterly',
    periodStart: quarterStart,
    periodEnd: quarterEnd,
    currency: curr,
    totalCost,
    serverBreakdown,
    topConsumers,
    trends,
    generatedAt: Date.now(),
  };

  reportCache.set(report.id, report);
  reportStorageHook.saveReport(report);
  return report;
}

/**
 * Get a cached report by ID.
 */
export function getReport(reportId: string): BillingReport | null {
  return reportCache.get(reportId) ?? null;
}

/**
 * List all cached reports.
 */
export function listReports(type?: 'monthly' | 'quarterly'): BillingReport[] {
  const reports = Array.from(reportCache.values());
  if (type) return reports.filter(r => r.type === type);
  return reports.sort((a, b) => b.generatedAt - a.generatedAt);
}

// --- Export ---

/**
 * Export report as JSON string.
 */
export function exportReportJSON(report: BillingReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Export report as CSV string.
 */
export function exportReportCSV(report: BillingReport): string {
  const lines: string[] = [];

  // Header
  lines.push('Report Type,Period Start,Period End,Currency,Total Cost');
  lines.push(
    [
      report.type,
      new Date(report.periodStart).toISOString(),
      new Date(report.periodEnd).toISOString(),
      report.currency,
      report.totalCost.toFixed(2),
    ].join(','),
  );

  lines.push('');

  // Server breakdown
  lines.push('Server ID,Server Name,Upload (GB),Download (GB),Total (GB),Cost,Percent');
  for (const entry of report.serverBreakdown) {
    lines.push(
      [
        entry.serverId,
        `"${entry.serverName}"`,
        entry.uploadGB.toFixed(4),
        entry.downloadGB.toFixed(4),
        entry.totalGB.toFixed(4),
        entry.cost.toFixed(2),
        entry.percentOfTotal.toFixed(1) + '%',
      ].join(','),
    );
  }

  lines.push('');

  // Trends
  lines.push('Period,Traffic (GB),Cost,Change %');
  for (const trend of report.trends) {
    lines.push(
      [
        trend.period,
        trend.totalTrafficGB.toFixed(4),
        trend.totalCost.toFixed(2),
        trend.changePercent.toFixed(1) + '%',
      ].join(','),
    );
  }

  return lines.join('\n');
}

/**
 * Export traffic summaries as CSV.
 */
export function exportSummariesCSV(summaries: TrafficSummary[]): string {
  const lines: string[] = [];
  lines.push('Server ID,Server Name,Period Start,Period End,Upload (bytes),Download (bytes),Total (bytes),Peak Upload,Peak Download,Records');

  for (const s of summaries) {
    lines.push(
      [
        s.serverId,
        `"${s.serverName}"`,
        new Date(s.startTime).toISOString(),
        new Date(s.endTime).toISOString(),
        s.totalUpload,
        s.totalDownload,
        s.totalTraffic,
        s.peakUpload,
        s.peakDownload,
        s.recordCount,
      ].join(','),
    );
  }

  return lines.join('\n');
}

// --- Helpers ---

function buildTrends(year: number, month: number, currency: Currency): TrendData[] {
  const trends: TrendData[] = [];

  // Build 6 months of trends leading up to current month
  for (let i = 5; i >= 0; i--) {
    let tYear = year;
    let tMonth = month - i;
    while (tMonth <= 0) {
      tMonth += 12;
      tYear--;
    }

    const mStart = new Date(tYear, tMonth - 1, 1).getTime();
    const mEnd = new Date(tYear, tMonth, 0, 23, 59, 59, 999).getTime();
    const mSummaries = getAllServerSummaries(mStart, mEnd);
    const mBreakdown = calculateServerBreakdown(mSummaries, currency);
    const mCost = mBreakdown.reduce((s, e) => s + e.cost, 0);
    const mTrafficGB = mSummaries.reduce((s, sum) => s + toGB(sum.totalTraffic), 0);

    trends.push({
      period: `${tYear}-${String(tMonth).padStart(2, '0')}`,
      totalTrafficGB: mTrafficGB,
      totalCost: mCost,
      changePercent: 0,
    });
  }

  // Calculate change percentages
  for (let i = 1; i < trends.length; i++) {
    if (trends[i - 1].totalCost > 0) {
      trends[i].changePercent =
        ((trends[i].totalCost - trends[i - 1].totalCost) / trends[i - 1].totalCost) * 100;
    }
  }

  return trends;
}

/**
 * Reset report cache (for testing).
 */
export function resetReports(): void {
  reportCache.clear();
  reportIdCounter = 0;
}

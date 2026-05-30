// NezhaDash Pro - Cost Calculator
// Configurable rates, multi-currency support, monthly estimation

import type {
  CostConfig, CostRate, Currency, BillingReport,
  ServerCostEntry, TrafficSummary, TrendData,
} from './types';
import { CURRENCIES } from './types';
import { toGB } from './traffic-tracker';

// --- Default configuration ---

const DEFAULT_RATES: Record<Currency, CostRate> = {
  USD: { uploadPerGB: 0.05, downloadPerGB: 0.08, totalPerGB: 0.10, useDirectionalRates: false },
  CNY: { uploadPerGB: 0.30, downloadPerGB: 0.50, totalPerGB: 0.65, useDirectionalRates: false },
  EUR: { uploadPerGB: 0.04, downloadPerGB: 0.07, totalPerGB: 0.09, useDirectionalRates: false },
};

const DEFAULT_CONFIG: CostConfig = {
  currency: 'USD',
  rates: DEFAULT_RATES,
  billingCycleStart: 1,
  alertThresholds: {
    dailyTrafficGB: 100,
    monthlyTrafficGB: 1000,
    monthlyCost: 100,
    spikeMultiplier: 3,
  },
};

// In-memory config store
let currentConfig: CostConfig = { ...DEFAULT_CONFIG, rates: { ...DEFAULT_RATES } };

// SQLite hook
const configStorageHook = {
  async saveConfig(config: CostConfig): Promise<void> {
    // TODO: INSERT OR REPLACE INTO billing_config (...)
  },
  async loadConfig(): Promise<CostConfig | null> {
    // TODO: SELECT * FROM billing_config LIMIT 1
    return null;
  },
};

// --- Config management ---

export function getConfig(): CostConfig {
  return currentConfig;
}

export function updateConfig(partial: Partial<CostConfig>): CostConfig {
  currentConfig = { ...currentConfig, ...partial };
  configStorageHook.saveConfig(currentConfig);
  return currentConfig;
}

export function setRate(currency: Currency, rate: CostRate): void {
  currentConfig.rates[currency] = rate;
  configStorageHook.saveConfig(currentConfig);
}

export function setCurrency(currency: Currency): void {
  currentConfig.currency = currency;
  configStorageHook.saveConfig(currentConfig);
}

// --- Cost calculation ---

/**
 * Calculate cost for a given traffic amount in the current currency.
 */
export function calculateCost(
  uploadBytes: number,
  downloadBytes: number,
  currency?: Currency,
): number {
  const curr = currency ?? currentConfig.currency;
  const rate = currentConfig.rates[curr];
  if (!rate) return 0;

  const uploadGB = toGB(uploadBytes);
  const downloadGB = toGB(downloadBytes);

  if (rate.useDirectionalRates) {
    return uploadGB * rate.uploadPerGB + downloadGB * rate.downloadPerGB;
  }
  return (uploadGB + downloadGB) * rate.totalPerGB;
}

/**
 * Calculate cost from a traffic summary.
 */
export function calculateSummaryCost(summary: TrafficSummary, currency?: Currency): number {
  return calculateCost(summary.totalUpload, summary.totalDownload, currency);
}

/**
 * Calculate server cost breakdown for a set of summaries.
 */
export function calculateServerBreakdown(
  summaries: TrafficSummary[],
  currency?: Currency,
): ServerCostEntry[] {
  const curr = currency ?? currentConfig.currency;
  const entries: ServerCostEntry[] = summaries.map(s => ({
    serverId: s.serverId,
    serverName: s.serverName,
    uploadGB: toGB(s.totalUpload),
    downloadGB: toGB(s.totalDownload),
    totalGB: toGB(s.totalTraffic),
    cost: calculateCost(s.totalUpload, s.totalDownload, curr),
    percentOfTotal: 0,
  }));

  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  for (const entry of entries) {
    entry.percentOfTotal = totalCost > 0 ? (entry.cost / totalCost) * 100 : 0;
  }

  return entries.sort((a, b) => b.cost - a.cost);
}

/**
 * Estimate monthly cost based on current usage pattern.
 * Projects remaining month from elapsed days.
 */
export function estimateMonthlyCost(
  currentSummaries: TrafficSummary[],
  daysElapsed: number,
  currency?: Currency,
): {
  currentCost: number;
  projectedCost: number;
  daysElapsed: number;
  daysInMonth: number;
} {
  const curr = currency ?? currentConfig.currency;
  const totalUpload = currentSummaries.reduce((s, sum) => s + sum.totalUpload, 0);
  const totalDownload = currentSummaries.reduce((s, sum) => s + sum.totalDownload, 0);
  const currentCost = calculateCost(totalUpload, totalDownload, curr);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyRate = daysElapsed > 0 ? currentCost / daysElapsed : 0;
  const projectedCost = dailyRate * daysInMonth;

  return { currentCost, projectedCost, daysElapsed, daysInMonth };
}

/**
 * Get cost in all supported currencies.
 */
export function getMultiCurrencyCost(
  uploadBytes: number,
  downloadBytes: number,
): Record<Currency, number> {
  const result: Partial<Record<Currency, number>> = {};
  for (const currency of Object.keys(CURRENCIES) as Currency[]) {
    result[currency] = calculateCost(uploadBytes, downloadBytes, currency);
  }
  return result as Record<Currency, number>;
}

/**
 * Format cost with currency symbol.
 */
export function formatCost(amount: number, currency?: Currency): string {
  const curr = currency ?? currentConfig.currency;
  const info = CURRENCIES[curr];
  return `${info.symbol}${amount.toFixed(2)}`;
}

/**
 * Convert cost between currencies (approximate rates).
 * In production, use live exchange rates.
 */
const EXCHANGE_RATES: Record<string, number> = {
  'USD-CNY': 7.2,
  'USD-EUR': 0.92,
  'CNY-USD': 1 / 7.2,
  'CNY-EUR': 0.92 / 7.2,
  'EUR-USD': 1 / 0.92,
  'EUR-CNY': 7.2 / 0.92,
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const rate = EXCHANGE_RATES[`${from}-${to}`];
  return rate ? amount * rate : amount;
}

/**
 * Generate trend data from historical monthly summaries.
 */
export function calculateTrends(
  monthlyData: Array<{ period: string; totalTrafficGB: number; totalCost: number }>,
): TrendData[] {
  return monthlyData.map((item, i) => ({
    period: item.period,
    totalTrafficGB: item.totalTrafficGB,
    totalCost: item.totalCost,
    changePercent: i > 0 && monthlyData[i - 1].totalCost > 0
      ? ((item.totalCost - monthlyData[i - 1].totalCost) / monthlyData[i - 1].totalCost) * 100
      : 0,
  }));
}

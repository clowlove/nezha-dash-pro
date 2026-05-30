// NezhaDash Pro - Billing & Traffic Types

export interface TrafficRecord {
  id: string;
  serverId: number;
  serverName: string;
  timestamp: number; // Unix ms
  upload: number;    // bytes
  download: number;  // bytes
  total: number;     // bytes
}

export interface TrafficSnapshot {
  serverId: number;
  timestamp: number;
  upload: number;
  download: number;
}

export interface TrafficSummary {
  serverId: number;
  serverName: string;
  period: 'hourly' | 'daily' | 'monthly';
  startTime: number;
  endTime: number;
  totalUpload: number;
  totalDownload: number;
  totalTraffic: number;
  peakUpload: number;
  peakDownload: number;
  avgUpload: number;
  avgDownload: number;
  recordCount: number;
}

export interface CostRate {
  uploadPerGB: number;
  downloadPerGB: number;
  totalPerGB: number;
  useDirectionalRates: boolean; // true = separate up/down, false = total only
}

export interface CostConfig {
  currency: Currency;
  rates: Record<Currency, CostRate>;
  billingCycleStart: number; // day of month (1-28)
  alertThresholds: AlertThresholds;
}

export type Currency = 'USD' | 'CNY' | 'EUR';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
};

export interface AlertThresholds {
  dailyTrafficGB: number;
  monthlyTrafficGB: number;
  monthlyCost: number;
  spikeMultiplier: number; // e.g. 3x average = spike
}

export interface BillingReport {
  id: string;
  type: 'monthly' | 'quarterly';
  periodStart: number;
  periodEnd: number;
  currency: Currency;
  totalCost: number;
  serverBreakdown: ServerCostEntry[];
  topConsumers: ServerCostEntry[];
  trends: TrendData[];
  generatedAt: number;
}

export interface ServerCostEntry {
  serverId: number;
  serverName: string;
  uploadGB: number;
  downloadGB: number;
  totalGB: number;
  cost: number;
  percentOfTotal: number;
}

export interface TrendData {
  period: string; // e.g. "2026-01", "2026-W01"
  totalTrafficGB: number;
  totalCost: number;
  changePercent: number;
}

export interface TrafficAlert {
  id: string;
  type: 'spike' | 'threshold_daily' | 'threshold_monthly' | 'cost_threshold';
  serverId: number;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

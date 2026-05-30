// Predictive analytics engine
// Linear regression for resource trends, capacity planning, disk full estimation, cost projection

import { getLogger } from '../core/logger';

// ── Types ─────────────────────────────────────────────────────────────────

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValue: number;
  predictedAt: number;
  slope: number;
  intercept: number;
  rSquared: number;
  confidence: 'high' | 'medium' | 'low';
  unit: string;
}

export interface CapacityPrediction {
  resource: string;
  currentUsage: number;
  totalCapacity: number;
  usagePercent: number;
  predictedFull: Date | null;      // null = never reaches full
  daysUntilFull: number | null;
  dailyGrowthRate: number;         // units per day
  recommendation: string;
}

export interface CostProjection {
  currentDailyCost: number;
  projectedMonthlyCost: number;
  projectedYearlyCost: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  savingsOpportunity: string | null;
}

// ── Linear regression ─────────────────────────────────────────────────────

function linearRegression(points: DataPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.value ?? 0, rSquared: 0 };

  // Normalize timestamps to days from first point
  const t0 = points[0].timestamp;
  const msPerDay = 86_400_000;
  const xs = points.map((p) => (p.timestamp - t0) / msPerDay);
  const ys = points.map((p) => p.value);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const sumY2 = ys.reduce((s, y) => s + y * y, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssTot += (ys[i] - yMean) ** 2;
    ssRes += (ys[i] - predicted) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

function classifyConfidence(rSquared: number, sampleCount: number): 'high' | 'medium' | 'low' {
  if (rSquared >= 0.85 && sampleCount >= 30) return 'high';
  if (rSquared >= 0.6 && sampleCount >= 10) return 'medium';
  return 'low';
}

// ── Predictor Engine ──────────────────────────────────────────────────────

export class Predictor {
  private logger = getLogger('predictor');

  /**
   * Predict a future value for a metric using linear regression.
   * @param metric   Metric name
   * @param data     Historical data points (sorted by timestamp)
   * @param daysAhead  How many days ahead to predict
   */
  predict(metric: string, data: DataPoint[], daysAhead: number): PredictionResult | null {
    if (data.length < 5) {
      this.logger.debug('predict.insufficient_data', { metric, count: data.length });
      return null;
    }

    const { slope, intercept, rSquared } = linearRegression(data);
    const t0 = data[0].timestamp;
    const msPerDay = 86_400_000;

    const currentDays = (data[data.length - 1].timestamp - t0) / msPerDay;
    const predictedDays = currentDays + daysAhead;

    const currentValue = data[data.length - 1].value;
    const predictedValue = Math.max(0, slope * predictedDays + intercept);

    return {
      metric,
      currentValue,
      predictedValue: Math.round(predictedValue * 100) / 100,
      predictedAt: Date.now() + daysAhead * msPerDay,
      slope,
      intercept,
      rSquared: Math.round(rSquared * 1000) / 1000,
      confidence: classifyConfidence(rSquared, data.length),
      unit: 'value',
    };
  }

  /**
   * Predict when a resource will reach full capacity.
   * @param resource    Resource name (e.g., 'disk', 'memory')
   * @param usageData   Historical usage data points
   * @param totalCapacity  Total available capacity
   */
  predictCapacity(resource: string, usageData: DataPoint[], totalCapacity: number): CapacityPrediction | null {
    if (usageData.length < 5) return null;

    const { slope, intercept, rSquared } = linearRegression(usageData);
    const t0 = usageData[0].timestamp;
    const msPerDay = 86_400_000;
    const currentDays = (usageData[usageData.length - 1].timestamp - t0) / msPerDay;
    const currentUsage = usageData[usageData.length - 1].value;
    const usagePercent = (currentUsage / totalCapacity) * 100;

    // Daily growth rate (in capacity units per day)
    const dailyGrowthRate = slope;

    let predictedFull: Date | null = null;
    let daysUntilFull: number | null = null;

    if (slope > 0) {
      // Days until usage reaches capacity
      const remainingCapacity = totalCapacity - currentUsage;
      daysUntilFull = remainingCapacity / slope;
      if (daysUntilFull > 0 && daysUntilFull < 3650) { // Max 10 years
        predictedFull = new Date(Date.now() + daysUntilFull * msPerDay);
      } else {
        daysUntilFull = null;
      }
    }

    const recommendation = this.generateCapacityRecommendation(
      resource, usagePercent, daysUntilFull, dailyGrowthRate, rSquared,
    );

    return {
      resource,
      currentUsage: Math.round(currentUsage * 100) / 100,
      totalCapacity,
      usagePercent: Math.round(usagePercent * 100) / 100,
      predictedFull,
      daysUntilFull: daysUntilFull ? Math.round(daysUntilFull) : null,
      dailyGrowthRate: Math.round(dailyGrowthRate * 1000) / 1000,
      recommendation,
    };
  }

  /**
   * Estimate disk full date from disk usage history.
   * Convenience wrapper around predictCapacity.
   */
  estimateDiskFull(diskUsagePercentHistory: DataPoint[], diskSizeGB: number): CapacityPrediction | null {
    // Convert percent to GB
    const gbData: DataPoint[] = diskUsagePercentHistory.map((dp) => ({
      timestamp: dp.timestamp,
      value: (dp.value / 100) * diskSizeGB,
    }));
    return this.predictCapacity('disk', gbData, diskSizeGB);
  }

  /**
   * Project costs from historical usage data.
   * @param dailyCosts  Array of { timestamp, value } where value = daily cost
   * @param daysAhead   Projection period (default: 30 for monthly)
   */
  projectCost(dailyCosts: DataPoint[], daysAhead: number = 30): CostProjection | null {
    if (dailyCosts.length < 7) return null;

    const { slope, rSquared } = linearRegression(dailyCosts);
    const recentValues = dailyCosts.slice(-7).map((d) => d.value);
    const currentDailyCost = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

    // Project future daily costs
    let projectedDailySum = 0;
    const t0 = dailyCosts[0].timestamp;
    const msPerDay = 86_400_000;
    const currentDays = (dailyCosts[dailyCosts.length - 1].timestamp - t0) / msPerDay;

    for (let d = 1; d <= daysAhead; d++) {
      const projected = slope * (currentDays + d) + linearRegression(dailyCosts).intercept;
      projectedDailySum += Math.max(0, projected);
    }

    const projectedMonthly = projectedDailySum;
    const projectedYearly = projectedMonthly * 12;

    // Determine trend
    const trendSlope = slope * msPerDay; // slope per millisecond * ms/day
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (Math.abs(trendSlope) < currentDailyCost * 0.01) {
      trend = 'stable';
    } else if (trendSlope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    const savingsOpportunity = this.generateCostSavingsTip(trend, slope, currentDailyCost);

    return {
      currentDailyCost: Math.round(currentDailyCost * 100) / 100,
      projectedMonthlyCost: Math.round(projectedMonthly * 100) / 100,
      projectedYearlyCost: Math.round(projectedYearly * 100) / 100,
      trend,
      savingsOpportunity,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private generateCapacityRecommendation(
    resource: string,
    usagePercent: number,
    daysUntilFull: number | null,
    dailyGrowth: number,
    rSquared: number,
  ): string {
    if (usagePercent >= 95) return `CRITICAL: ${resource} is at ${usagePercent.toFixed(1)}%. Immediate action required.`;
    if (usagePercent >= 85) return `WARNING: ${resource} is at ${usagePercent.toFixed(1)}%. Plan capacity increase soon.`;
    if (daysUntilFull !== null && daysUntilFull < 7) return `URGENT: ${resource} estimated full in ${Math.round(daysUntilFull)} days.`;
    if (daysUntilFull !== null && daysUntilFull < 30) return `${resource} projected full in ~${Math.round(daysUntilFull)} days. Consider scaling.`;
    if (daysUntilFull !== null && rSquared > 0.7) return `${resource} projected full in ~${Math.round(daysUntilFull)} days. Monitor trend.`;
    return `${resource} usage is healthy at ${usagePercent.toFixed(1)}%.`;
  }

  private generateCostSavingsTip(
    trend: 'increasing' | 'stable' | 'decreasing',
    dailySlope: number,
    currentDaily: number,
  ): string | null {
    if (trend === 'decreasing') return 'Cost trend is decreasing. Current usage patterns are efficient.';
    if (trend === 'stable') return null;

    const monthlyIncrease = dailySlope * 30;
    if (monthlyIncrease > currentDaily * 0.5) {
      return `Costs rising rapidly (+${(monthlyIncrease / currentDaily * 100).toFixed(0)}% projected monthly). Consider reviewing resource allocation and implementing auto-scaling limits.`;
    }
    return `Cost trend is increasing. Review resource allocation to optimize spending.`;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _predictor: Predictor | null = null;

export function getPredictor(): Predictor {
  if (!_predictor) _predictor = new Predictor();
  return _predictor;
}

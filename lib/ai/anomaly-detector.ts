// Statistical anomaly detection engine
// Z-score, IQR, moving average deviation, auto-threshold adjustment

import { getLogger } from '../core/logger';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  method: string;
  threshold: number;
  value: number;
  expected: { mean: number; stdDev?: number; median?: number; q1?: number; q3?: number };
  confidence: number; // 0–1
  timestamp: number;
}

export interface DetectionConfig {
  zScoreThreshold?: number;    // Default: 3.0
  iqrMultiplier?: number;      // Default: 1.5
  maWindow?: number;           // Moving average window size (default: 20)
  maDeviationThreshold?: number; // Default: 2.0
  minSamples?: number;         // Minimum data points required (default: 10)
  autoAdjust?: boolean;        // Auto-tune thresholds (default: true)
  ensembleMethod?: 'any' | 'majority' | 'all'; // How to combine detectors (default: 'majority')
}

interface AnomalyHistory {
  metric: string;
  timestamps: number[];
  values: number[];
  adaptiveZThreshold: number;
  adaptiveIqrMultiplier: number;
}

// ── Statistical helpers ───────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function median(sorted: number[]): number {
  return percentile(sorted, 50);
}

function movingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    result.push(mean(window));
  }
  return result;
}

function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return Math.abs(value - avg) / sd;
}

// ── Anomaly Detector ──────────────────────────────────────────────────────

export class AnomalyDetector {
  private config: Required<DetectionConfig>;
  private history = new Map<string, AnomalyHistory>();
  private logger = getLogger('anomaly-detector');

  constructor(config?: DetectionConfig) {
    this.config = {
      zScoreThreshold: config?.zScoreThreshold ?? 3.0,
      iqrMultiplier: config?.iqrMultiplier ?? 1.5,
      maWindow: config?.maWindow ?? 20,
      maDeviationThreshold: config?.maDeviationThreshold ?? 2.0,
      minSamples: config?.minSamples ?? 10,
      autoAdjust: config?.autoAdjust ?? true,
      ensembleMethod: config?.ensembleMethod ?? 'majority',
    };
  }

  /**
   * Ingest a data point and check for anomalies.
   * Returns null if insufficient history.
   */
  ingest(metric: string, value: number, timestamp?: number): AnomalyResult | null {
    let hist = this.history.get(metric);
    if (!hist) {
      hist = {
        metric,
        timestamps: [],
        values: [],
        adaptiveZThreshold: this.config.zScoreThreshold,
        adaptiveIqrMultiplier: this.config.iqrMultiplier,
      };
      this.history.set(metric, hist);
    }

    hist.timestamps.push(timestamp ?? Date.now());
    hist.values.push(value);

    // Keep a rolling window of 1000 points
    if (hist.values.length > 1000) {
      hist.timestamps = hist.timestamps.slice(-1000);
      hist.values = hist.values.slice(-1000);
    }

    if (hist.values.length < this.config.minSamples) return null;

    const results = [
      this.detectZScore(hist, value),
      this.detectIQR(hist, value),
      this.detectMovingAverage(hist, value),
    ];

    // Ensemble decision
    const anomalyCount = results.filter((r) => r.isAnomaly).length;
    const threshold =
      this.config.ensembleMethod === 'any' ? 1 :
      this.config.ensembleMethod === 'all' ? results.length :
      Math.ceil(results.length / 2);

    const isAnomaly = anomalyCount >= threshold;

    // Auto-adjust thresholds
    if (this.config.autoAdjust) {
      this.adjustThresholds(hist, isAnomaly);
    }

    // Best score from anomaly detectors
    const bestResult = results.reduce((best, r) =>
      r.score > best.score ? r : best,
    );

    const result: AnomalyResult = {
      isAnomaly,
      score: bestResult.score,
      method: bestResult.method,
      threshold: bestResult.threshold,
      value,
      expected: bestResult.expected,
      confidence: anomalyCount / results.length,
      timestamp: timestamp ?? Date.now(),
    };

    if (isAnomaly) {
      this.logger.warn('anomaly.detected', {
        metric,
        value,
        score: result.score,
        confidence: result.confidence,
        method: result.method,
      });
    }

    return result;
  }

  /** Get the current baseline statistics for a metric */
  getBaseline(metric: string): { mean: number; stdDev: number; median: number; count: number } | null {
    const hist = this.history.get(metric);
    if (!hist || hist.values.length < this.config.minSamples) return null;

    const sorted = [...hist.values].sort((a, b) => a - b);
    return {
      mean: mean(hist.values),
      stdDev: stdDev(hist.values),
      median: median(sorted),
      count: hist.values.length,
    };
  }

  /** Get adaptive thresholds for a metric */
  getThresholds(metric: string): { zScore: number; iqr: number; ma: number } | null {
    const hist = this.history.get(metric);
    if (!hist) return null;
    return {
      zScore: hist.adaptiveZThreshold,
      iqr: hist.adaptiveIqrMultiplier,
      ma: this.config.maDeviationThreshold,
    };
  }

  /** Clear history for a metric */
  reset(metric: string): void {
    this.history.delete(metric);
  }

  /** Clear all history */
  resetAll(): void {
    this.history.clear();
  }

  /** Get all tracked metric names */
  metrics(): string[] {
    return Array.from(this.history.keys());
  }

  // ── Detection methods ───────────────────────────────────────────────────

  private detectZScore(hist: AnomalyHistory, value: number): AnomalyResult {
    const avg = mean(hist.values);
    const sd = stdDev(hist.values, avg);
    const score = zScore(value, avg, sd);
    const threshold = hist.adaptiveZThreshold;

    return {
      isAnomaly: score > threshold,
      score,
      method: 'z-score',
      threshold,
      value,
      expected: { mean: avg, stdDev: sd },
      confidence: Math.min(1, score / (threshold * 2)),
      timestamp: Date.now(),
    };
  }

  private detectIQR(hist: AnomalyHistory, value: number): AnomalyResult {
    const sorted = [...hist.values].sort((a, b) => a - b);
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);
    const iqr = q3 - q1;
    const multiplier = hist.adaptiveIqrMultiplier;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    const distance = value < lowerBound
      ? lowerBound - value
      : value > upperBound
        ? value - upperBound
        : 0;
    const score = iqr > 0 ? distance / iqr : 0;

    return {
      isAnomaly: value < lowerBound || value > upperBound,
      score,
      method: 'iqr',
      threshold: multiplier,
      value,
      expected: { mean: mean(hist.values), median: median(sorted), q1, q3 },
      confidence: Math.min(1, score / (multiplier * 2)),
      timestamp: Date.now(),
    };
  }

  private detectMovingAverage(hist: AnomalyHistory, value: number): AnomalyResult {
    const ma = movingAverage(hist.values, this.config.maWindow);
    const lastMa = ma[ma.length - 1];

    // Calculate standard deviation of deviations from MA
    const deviations = hist.values.map((v, i) => Math.abs(v - ma[i]));
    const avgDeviation = mean(deviations);
    const sdDeviation = stdDev(deviations, avgDeviation);

    const currentDeviation = Math.abs(value - lastMa);
    const score = sdDeviation > 0 ? currentDeviation / sdDeviation : 0;
    const threshold = this.config.maDeviationThreshold;

    return {
      isAnomaly: score > threshold,
      score,
      method: 'moving-average',
      threshold,
      value,
      expected: { mean: lastMa, stdDev: avgDeviation },
      confidence: Math.min(1, score / (threshold * 2)),
      timestamp: Date.now(),
    };
  }

  // ── Auto-threshold adjustment ───────────────────────────────────────────

  private adjustThresholds(hist: AnomalyHistory, wasAnomaly: boolean): void {
    const recentCount = Math.min(100, hist.values.length);
    const recentValues = hist.values.slice(-recentCount);
    const anomalyRate = this.estimateAnomalyRate(hist);

    // Target anomaly rate: 1–5% (adjust thresholds to hit this range)
    const targetRate = 0.03;
    const tolerance = 0.02;

    if (anomalyRate > targetRate + tolerance) {
      // Too many anomalies — widen thresholds
      hist.adaptiveZThreshold = Math.min(5, hist.adaptiveZThreshold + 0.1);
      hist.adaptiveIqrMultiplier = Math.min(3, hist.adaptiveIqrMultiplier + 0.05);
    } else if (anomalyRate < targetRate - tolerance) {
      // Too few anomalies — tighten thresholds
      hist.adaptiveZThreshold = Math.max(2, hist.adaptiveZThreshold - 0.05);
      hist.adaptiveIqrMultiplier = Math.max(1, hist.adaptiveIqrMultiplier - 0.02);
    }
  }

  private estimateAnomalyRate(hist: AnomalyHistory): number {
    const window = Math.min(200, hist.values.length);
    const recentValues = hist.values.slice(-window);
    const avg = mean(recentValues);
    const sd = stdDev(recentValues, avg);

    if (sd === 0) return 0;

    let anomalies = 0;
    for (const v of recentValues) {
      if (zScore(v, avg, sd) > hist.adaptiveZThreshold) anomalies++;
    }
    return anomalies / window;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _detector: AnomalyDetector | null = null;

export function getAnomalyDetector(): AnomalyDetector {
  if (!_detector) _detector = new AnomalyDetector();
  return _detector;
}

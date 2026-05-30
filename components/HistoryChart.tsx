'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Brush,
} from 'recharts';

interface DataPoint {
  timestamp: number;
  min: number;
  max: number;
  avg: number;
  last: number;
  count: number;
}

interface HistoryChartProps {
  serverId: string;
  metric: string;
  title?: string;
  unit?: string;
  color?: string;
  showRange?: boolean;
  showBrush?: boolean;
  height?: number;
  className?: string;
}

type TimeRangeKey = '1h' | '24h' | '7d' | '30d';

const TIME_RANGES: Record<TimeRangeKey, { label: string; value: string }> = {
  '1h': { label: '1 Hour', value: '1h' },
  '24h': { label: '24 Hours', value: '24h' },
  '7d': { label: '7 Days', value: '7d' },
  '30d': { label: '30 Days', value: '30d' },
};

export default function HistoryChart({
  serverId,
  metric,
  title,
  unit = '',
  color = '#3b82f6',
  showRange = true,
  showBrush = false,
  height = 300,
  className = '',
}: HistoryChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>('24h');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMin, setShowMin] = useState(false);
  const [showMax, setShowMax] = useState(false);
  const [showAvg, setShowAvg] = useState(true);
  const [showLast, setShowLast] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        serverId,
        metric,
        range: TIME_RANGES[selectedRange].value,
        limit: '500',
      });

      const response = await fetch(`/api/history?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [serverId, metric, selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s for recent ranges
  useEffect(() => {
    if (selectedRange === '1h' || selectedRange === '24h') {
      const interval = setInterval(fetchData, 30_000);
      return () => clearInterval(interval);
    }
  }, [selectedRange, fetchData]);

  const chartData = useMemo(() => {
    return data.map(point => ({
      time: new Date(point.timestamp).toLocaleString(),
      timestamp: point.timestamp,
      Min: point.min,
      Max: point.max,
      Avg: Math.round(point.avg * 100) / 100,
      Last: point.last,
      Count: point.count,
    }));
  }, [data]);

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(unit ? 1 : 0);
  };

  const formatTooltipValue = (value: number) => {
    return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
  };

  const displayTitle = title || `${metric} - Server ${serverId}`;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {displayTitle}
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Time Range Selector */}
      {showRange && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex rounded-md shadow-sm">
            {Object.entries(TIME_RANGES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setSelectedRange(key as TimeRangeKey)}
                className={`px-3 py-1.5 text-sm font-medium border ${
                  selectedRange === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                } ${key === '1h' ? 'rounded-l-md' : ''} ${key === '30d' ? 'rounded-r-md' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Series toggles */}
          <div className="flex gap-3 ml-auto text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showMin} onChange={e => setShowMin(e.target.checked)} className="rounded" />
              <span className="text-gray-600 dark:text-gray-400">Min</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showAvg} onChange={e => setShowAvg(e.target.checked)} className="rounded" />
              <span className="text-gray-600 dark:text-gray-400">Avg</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showMax} onChange={e => setShowMax(e.target.checked)} className="rounded" />
              <span className="text-gray-600 dark:text-gray-400">Max</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={showLast} onChange={e => setShowLast(e.target.checked)} className="rounded" />
              <span className="text-gray-600 dark:text-gray-400">Last</span>
            </label>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}

      {/* Chart */}
      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400" style={{ height }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(val: string) => {
                const d = new Date(val);
                return selectedRange === '1h'
                  ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={formatYAxis}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
              formatter={(value: number, name: string) => [formatTooltipValue(value), name]}
              labelFormatter={(label: string) => new Date(label).toLocaleString()}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            {showMin && (
              <Area
                type="monotone"
                dataKey="Min"
                stroke="#22c55e"
                fill="none"
                strokeWidth={1}
                dot={false}
              />
            )}
            {showAvg && (
              <Area
                type="monotone"
                dataKey="Avg"
                stroke={color}
                fill={`url(#gradient-${metric})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {showMax && (
              <Area
                type="monotone"
                dataKey="Max"
                stroke="#f59e0b"
                fill="none"
                strokeWidth={1}
                dot={false}
              />
            )}
            {showLast && (
              <Area
                type="monotone"
                dataKey="Last"
                stroke="#8b5cf6"
                fill="none"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {showBrush && <Brush dataKey="time" height={30} stroke={color} />}
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Footer info */}
      {data.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
          {data.length} data points · Last updated: {new Date(data[data.length - 1]?.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

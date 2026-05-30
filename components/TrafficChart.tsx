'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrafficDataPoint {
  timestamp: number;
  upload: number;
  download: number;
}

interface TrafficChartProps {
  serverId: number;
  className?: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

const RANGE_OPTIONS: { label: string; value: TimeRange; ms: number }[] = [
  { label: '24h', value: '24h', ms: 86400000 },
  { label: '7d', value: '7d', ms: 86400000 * 7 },
  { label: '30d', value: '30d', ms: 86400000 * 30 },
  { label: '90d', value: '90d', ms: 86400000 * 90 },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  return `${(bytes / Math.pow(1024, idx)).toFixed(2)} ${units[idx]}`;
}

function formatTimestamp(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  if (range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active, payload, label, range,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  range: TimeRange;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {label ? formatTimestamp(label, range) : ''}
      </p>
      {payload.map((item, i) => (
        <p key={i} className="text-sm" style={{ color: item.color }}>
          {item.name}: {formatBytes(item.value)}
        </p>
      ))}
      <p className="text-sm font-semibold mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
        Total: {formatBytes(payload.reduce((s, p) => s + p.value, 0))}
      </p>
    </div>
  );
}

export default function TrafficChart({ serverId, className }: TrafficChartProps) {
  const [range, setRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<TrafficDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const endTime = Date.now();
        const rangeOpt = RANGE_OPTIONS.find(r => r.value === range)!;
        const startTime = endTime - rangeOpt.ms;
        const res = await fetch(
          `/api/billing?action=hourly&serverId=${serverId}&startTime=${startTime}&endTime=${endTime}`,
        );
        if (!res.ok) throw new Error('Failed to fetch traffic data');
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [serverId, range]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      time: formatTimestamp(d.timestamp, range),
    }));
  }, [data, range]);

  const totalUpload = useMemo(() => data.reduce((s, d) => s + d.upload, 0), [data]);
  const totalDownload = useMemo(() => data.reduce((s, d) => s + d.download, 0), [data]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Traffic</CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ↑ {formatBytes(totalUpload)} &nbsp; ↓ {formatBytes(totalDownload)}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={range === opt.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Loading traffic data...
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No traffic data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) => formatTimestamp(ts, range)}
                className="text-xs"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                tickFormatter={(v) => formatBytes(v)}
                className="text-xs"
                tick={{ fill: '#9ca3af' }}
                width={80}
              />
              <Tooltip content={<CustomTooltip range={range} />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="upload"
                name="Upload"
                stroke="#3b82f6"
                fill="url(#uploadGrad)"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="download"
                name="Download"
                stroke="#10b981"
                fill="url(#downloadGrad)"
                strokeWidth={2}
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

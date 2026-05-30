'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ServerSeries {
  serverId: string;
  serverName: string;
  color: string;
  data: Array<{ timestamp: number; value: number }>;
}

interface ComparisonChartProps {
  servers: ServerSeries[];
  title?: string;
  metric?: string;
  unit?: string;
  height?: number;
  showDifference?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function SyncTooltip({
  active,
  payload,
  label,
  unit,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const values = payload.map((p) => p.value).filter((v) => v !== undefined);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const diff = maxVal - minVal;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm py-0.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[100px]">{item.name}</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white tabular-nums">
            {valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString()}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between text-xs">
          <span className="text-muted-foreground">Difference</span>
          <span className={cn('font-medium tabular-nums', diff > maxVal * 0.5 ? 'text-red-500' : 'text-muted-foreground')}>
            {valueFormatter ? valueFormatter(diff) : diff.toLocaleString()}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ComparisonChart({
  servers,
  title = 'Server Comparison',
  metric,
  unit,
  height = 350,
  showDifference = true,
  valueFormatter,
  className,
}: ComparisonChartProps) {
  const [selectedServers, setSelectedServers] = useState<Set<string>>(
    () => new Set(servers.map((s) => s.serverId)),
  );

  const toggleServer = useCallback((serverId: string) => {
    setSelectedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        if (next.size > 1) next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  }, []);

  // Merge all timestamps and build unified data
  const chartData = useMemo(() => {
    const allTimestamps = new Set<number>();
    for (const server of servers) {
      if (selectedServers.has(server.serverId)) {
        for (const point of server.data) {
          allTimestamps.add(point.timestamp);
        }
      }
    }

    const sorted = Array.from(allTimestamps).sort((a, b) => a - b);
    const serverMaps = new Map<string, Map<number, number>>();

    for (const server of servers) {
      const map = new Map<number, number>();
      for (const point of server.data) {
        map.set(point.timestamp, point.value);
      }
      serverMaps.set(server.serverId, map);
    }

    return sorted.map((ts) => {
      const entry: Record<string, unknown> = {
        timestamp: ts,
        time: new Date(ts).toLocaleString(),
      };
      for (const server of servers) {
        if (selectedServers.has(server.serverId)) {
          const map = serverMaps.get(server.serverId)!;
          entry[server.serverName] = map.get(ts) ?? null;
        }
      }
      return entry;
    });
  }, [servers, selectedServers]);

  const activeServers = useMemo(
    () => servers.filter((s) => selectedServers.has(s.serverId)),
    [servers, selectedServers],
  );

  // Compute stats for difference highlight
  const stats = useMemo(() => {
    if (!showDifference || activeServers.length < 2) return null;
    const avgValues = activeServers.map((s) => {
      const vals = s.data.map((d) => d.value).filter((v) => v !== undefined);
      return {
        serverId: s.serverId,
        serverName: s.serverName,
        avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
        max: vals.length > 0 ? Math.max(...vals) : 0,
        min: vals.length > 0 ? Math.min(...vals) : 0,
      };
    });
    return avgValues;
  }, [activeServers, showDifference]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {title}
            {metric && <span className="text-xs text-muted-foreground ml-2">({metric})</span>}
          </CardTitle>
        </div>
        {/* Server toggle buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {servers.map((server) => (
            <Button
              key={server.serverId}
              variant={selectedServers.has(server.serverId) ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => toggleServer(server.serverId)}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: server.color }}
              />
              {server.serverName}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
            No data available for comparison
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} />
                <Tooltip content={<SyncTooltip unit={unit} valueFormatter={valueFormatter} />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                {activeServers.map((server) => (
                  <Line
                    key={server.serverId}
                    type="monotone"
                    dataKey={server.serverName}
                    stroke={server.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Stats comparison table */}
            {stats && (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {['avg', 'max', 'min'].map((stat) => (
                  <div key={stat} className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                    <p className="text-muted-foreground capitalize mb-1">{stat}</p>
                    {stats.map((s) => (
                      <p key={s.serverId} className="font-medium tabular-nums" style={{ color: activeServers.find((as) => as.serverId === s.serverId)?.color }}>
                        {valueFormatter
                          ? valueFormatter(s[stat as keyof typeof s] as number)
                          : (s[stat as keyof typeof s] as number).toFixed(1)}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Currency = 'USD' | 'CNY' | 'EUR';

interface ServerCostEntry {
  serverId: number;
  serverName: string;
  uploadGB: number;
  downloadGB: number;
  totalGB: number;
  cost: number;
  percentOfTotal: number;
}

interface CostEstimate {
  currentCost: number;
  projectedCost: number;
  daysElapsed: number;
  daysInMonth: number;
}

interface MultiCurrencyCost {
  USD: number;
  CNY: number;
  EUR: number;
}

interface CostData {
  config: { currency: Currency };
  month: { year: number; month: number };
  breakdown: ServerCostEntry[];
  estimate: CostEstimate;
  multiCurrency: MultiCurrencyCost;
}

interface CostSummaryProps {
  className?: string;
}

const CURRENCY_INFO: Record<Currency, { symbol: string; label: string }> = {
  USD: { symbol: '$', label: 'USD' },
  CNY: { symbol: '¥', label: 'CNY' },
  EUR: { symbol: '€', label: 'EUR' },
};

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function formatGB(gb: number): string {
  if (gb < 0.01) return '< 0.01 GB';
  if (gb < 1) return `${gb.toFixed(2)} GB`;
  return `${gb.toFixed(1)} GB`;
}

function formatCost(amount: number, currency: Currency): string {
  const { symbol } = CURRENCY_INFO[currency];
  return `${symbol}${amount.toFixed(2)}`;
}

export default function CostSummary({ className }: CostSummaryProps) {
  const [data, setData] = useState<CostData | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCostData() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const res = await fetch(
          `/api/billing?action=cost&year=${now.getFullYear()}&month=${now.getMonth() + 1}&currency=${currency}`,
        );
        if (!res.ok) throw new Error('Failed to fetch cost data');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCostData();
    return () => { cancelled = true; };
  }, [currency]);

  const pieData = useMemo(() => {
    if (!data?.breakdown) return [];
    return data.breakdown.slice(0, 8).map(entry => ({
      name: entry.serverName,
      value: entry.cost,
      percent: entry.percentOfTotal,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="h-[200px] flex items-center justify-center text-gray-400">
            Loading cost data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="h-[200px] flex items-center justify-center text-red-500">
            {error ?? 'No cost data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { estimate, multiCurrency, breakdown, month } = data;
  const monthName = new Date(month.year, month.month - 1).toLocaleString('default', { month: 'long' });
  const progressPercent = estimate.daysElapsed > 0
    ? (estimate.daysElapsed / estimate.daysInMonth) * 100
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Cost Summary</CardTitle>
        <div className="flex gap-1">
          {(Object.keys(CURRENCY_INFO) as Currency[]).map(c => (
            <Button
              key={c}
              variant={currency === c ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrency(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current month header */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {monthName} {month.year} — Day {estimate.daysElapsed} of {estimate.daysInMonth}
        </div>

        {/* Cost cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current Cost</p>
            <p className="text-2xl font-bold mt-1">
              {formatCost(estimate.currentCost, currency)}
            </p>
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Projected Cost</p>
            <p className="text-2xl font-bold mt-1">
              {formatCost(estimate.projectedCost, currency)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              by end of {monthName}
            </p>
          </div>
        </div>

        {/* Multi-currency preview */}
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
          {(Object.keys(CURRENCY_INFO) as Currency[])
            .filter(c => c !== currency)
            .map(c => (
              <span key={c}>
                ≈ {formatCost(multiCurrency[c], c)}
              </span>
            ))}
        </div>

        {/* Server breakdown with pie chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Per-Server Breakdown</h4>
          {breakdown.length > 0 ? (
            <div className="flex gap-4">
              {/* Pie */}
              <div className="w-[140px] h-[140px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCost(value, currency)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* List */}
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {breakdown.slice(0, 6).map((entry, i) => (
                  <div key={entry.serverId} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate flex-1">{entry.serverName}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatCost(entry.cost, currency)}
                    </span>
                    <span className="text-xs text-gray-400 w-12 text-right flex-shrink-0">
                      {entry.percentOfTotal.toFixed(0)}%
                    </span>
                  </div>
                ))}
                {breakdown.length > 6 && (
                  <p className="text-xs text-gray-400 pl-4">
                    +{breakdown.length - 6} more servers
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No server data for this month</p>
          )}
        </div>

        {/* Traffic totals */}
        <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-3">
          Total traffic: {formatGB(breakdown.reduce((s, e) => s + e.totalGB, 0))} across{' '}
          {breakdown.length} server{breakdown.length !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
}

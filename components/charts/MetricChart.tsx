'use client';

import React, { useMemo, useId } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ChartType = 'area' | 'line' | 'bar';

export interface SeriesConfig {
  dataKey: string;
  label?: string;
  color: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

interface MetricChartProps {
  data: Record<string, unknown>[];
  series: SeriesConfig[];
  type?: ChartType;
  title?: string;
  description?: string;
  xAxisKey?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  gradientFill?: boolean;
  stacked?: boolean;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
  className?: string;
}

function DefaultTooltip({
  active,
  payload,
  label,
  unit,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-gray-600 dark:text-gray-300">{item.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {valueFormatter ? valueFormatter(item.value) : item.value.toLocaleString()}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MetricChart({
  data,
  series,
  type = 'area',
  title,
  description,
  xAxisKey = 'time',
  xAxisLabel,
  yAxisLabel,
  unit,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  gradientFill = true,
  stacked = false,
  valueFormatter,
  labelFormatter,
  className,
}: MetricChartProps) {
  const uniqueId = useId().replace(/:/g, '');

  const chartContent = useMemo(() => {
    const commonProps = {
      data,
      margin: { top: 5, right: 20, left: 10, bottom: 5 },
    };

    const axisProps = {
      xAxis: (
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={labelFormatter}
          label={
            xAxisLabel
              ? { value: xAxisLabel, position: 'insideBottomRight', offset: -5, fontSize: 11, fill: '#9ca3af' }
              : undefined
          }
        />
      ),
      yAxis: (
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={60}
          label={
            yAxisLabel
              ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }
              : undefined
          }
        />
      ),
      grid: showGrid ? <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} /> : null,
      tooltip: showTooltip ? (
        <Tooltip content={<DefaultTooltip unit={unit} valueFormatter={valueFormatter} />} />
      ) : null,
      legend: showLegend ? <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} /> : null,
    };

    const renderGradients = () =>
      gradientFill ? (
        <defs>
          {series.map((s) => (
            <linearGradient
              key={`grad-${s.dataKey}-${uniqueId}`}
              id={`grad-${s.dataKey}-${uniqueId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={s.color} stopOpacity={s.fillOpacity ?? 0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
      ) : null;

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          {renderGradients()}
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.tooltip}
          {axisProps.legend}
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label || s.dataKey}
              stroke={s.color}
              fill={gradientFill ? `url(#grad-${s.dataKey}-${uniqueId})` : s.color}
              fillOpacity={gradientFill ? 1 : s.fillOpacity ?? 0.3}
              strokeWidth={s.strokeWidth ?? 2}
              dot={false}
              activeDot={{ r: 4 }}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      );
    }

    if (type === 'line') {
      return (
        <LineChart {...commonProps}>
          {axisProps.grid}
          {axisProps.xAxis}
          {axisProps.yAxis}
          {axisProps.tooltip}
          {axisProps.legend}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label || s.dataKey}
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      );
    }

    // Bar chart
    return (
      <BarChart {...commonProps}>
        {axisProps.grid}
        {axisProps.xAxis}
        {axisProps.yAxis}
        {axisProps.tooltip}
        {axisProps.legend}
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.label || s.dataKey}
            fill={s.color}
            fillOpacity={s.fillOpacity ?? 0.85}
            stackId={stacked ? 'stack' : undefined}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    );
  }, [
    data, series, type, xAxisKey, xAxisLabel, yAxisLabel, showGrid, showLegend,
    showTooltip, gradientFill, stacked, unit, valueFormatter, labelFormatter, uniqueId,
  ]);

  const chartCard = (
    <Card className={cn('', className)}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-base font-medium">{title}</CardTitle>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent className={title || description ? 'pt-0' : ''}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {chartContent}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );

  return chartCard;
}

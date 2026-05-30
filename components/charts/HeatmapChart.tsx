'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  title?: string;
  description?: string;
  colorScale?: string[];
  maxValue?: number;
  minValue?: number;
  cellSize?: number;
  cellGap?: number;
  showLabels?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const DEFAULT_COLORS = [
  'rgba(34, 197, 94, 0.08)',  // very faint green
  'rgba(34, 197, 94, 0.2)',   // light green
  'rgba(34, 197, 94, 0.4)',   // medium green
  'rgba(34, 197, 94, 0.65)',  // green
  'rgba(34, 197, 94, 0.9)',   // strong green
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColorIndex(value: number, min: number, max: number, scaleLength: number): number {
  if (max <= min) return 0;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return Math.min(Math.floor(normalized * scaleLength), scaleLength - 1);
}

function generateYearDates(year: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HeatmapChart({
  data,
  title = 'Activity Heatmap',
  description,
  colorScale = DEFAULT_COLORS,
  maxValue,
  minValue = 0,
  cellSize = 13,
  cellGap = 3,
  showLabels = true,
  valueFormatter,
  className,
}: HeatmapChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
  } | null>(null);

  // Build lookup map
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const point of data) {
      map.set(point.date, point.value);
    }
    return map;
  }, [data]);

  // Determine year from data or use current
  const year = useMemo(() => {
    if (data.length > 0) {
      return parseInt(data[0].date.substring(0, 4), 10);
    }
    return new Date().getFullYear();
  }, [data]);

  const max = useMemo(() => {
    if (maxValue !== undefined) return maxValue;
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data, maxValue]);

  // Generate weeks grid
  const { weeks, monthLabels } = useMemo(() => {
    const dates = generateYearDates(year);
    const weeksArr: Array<Array<{ date: Date; value: number | null; key: string }>> = [];
    let currentWeek: Array<{ date: Date; value: number | null; key: string }> = [];

    // Pad first week with empty cells
    const firstDay = dates[0].getDay();
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: new Date(0), value: null, key: `pad-${i}` });
    }

    const monthLabelPositions: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (const date of dates) {
      const key = formatDateKey(date);
      const value = dataMap.get(key) ?? null;

      if (date.getDay() === 0 && currentWeek.length > 0) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }

      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabelPositions.push({ month: MONTHS[month], weekIndex: weeksArr.length });
        lastMonth = month;
      }

      currentWeek.push({ date, value, key });
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    return { weeks: weeksArr, monthLabels: monthLabelPositions };
  }, [year, dataMap]);

  const totalWidth = weeks.length * (cellSize + cellGap) + 40;
  const totalHeight = 7 * (cellSize + cellGap) + (showLabels ? 30 : 10);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            {colorScale.map((color, i) => (
              <span
                key={i}
                className="rounded-sm"
                style={{
                  backgroundColor: color,
                  width: cellSize,
                  height: cellSize,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 overflow-x-auto">
        <div className="relative">
          <svg
            width={totalWidth}
            height={totalHeight}
            className="select-none"
          >
            {/* Month labels */}
            {showLabels &&
              monthLabels.map((label, i) => (
                <text
                  key={i}
                  x={40 + label.weekIndex * (cellSize + cellGap)}
                  y={12}
                  fontSize={11}
                  fill="#9ca3af"
                >
                  {label.month}
                </text>
              ))}

            {/* Day labels */}
            {showLabels &&
              [1, 3, 5].map((dayIdx) => (
                <text
                  key={dayIdx}
                  x={0}
                  y={(showLabels ? 26 : 6) + dayIdx * (cellSize + cellGap) + cellSize / 2 + 4}
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {DAYS[dayIdx]}
                </text>
              ))}

            {/* Cells */}
            {weeks.map((week, weekIdx) =>
              week.map((cell, dayIdx) => {
                if (cell.value === null) return null;

                const colorIdx =
                  cell.value === 0
                    ? 0
                    : getColorIndex(cell.value, minValue, max, colorScale.length);

                return (
                  <rect
                    key={cell.key}
                    x={40 + weekIdx * (cellSize + cellGap)}
                    y={(showLabels ? 22 : 2) + dayIdx * (cellSize + cellGap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    ry={2}
                    fill={colorScale[colorIdx]}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
                      if (parentRect) {
                        setTooltip({
                          x: rect.left - parentRect.left + cellSize / 2,
                          y: rect.top - parentRect.top - 8,
                          date: cell.key,
                          value: cell.value!,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              }),
            )}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-10 pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span className="font-medium">
                {valueFormatter ? valueFormatter(tooltip.value) : tooltip.value}
              </span>
              <span className="opacity-70 ml-1">on {tooltip.date}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

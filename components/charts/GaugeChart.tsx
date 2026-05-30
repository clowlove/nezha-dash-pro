'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  max?: number;
  min?: number;
  title?: string;
  label?: string;
  unit?: string;
  size?: number;
  strokeWidth?: number;
  zones?: { threshold: number; color: string }[];
  animated?: boolean;
  className?: string;
}

const DEFAULT_ZONES = [
  { threshold: 60, color: '#22c55e' },   // green
  { threshold: 85, color: '#f59e0b' },   // yellow/amber
  { threshold: 100, color: '#ef4444' },  // red
];

function getZoneColor(percent: number, zones: { threshold: number; color: string }[]): string {
  for (const zone of zones) {
    if (percent <= zone.threshold) return zone.color;
  }
  return zones[zones.length - 1].color;
}

export default function GaugeChart({
  value,
  max = 100,
  min = 0,
  title,
  label,
  unit = '%',
  size = 140,
  strokeWidth = 10,
  zones = DEFAULT_ZONES,
  animated = true,
  className,
}: GaugeChartProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = getZoneColor(percent, zones);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // degrees from top
  const endAngle = 405; // 135 + 270 degrees arc
  const arcLength = ((endAngle - startAngle) / 360) * circumference;
  const center = size / 2;

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const duration = 800;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - (1 - progress) ** 3;
      const current = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [value, animated]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayPercent = ((displayValue - min) / (max - min)) * 100;
  const arcProgress = (Math.min(displayPercent, 100) / 100) * arcLength;
  const dashOffset = arcLength - arcProgress;
  const displayColor = getZoneColor(displayPercent, zones);

  const gauge = (
    <svg width={size} height={size} className="select-none">
      {/* Background arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-gray-200 dark:text-gray-700"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startAngle} ${center} ${center})`}
      />
      {/* Value arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={displayColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(${startAngle} ${center} ${center})`}
        style={{
          transition: animated ? 'stroke-dashoffset 0.3s ease' : 'none',
          filter: `drop-shadow(0 0 4px ${displayColor}40)`,
        }}
      />
      {/* Center value */}
      <text
        x={center}
        y={center - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-900 dark:fill-white font-bold tabular-nums"
        fontSize={size * 0.18}
      >
        {displayValue.toFixed(1)}
      </text>
      {/* Unit */}
      <text
        x={center}
        y={center + size * 0.12}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground"
        fontSize={size * 0.1}
      >
        {unit}
      </text>
      {/* Label */}
      {label && (
        <text
          x={center}
          y={center + size * 0.25}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize={size * 0.085}
        >
          {label}
        </text>
      )}
      {/* Min/Max markers */}
      <text
        x={center + radius * Math.cos(((startAngle - 90) * Math.PI) / 180)}
        y={center + radius * Math.sin(((startAngle - 90) * Math.PI) / 180) + strokeWidth + 8}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={9}
      >
        {min}
      </text>
      <text
        x={center + radius * Math.cos(((endAngle - 90) * Math.PI) / 180)}
        y={center + radius * Math.sin(((endAngle - 90) * Math.PI) / 180) + strokeWidth + 8}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={9}
      >
        {max}
      </text>
    </svg>
  );

  if (!title) {
    return <div className={cn('inline-flex flex-col items-center', className)}>{gauge}</div>;
  }

  return (
    <Card className={cn('flex flex-col items-center', className)}>
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-sm font-medium text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center pb-4 pt-0">
        {gauge}
      </CardContent>
    </Card>
  );
}

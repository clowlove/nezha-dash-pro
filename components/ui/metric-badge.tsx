'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

type Trend = 'up' | 'down' | 'stable';

interface MetricBadgeProps {
  label: string;
  value: number;
  previousValue?: number;
  prefix?: string;
  suffix?: string;
  trend?: Trend;
  trendValue?: string;
  sparkline?: number[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'auto' | 'green' | 'red' | 'blue' | 'amber' | 'purple';
  animate?: boolean;
}

const sizeConfig = {
  sm: { value: 'text-xl', label: 'text-xs', badge: 'px-2 py-1', sparkH: 20 },
  md: { value: 'text-2xl', label: 'text-sm', badge: 'px-3 py-1.5', sparkH: 28 },
  lg: { value: 'text-3xl', label: 'text-sm', badge: 'px-4 py-2', sparkH: 36 },
};

const trendIcons: Record<Trend, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
};

const trendColors: Record<Trend, string> = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  stable: 'text-slate-400',
};

const colorThemes = {
  auto: '',
  green: 'border-emerald-500/20 bg-emerald-500/5',
  red: 'border-red-500/20 bg-red-500/5',
  blue: 'border-blue-500/20 bg-blue-500/5',
  amber: 'border-amber-500/20 bg-amber-500/5',
  purple: 'border-purple-500/20 bg-purple-500/5',
};

function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration, inView]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

function Sparkline({ data, width = 80, height = 28, color }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
      />
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkGrad)"
        opacity="0.15"
      />
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color || 'currentColor'} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MetricBadge({
  label,
  value,
  previousValue,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
  sparkline,
  className,
  size = 'md',
  color = 'auto',
  animate = true,
}: MetricBadgeProps) {
  const config = sizeConfig[size];
  const autoTrend: Trend = trend ?? (previousValue != null ? (value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable') : 'stable');
  const autoColor = color === 'auto' ? (autoTrend === 'up' ? 'green' : autoTrend === 'down' ? 'red' : 'blue') : color;

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-3 rounded-xl border backdrop-blur-sm',
        config.badge,
        colorThemes[autoColor],
        className,
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-0.5">
        <p className={cn('font-medium text-slate-400', config.label)}>{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('font-bold tabular-nums text-white', config.value)}>
            {prefix}
            {animate ? <AnimatedCounter value={value} /> : value.toLocaleString()}
            {suffix}
          </span>
          {(trendValue || previousValue != null) && (
            <span className={cn('text-xs font-medium', trendColors[autoTrend])}>
              {trendIcons[autoTrend]} {trendValue}
            </span>
          )}
        </div>
      </div>
      {sparkline && sparkline.length > 0 && (
        <Sparkline data={sparkline} height={config.sparkH} />
      )}
    </motion.div>
  );
}

export { AnimatedCounter, Sparkline, type MetricBadgeProps };

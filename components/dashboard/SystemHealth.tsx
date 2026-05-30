'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

interface SystemHealthProps {
  online?: number;
  offline?: number;
  degraded?: number;
  total?: number;
  className?: string;
}

interface DonutChartProps {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

function DonutChart({ segments, size = 140, thickness = 14, centerLabel, centerSublabel }: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg, i) => {
          const pct = total > 0 ? seg.value / total : 0;
          const dashLen = pct * circumference;
          const dashOffset = -cumulative * circumference;
          cumulative += pct;
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel && <span className="text-2xl font-bold text-white">{centerLabel}</span>}
        {centerSublabel && <span className="text-xs text-slate-400">{centerSublabel}</span>}
      </div>
    </div>
  );
}

function HealthScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const ringColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r="40" fill="none"
          stroke={ringColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 40}`}
          initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn('text-xl font-bold', color)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-slate-500">Score</span>
      </div>
    </div>
  );
}

export function SystemHealth({
  online = 4,
  offline = 1,
  degraded = 1,
  total = 6,
  className,
}: SystemHealthProps) {
  const score = Math.round(((online + degraded * 0.5) / total) * 100);

  const segments = [
    { value: online, color: '#34d399', label: 'Online' },
    { value: degraded, color: '#fbbf24', label: 'Degraded' },
    { value: offline, color: '#f87171', label: 'Offline' },
  ];

  return (
    <GlassCard className={cn('space-y-5', className)}>
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">System Health</h3>

      <div className="flex items-center justify-around">
        <DonutChart
          segments={segments}
          centerLabel={`${online + degraded + offline}`}
          centerSublabel="Servers"
        />
        <HealthScore score={score} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Online', value: online, color: 'text-emerald-400', dot: 'bg-emerald-500' },
          { label: 'Degraded', value: degraded, color: 'text-amber-400', dot: 'bg-amber-500' },
          { label: 'Offline', value: offline, color: 'text-red-400', dot: 'bg-red-500' },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', item.dot)} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
            <motion.p
              className={cn('text-lg font-bold', item.color)}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {item.value}
            </motion.p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

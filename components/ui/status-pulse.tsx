'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Status = 'online' | 'degraded' | 'offline' | 'unknown';

interface StatusPulseProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<Status, { color: string; bg: string; ring: string; label: string }> = {
  online: { color: 'bg-emerald-500', bg: 'bg-emerald-500/20', ring: 'bg-emerald-400', label: 'Online' },
  degraded: { color: 'bg-amber-500', bg: 'bg-amber-500/20', ring: 'bg-amber-400', label: 'Degraded' },
  offline: { color: 'bg-red-500', bg: 'bg-red-500/20', ring: 'bg-red-400', label: 'Offline' },
  unknown: { color: 'bg-slate-500', bg: 'bg-slate-500/20', ring: 'bg-slate-400', label: 'Unknown' },
};

const sizeMap = {
  sm: { dot: 'h-2 w-2', ring: 'h-4 w-4', text: 'text-xs' },
  md: { dot: 'h-2.5 w-2.5', ring: 'h-6 w-6', text: 'text-sm' },
  lg: { dot: 'h-3 w-3', ring: 'h-8 w-8', text: 'text-base' },
};

export function StatusPulse({ status, size = 'md', label, className, showLabel = true }: StatusPulseProps) {
  const config = statusConfig[status];
  const sz = sizeMap[size];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative inline-flex">
        {/* Pulse rings for online status */}
        {status === 'online' && (
          <>
            <motion.span
              className={cn('absolute inset-0 rounded-full', config.ring)}
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className={cn('absolute inset-0 rounded-full', config.ring)}
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            />
          </>
        )}

        {/* Warning glow for degraded */}
        {status === 'degraded' && (
          <motion.span
            className={cn('absolute inset-[-3px] rounded-full', config.bg)}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)' }}
          />
        )}

        {/* Core dot */}
        <span className={cn('relative rounded-full', config.color, sz.dot)} />
      </span>

      {showLabel && (
        <span className={cn('font-medium', sz.text, {
          'text-emerald-400': status === 'online',
          'text-amber-400': status === 'degraded',
          'text-red-400': status === 'offline',
          'text-slate-400': status === 'unknown',
        })}>
          {label || config.label}
        </span>
      )}
    </div>
  );
}

export { type StatusPulseProps, type Status };

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

type Severity = 'critical' | 'warning' | 'info' | 'resolved';

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  source: string;
  timestamp: string;
  acknowledged?: boolean;
  resolved?: boolean;
}

interface AlertTimelineProps {
  alerts?: Alert[];
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  className?: string;
}

const mockAlerts: Alert[] = [
  { id: '1', title: 'High CPU Usage', message: 'CPU usage on web-prod-01 exceeded 90% for 5 minutes.', severity: 'critical', source: 'web-prod-01', timestamp: '2 min ago' },
  { id: '2', title: 'Memory Warning', message: 'Memory usage on cache-redis is at 91%. Consider scaling.', severity: 'warning', source: 'cache-redis', timestamp: '15 min ago' },
  { id: '3', title: 'Server Down', message: 'worker-batch is not responding to health checks.', severity: 'critical', source: 'worker-batch', timestamp: '32 min ago', acknowledged: true },
  { id: '4', title: 'SSL Certificate Expiry', message: 'Certificate for api.example.com expires in 7 days.', severity: 'warning', source: 'api-gateway', timestamp: '1 hour ago' },
  { id: '5', title: 'Deployment Complete', message: 'v2.4.1 successfully deployed to all production servers.', severity: 'resolved', source: 'CI/CD', timestamp: '2 hours ago' },
  { id: '6', title: 'Disk Space Low', message: 'Disk usage on db-primary has reached 72%.', severity: 'info', source: 'db-primary', timestamp: '3 hours ago' },
];

const severityConfig: Record<Severity, { color: string; bg: string; border: string; dot: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  resolved: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
};

export function AlertTimeline({ alerts = mockAlerts, onAcknowledge, onResolve, className }: AlertTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <GlassCard className={cn('space-y-4', className)} noPadding>
      <div className="px-6 pt-5">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Alert Timeline</h3>
      </div>

      <div className="relative px-6 pb-5">
        {/* Timeline line */}
        <div className="absolute left-[38px] top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

        <div className="space-y-1">
          {alerts.map((alert, i) => {
            const config = severityConfig[alert.severity];
            const isExpanded = expandedId === alert.id;

            return (
              <motion.div
                key={alert.id}
                className="relative flex gap-4 py-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Dot */}
                <div className="relative z-10 mt-1">
                  <div className={cn('w-3 h-3 rounded-full', config.dot)} />
                  {alert.severity === 'critical' && !alert.resolved && (
                    <motion.div
                      className={cn('absolute inset-0 rounded-full', config.dot)}
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    className="text-left w-full"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('font-medium text-sm', config.color)}>{alert.title}</span>
                      <span className="text-xs text-slate-500 shrink-0">{alert.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{alert.source}</p>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className={cn('mt-3 p-3 rounded-lg border text-xs text-slate-300', config.bg, config.border)}>
                          {alert.message}
                          <div className="flex gap-2 mt-3">
                            {!alert.acknowledged && !alert.resolved && (
                              <button
                                className="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                                onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.id); }}
                              >
                                Acknowledge
                              </button>
                            )}
                            {!alert.resolved && (
                              <button
                                className="px-3 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs transition-colors"
                                onClick={(e) => { e.stopPropagation(); onResolve?.(alert.id); }}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

export { type Alert, type AlertTimelineProps };

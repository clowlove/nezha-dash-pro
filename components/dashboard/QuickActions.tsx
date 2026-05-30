'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
  requiresConfirm?: boolean;
}

interface QuickActionsProps {
  onDeploy?: () => void;
  onBulkRestart?: () => void;
  onExportReport?: () => void;
  onShareDashboard?: () => void;
  className?: string;
}

const actions: QuickAction[] = [
  {
    id: 'deploy',
    label: 'One-Click Deploy',
    description: 'Deploy latest build to production',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    variant: 'success',
  },
  {
    id: 'restart',
    label: 'Bulk Restart',
    description: 'Restart all selected servers',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    variant: 'danger',
    requiresConfirm: true,
  },
  {
    id: 'export',
    label: 'Export Report',
    description: 'Download dashboard as PDF/CSV',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'share',
    label: 'Share Dashboard',
    description: 'Generate public share link',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
];

const variantStyles = {
  default: 'hover:bg-white/10 text-slate-300 hover:text-white',
  success: 'hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300',
  danger: 'hover:bg-red-500/15 text-red-400 hover:text-red-300',
};

export function QuickActions({
  onDeploy,
  onBulkRestart,
  onExportReport,
  onShareDashboard,
  className,
}: QuickActionsProps) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const handlers: Record<string, () => void> = {
    deploy: onDeploy || (() => {}),
    restart: onBulkRestart || (() => {}),
    export: onExportReport || (() => {}),
    share: onShareDashboard || (() => {}),
  };

  const handleClick = (action: QuickAction) => {
    if (action.requiresConfirm && confirming !== action.id) {
      setConfirming(action.id);
      setTimeout(() => setConfirming(null), 3000);
      return;
    }
    setConfirming(null);
    handlers[action.id]?.();
  };

  return (
    <GlassCard className={cn('space-y-4', className)}>
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, i) => (
          <motion.button
            key={action.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-colors text-left',
              variantStyles[action.variant || 'default'],
            )}
            onClick={() => handleClick(action)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="shrink-0">{action.icon}</span>
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                {confirming === action.id ? (
                  <motion.span
                    key="confirm"
                    className="text-xs font-bold text-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Click again to confirm
                  </motion.span>
                ) : (
                  <motion.div key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p className="text-sm font-medium truncate">{action.label}</p>
                    <p className="text-xs opacity-50 truncate">{action.description}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        ))}
      </div>
    </GlassCard>
  );
}

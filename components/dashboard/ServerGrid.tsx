'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { StatusPulse, type Status } from '@/components/ui/status-pulse';
import { GlassCard } from '@/components/ui/glass-card';
import { MetricBadge } from '@/components/ui/metric-badge';
import { cn } from '@/lib/utils';

interface Server {
  id: string;
  name: string;
  status: Status;
  region: string;
  cpu: number;
  memory: number;
  disk: number;
  network: { in: number; out: number };
  uptime: string;
  ip: string;
}

interface ServerGridProps {
  servers?: Server[];
  onServerClick?: (server: Server) => void;
  onReorder?: (servers: Server[]) => void;
  className?: string;
}

const mockServers: Server[] = [
  { id: '1', name: 'web-prod-01', status: 'online', region: 'us-east', cpu: 42, memory: 67, disk: 55, network: { in: 125, out: 89 }, uptime: '45d 12h', ip: '10.0.1.1' },
  { id: '2', name: 'web-prod-02', status: 'online', region: 'us-east', cpu: 38, memory: 52, disk: 48, network: { in: 98, out: 67 }, uptime: '45d 12h', ip: '10.0.1.2' },
  { id: '3', name: 'db-primary', status: 'online', region: 'us-east', cpu: 71, memory: 84, disk: 72, network: { in: 256, out: 312 }, uptime: '120d 3h', ip: '10.0.2.1' },
  { id: '4', name: 'cache-redis', status: 'degraded', region: 'eu-west', cpu: 23, memory: 91, disk: 12, network: { in: 450, out: 520 }, uptime: '30d 8h', ip: '10.0.3.1' },
  { id: '5', name: 'worker-batch', status: 'offline', region: 'ap-south', cpu: 0, memory: 0, disk: 67, network: { in: 0, out: 0 }, uptime: '—', ip: '10.0.4.1' },
  { id: '6', name: 'api-gateway', status: 'online', region: 'us-west', cpu: 55, memory: 45, disk: 33, network: { in: 780, out: 650 }, uptime: '90d 1h', ip: '10.0.5.1' },
];

const statusBorder: Record<Status, string> = {
  online: 'border-emerald-500/20 hover:border-emerald-500/40',
  degraded: 'border-amber-500/20 hover:border-amber-500/40',
  offline: 'border-red-500/20 hover:border-red-500/40',
  unknown: 'border-slate-500/20 hover:border-slate-500/40',
};

function UsageBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

function ServerCard({
  server,
  onClick,
  expanded,
}: {
  server: Server;
  onClick: () => void;
  expanded: boolean;
}) {
  const cpuColor = server.cpu > 80 ? 'bg-red-400' : server.cpu > 60 ? 'bg-amber-400' : 'bg-emerald-400';
  const memColor = server.memory > 80 ? 'bg-red-400' : server.memory > 60 ? 'bg-amber-400' : 'bg-blue-400';

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl border bg-white/5 backdrop-blur-sm p-4 cursor-pointer transition-colors',
        statusBorder[server.status],
      )}
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusPulse status={server.status} size="sm" showLabel={false} />
          <span className="font-semibold text-white text-sm truncate">{server.name}</span>
        </div>
        <span className="text-xs text-slate-500 shrink-0">{server.region}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-xs">
        <div>
          <p className="text-slate-500 mb-1">CPU</p>
          <p className="font-mono text-white">{server.cpu}%</p>
          <UsageBar value={server.cpu} color={cpuColor} />
        </div>
        <div>
          <p className="text-slate-500 mb-1">Memory</p>
          <p className="font-mono text-white">{server.memory}%</p>
          <UsageBar value={server.memory} color={memColor} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 pt-3 mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">IP</span>
                <span className="font-mono text-slate-300">{server.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disk</span>
                <span className="text-slate-300">{server.disk}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network</span>
                <span className="text-slate-300">↓{server.network.in} ↑{server.network.out} MB/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uptime</span>
                <span className="text-slate-300">{server.uptime}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ServerGrid({ servers = mockServers, onServerClick, onReorder, className }: ServerGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState(servers);

  const handleReorder = useCallback((newOrder: Server[]) => {
    setItems(newOrder);
    onReorder?.(newOrder);
  }, [onReorder]);

  return (
    <Reorder.Group axis="y" values={items} onReorder={handleReorder} className={cn('contents', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((server) => (
          <Reorder.Item key={server.id} value={server} className="list-none">
            <ServerCard
              server={server}
              expanded={expandedId === server.id}
              onClick={() => {
                setExpandedId(expandedId === server.id ? null : server.id);
                onServerClick?.(server);
              }}
            />
          </Reorder.Item>
        ))}
      </div>
    </Reorder.Group>
  );
}

export { type Server, type ServerGridProps };

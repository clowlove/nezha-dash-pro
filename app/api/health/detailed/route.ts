// Deep health check endpoint
// Database connectivity, external API reachability, memory usage, disk space, uptime

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/shared/database';
import { getLogger } from '@/lib/core/logger';
import { getCache } from '@/lib/core/cache';
import { getRealtimeManager } from '@/lib/monitoring/realtime';
import { execSync } from 'child_process';

// ── Types ─────────────────────────────────────────────────────────────────

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: number;
  checks: HealthCheck[];
  system: {
    memory: { totalMB: number; usedMB: number; percentUsed: number };
    disk: { totalGB: number; usedGB: number; percentUsed: number };
    nodeVersion: string;
    platform: string;
    cpuCount: number;
  };
}

// ── Check helpers ─────────────────────────────────────────────────────────

const logger = getLogger('health');
const startTime = Date.now();

async function checkDatabase(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    return {
      name: 'database',
      status: row.ok === 1 ? 'ok' : 'down',
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      name: 'database',
      status: 'down',
      latencyMs: Math.round(performance.now() - start),
      message: String(err),
    };
  }
}

async function checkExternalAPI(): Promise<HealthCheck> {
  const start = performance.now();
  const url = process.env.NEZHA_API_URL || 'http://localhost:8008/api/v1/server/details';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return {
      name: 'external_api',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Math.round(performance.now() - start),
      metadata: { httpStatus: res.status },
    };
  } catch (err) {
    return {
      name: 'external_api',
      status: 'degraded',
      latencyMs: Math.round(performance.now() - start),
      message: String(err).slice(0, 200),
    };
  }
}

async function checkCache(): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const cache = getCache();
    const stats = cache.getStats();
    return {
      name: 'cache',
      status: 'ok',
      latencyMs: Math.round(performance.now() - start),
      metadata: { l1Size: stats.l1Size, l1Hits: stats.l1Hits, l1Misses: stats.l1Misses },
    };
  } catch (err) {
    return {
      name: 'cache',
      status: 'degraded',
      latencyMs: Math.round(performance.now() - start),
      message: String(err),
    };
  }
}

function getSystemInfo(): DetailedHealth['system'] {
  const mem = process.memoryUsage();
  const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const percentUsed = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  let disk = { totalGB: 0, usedGB: 0, percentUsed: 0 };
  try {
    const output = execSync('df -BG / | tail -1', { timeout: 3000 }).toString().trim();
    const parts = output.split(/\s+/);
    if (parts.length >= 5) {
      const totalGB = Number.parseInt(parts[1]) || 0;
      const usedGB = Number.parseInt(parts[2]) || 0;
      const percentUsed = Number.parseInt(parts[4]) || 0;
      disk = { totalGB, usedGB, percentUsed };
    }
  } catch {
    // Non-critical: disk info unavailable
  }

  return {
    memory: { totalMB, usedMB, percentUsed },
    disk,
    nodeVersion: process.version,
    platform: process.platform,
    cpuCount: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 0,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  logger.info('health.check.start');

  const [dbCheck, apiCheck, cacheCheck] = await Promise.all([
    checkDatabase(),
    checkExternalAPI(),
    checkCache(),
  ]);

  const checks = [dbCheck, apiCheck, cacheCheck];
  const hasDown = checks.some((c) => c.status === 'down');
  const hasDegraded = checks.some((c) => c.status === 'degraded');

  const overallStatus = hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

  const realtime = getRealtimeManager();

  const body: DetailedHealth = {
    status: overallStatus,
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: Date.now(),
    checks,
    system: getSystemInfo(),
  };

  // Add realtime stats
  const realtimeCheck: HealthCheck = {
    name: 'realtime',
    status: realtime.getClientCount() >= 0 ? 'ok' : 'degraded',
    latencyMs: 0,
    metadata: {
      connectedClients: realtime.getClientCount(),
      activeChannels: realtime.getActiveChannels().length,
    },
  };
  body.checks.push(realtimeCheck);

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  logger.info('health.check.complete', { status: overallStatus });

  return NextResponse.json(body, { status: httpStatus });
}

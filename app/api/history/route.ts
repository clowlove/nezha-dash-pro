/**
 * Historical metrics API - query and ingest metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage/sqlite';
import { getAggregator } from '@/lib/storage/aggregator';
import { AggregationInterval, selectInterval } from '@/lib/storage/types';

// GET /api/history - Query historical metrics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storage = getStorage();

  const serverId = searchParams.get('serverId');
  const metric = searchParams.get('metric');

  if (!serverId || !metric) {
    return NextResponse.json({ error: 'serverId and metric are required' }, { status: 400 });
  }

  // Time range: default last 24h
  const now = Date.now();
  const rangeParam = searchParams.get('range') || '24h';
  const rangeMs = parseTimeRange(rangeParam);
  const start = parseInt(searchParams.get('start') || String(now - rangeMs));
  const end = parseInt(searchParams.get('end') || String(now));

  // Auto-select or manual interval
  const intervalParam = searchParams.get('interval') as AggregationInterval | null;
  const interval = intervalParam || selectInterval(end - start);
  const limit = parseInt(searchParams.get('limit') || '1000');

  try {
    const data = storage.query({
      serverId,
      metric,
      range: { start, end },
      interval,
      limit,
    });

    const latest = storage.getLatest(serverId, metric);

    return NextResponse.json({
      serverId,
      metric,
      interval,
      range: { start, end },
      pointCount: data.length,
      latest,
      data,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/history - Ingest metrics or trigger aggregation
export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { action } = body;

  if (action === 'ingest') {
    const { points } = body;
    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: 'points array is required' }, { status: 400 });
    }

    const aggregator = getAggregator();
    aggregator.ingestBatch(points.map((p: { serverId: string; metric: string; value: number; timestamp?: number }) => ({
      serverId: p.serverId,
      metric: p.metric,
      value: p.value,
      timestamp: p.timestamp || Date.now(),
    })));

    return NextResponse.json({ ingested: points.length });
  }

  if (action === 'aggregate') {
    const aggregator = getAggregator();
    const result = aggregator.runAggregation();
    return NextResponse.json(result);
  }

  if (action === 'cleanup') {
    const { olderThanMs } = body;
    const storage = getStorage();
    const deleted = storage.cleanup(olderThanMs || Date.now() - 7 * 24 * 60 * 60 * 1000);
    return NextResponse.json({ deleted });
  }

  return NextResponse.json({ error: 'Invalid action. Use: ingest, aggregate, cleanup' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)(m|h|d|w)$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

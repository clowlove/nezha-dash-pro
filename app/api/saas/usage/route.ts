// NezhaDash Pro — Usage API

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsage, getUsageHistory, getActiveSubscription, getPlanByTier } from '@/lib/saas/plan-manager';
import { getPlanById } from '@/lib/saas/plan-manager';
import { checkAllUsageLimits } from '@/lib/saas/feature-gates';
import type { PlanTier } from '@/lib/saas/types';

// GET /api/saas/usage?userId=xxx&history=true&limit=30
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const sub = getActiveSubscription(userId);
  if (!sub) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  const plan = getPlanById(sub.planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Return usage history
  if (searchParams.has('history')) {
    const limit = parseInt(searchParams.get('limit') ?? '30', 10);
    const history = getUsageHistory(userId, limit);
    return NextResponse.json({ history, plan: { name: plan.name, tier: plan.tier } });
  }

  // Return current usage with limits
  const usage = getCurrentUsage(userId);
  const usageData = {
    servers: usage?.serversUsed ?? 0,
    users: usage?.usersUsed ?? 0,
    alertRules: usage?.alertRulesUsed ?? 0,
    apiCalls: usage?.apiCallsThisPeriod ?? 0,
    bandwidth: usage?.bandwidthUsedMB ?? 0,
  };

  const limits = checkAllUsageLimits(plan.tier, usageData);

  return NextResponse.json({
    usage: usageData,
    limits,
    plan: { id: plan.id, name: plan.name, tier: plan.tier },
    subscription: {
      status: sub.status,
      billingInterval: sub.billingInterval,
      currentPeriodEnd: sub.currentPeriodEnd,
    },
  });
}

// NezhaDash Pro — Plans API

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPlans, getActiveSubscription, getPlanById,
  upgradePlan, downgradePlan, createSubscription,
} from '@/lib/saas/plan-manager';
import { calculateProration } from '@/lib/saas/billing-engine';
import { PLAN_HIERARCHY } from '@/lib/saas/types';

// GET /api/saas/plans — list all plans or get current plan
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (searchParams.has('current') && userId) {
    const sub = getActiveSubscription(userId);
    if (!sub) {
      return NextResponse.json({ subscription: null, plan: null });
    }
    const plan = getPlanById(sub.planId);
    return NextResponse.json({ subscription: sub, plan });
  }

  const plans = getAllPlans();
  return NextResponse.json({ plans });
}

// POST /api/saas/plans — upgrade/downgrade or create subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planId, action, billingInterval } = body as {
      userId: string;
      planId: string;
      action: 'subscribe' | 'upgrade' | 'downgrade';
      billingInterval: 'monthly' | 'yearly';
    };

    if (!userId || !planId) {
      return NextResponse.json({ error: 'userId and planId required' }, { status: 400 });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (action === 'subscribe') {
      const sub = createSubscription(userId, planId, billingInterval ?? 'monthly');
      return NextResponse.json({ subscription: sub }, { status: 201 });
    }

    const sub = getActiveSubscription(userId);
    if (!sub) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    // Calculate proration for upgrade/downgrade
    const proration = calculateProration(sub, planId);

    if (action === 'upgrade') {
      const updated = upgradePlan(userId, planId);
      return NextResponse.json({ subscription: updated, proration });
    }

    if (action === 'downgrade') {
      const updated = downgradePlan(userId, planId);
      return NextResponse.json({ subscription: updated, proration });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

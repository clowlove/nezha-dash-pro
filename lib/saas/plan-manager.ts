// NezhaDash Pro — Plan Manager

import type {
  Plan, PlanTier, Subscription, SubscriptionStatus,
  BillingInterval, UsageSnapshot,
} from './types';
import { PLAN_HIERARCHY } from './types';

// In-memory store (swap for DB in production)
const plans: Map<string, Plan> = new Map();
const subscriptions: Map<string, Subscription> = new Map();
const usages: Map<string, UsageSnapshot[]> = new Map();

// ── Seed Plans ──────────────────────────────────────────────
const SEED_PLANS: Plan[] = [
  {
    id: 'plan_free', tier: 'free', name: 'Free',
    description: 'For personal projects and small teams getting started.',
    prices: { monthly: 0, yearly: 0 },
    maxServers: 3, maxUsers: 2, maxAlertRules: 5, maxRetentionDays: 7,
    features: ['Basic monitoring', 'Community support', '7-day data retention', '2 team members'],
    trialDays: 0,
    stripePriceIds: { monthly: 'price_free_m', yearly: 'price_free_y' },
  },
  {
    id: 'plan_pro', tier: 'pro', name: 'Pro',
    description: 'For professionals who need more power and flexibility.',
    prices: { monthly: 1900, yearly: 19000 },
    maxServers: 20, maxUsers: 10, maxAlertRules: 50, maxRetentionDays: 30,
    features: ['Advanced monitoring', 'Priority support', '30-day data retention', '10 team members', 'Custom dashboards', 'API access'],
    popular: true, trialDays: 14,
    stripePriceIds: { monthly: 'price_pro_m', yearly: 'price_pro_y' },
  },
  {
    id: 'plan_team', tier: 'team', name: 'Team',
    description: 'For growing teams that need collaboration features.',
    prices: { monthly: 4900, yearly: 49000 },
    maxServers: 100, maxUsers: 50, maxAlertRules: 200, maxRetentionDays: 90,
    features: ['Everything in Pro', '90-day data retention', '50 team members', 'SSO integration', 'Audit logs', 'Webhooks', 'Role-based access'],
    trialDays: 14,
    stripePriceIds: { monthly: 'price_team_m', yearly: 'price_team_y' },
  },
  {
    id: 'plan_enterprise', tier: 'enterprise', name: 'Enterprise',
    description: 'For large organizations with custom requirements.',
    prices: { monthly: 19900, yearly: 199000 },
    maxServers: -1, maxUsers: -1, maxAlertRules: -1, maxRetentionDays: 365,
    features: ['Everything in Team', 'Unlimited servers & users', '365-day data retention', 'Dedicated support', 'Custom SLA', 'On-premise option', 'Custom integrations', 'Invoice billing'],
    trialDays: 30,
    stripePriceIds: { monthly: 'price_ent_m', yearly: 'price_ent_y' },
  },
];

SEED_PLANS.forEach(p => plans.set(p.id, p));

// ── Plan CRUD ───────────────────────────────────────────────
export function getAllPlans(): Plan[] {
  return Array.from(plans.values()).sort(
    (a, b) => PLAN_HIERARCHY[a.tier] - PLAN_HIERARCHY[b.tier]
  );
}

export function getPlanById(id: string): Plan | undefined {
  return plans.get(id);
}

export function getPlanByTier(tier: PlanTier): Plan | undefined {
  return getAllPlans().find(p => p.tier === tier);
}

// ── Subscription Lifecycle ──────────────────────────────────
export function createSubscription(
  userId: string, planId: string, interval: BillingInterval
): Subscription {
  const plan = plans.get(planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (interval === 'yearly' ? 12 : 1));

  const sub: Subscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    planId,
    status: plan.trialDays > 0 ? 'trialing' : 'active',
    billingInterval: interval,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    trialEnd: plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 86_400_000) : undefined,
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
  };

  // Cancel previous active sub
  const existing = getActiveSubscription(userId);
  if (existing) {
    existing.status = 'cancelled';
    existing.cancelledAt = now;
    existing.updatedAt = now;
  }

  subscriptions.set(sub.id, sub);
  return sub;
}

export function getActiveSubscription(userId: string): Subscription | undefined {
  return Array.from(subscriptions.values()).find(
    s => s.userId === userId && ['trialing', 'active', 'past_due'].includes(s.status)
  );
}

export function getSubscriptionHistory(userId: string): Subscription[] {
  return Array.from(subscriptions.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function upgradePlan(userId: string, newPlanId: string): Subscription {
  const sub = getActiveSubscription(userId);
  if (!sub) throw new Error('No active subscription');
  const newPlan = plans.get(newPlanId);
  if (!newPlan) throw new Error('Plan not found');

  const currentPlan = plans.get(sub.planId)!;
  if (PLAN_HIERARCHY[newPlan.tier] <= PLAN_HIERARCHY[currentPlan.tier]) {
    throw new Error('New plan must be higher tier');
  }

  sub.planId = newPlanId;
  sub.updatedAt = new Date();
  return sub;
}

export function downgradePlan(userId: string, newPlanId: string): Subscription {
  const sub = getActiveSubscription(userId);
  if (!sub) throw new Error('No active subscription');
  const newPlan = plans.get(newPlanId);
  if (!newPlan) throw new Error('Plan not found');

  sub.planId = newPlanId;
  sub.cancelAtPeriodEnd = false;
  sub.updatedAt = new Date();
  return sub;
}

export function cancelSubscription(userId: string): Subscription {
  const sub = getActiveSubscription(userId);
  if (!sub) throw new Error('No active subscription');
  sub.cancelAtPeriodEnd = true;
  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  sub.updatedAt = new Date();
  return sub;
}

export function markPastDue(userId: string): void {
  const sub = getActiveSubscription(userId);
  if (sub && sub.status === 'active') {
    sub.status = 'past_due';
    sub.updatedAt = new Date();
  }
}

// ── Usage Tracking ──────────────────────────────────────────
export function recordUsage(userId: string, snapshot: Omit<UsageSnapshot, 'id' | 'recordedAt'>): UsageSnapshot {
  const entry: UsageSnapshot = {
    ...snapshot,
    id: `usage_${Date.now()}`,
    recordedAt: new Date(),
  };
  const list = usages.get(userId) ?? [];
  list.push(entry);
  usages.set(userId, list);
  return entry;
}

export function getCurrentUsage(userId: string): UsageSnapshot | null {
  const list = usages.get(userId);
  return list && list.length > 0 ? list[list.length - 1] : null;
}

export function getUsageHistory(userId: string, limit = 30): UsageSnapshot[] {
  const list = usages.get(userId) ?? [];
  return list.slice(-limit);
}

// ── Feature Gating helper ───────────────────────────────────
export function isTierAtLeast(current: PlanTier, required: PlanTier): boolean {
  return PLAN_HIERARCHY[current] >= PLAN_HIERARCHY[required];
}

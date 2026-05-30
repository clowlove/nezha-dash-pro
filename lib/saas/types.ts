// NezhaDash Pro — SaaS Types

import type { PlanTier } from '../shared/types';

export type { PlanTier };

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';

export type BillingInterval = 'monthly' | 'yearly';

export type CouponType = 'percentage' | 'fixed';

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  prices: { monthly: number; yearly: number }; // in cents
  maxServers: number; // -1 = unlimited
  maxUsers: number;
  maxAlertRules: number;
  maxRetentionDays: number;
  features: string[];
  popular?: boolean;
  trialDays: number;
  stripePriceIds: { monthly: string; yearly: string };
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  couponId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageSnapshot {
  id: string;
  subscriptionId: string;
  userId: string;
  serversUsed: number;
  usersUsed: number;
  alertRulesUsed: number;
  apiCallsThisPeriod: number;
  bandwidthUsedMB: number;
  recordedAt: Date;
}

export interface UsageHistoryEntry {
  date: Date;
  serversUsed: number;
  usersUsed: number;
  apiCalls: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number; // cents
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  stripeInvoiceId?: string;
  paymentUrl?: string;
  lineItems: InvoiceLineItem[];
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percentage (0-100) or fixed cents
  maxUses: number; // -1 = unlimited
  usedCount: number;
  appliesToPlans: PlanTier[];
  validFrom: Date;
  validUntil: Date;
  active: boolean;
  createdAt: Date;
}

export interface FeatureGate {
  feature: string;
  minimumTier: PlanTier;
}

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
};

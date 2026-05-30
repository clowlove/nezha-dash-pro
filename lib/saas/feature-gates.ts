// NezhaDash Pro — Feature Gates

import type { Plan, PlanTier, UsageSnapshot } from './types';
import { PLAN_HIERARCHY } from './types';
import { getPlanByTier, getCurrentUsage } from './plan-manager';

// ── Feature Definitions ─────────────────────────────────────
export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  minimumTier: PlanTier;
}

export const FEATURES: FeatureDefinition[] = [
  { key: 'basic_monitoring', name: 'Basic Monitoring', description: 'Server health & uptime monitoring', minimumTier: 'free' },
  { key: 'custom_dashboards', name: 'Custom Dashboards', description: 'Build custom monitoring dashboards', minimumTier: 'pro' },
  { key: 'api_access', name: 'API Access', description: 'REST API for automation', minimumTier: 'pro' },
  { key: 'webhooks', name: 'Webhooks', description: 'Receive event notifications via webhooks', minimumTier: 'team' },
  { key: 'sso', name: 'SSO Integration', description: 'Single Sign-On via SAML/OIDC', minimumTier: 'team' },
  { key: 'audit_logs', name: 'Audit Logs', description: 'Track all team activity', minimumTier: 'team' },
  { key: 'rbac', name: 'Role-Based Access', description: 'Fine-grained permission controls', minimumTier: 'team' },
  { key: 'custom_sla', name: 'Custom SLA', description: 'Negotiate custom service-level agreements', minimumTier: 'enterprise' },
  { key: 'on_premise', name: 'On-Premise Option', description: 'Deploy on your own infrastructure', minimumTier: 'enterprise' },
  { key: 'dedicated_support', name: 'Dedicated Support', description: 'Dedicated account manager', minimumTier: 'enterprise' },
  { key: 'custom_integrations', name: 'Custom Integrations', description: 'Bespoke integrations built for you', minimumTier: 'enterprise' },
];

// ── Feature Gating ──────────────────────────────────────────
export function isFeatureAllowed(planTier: PlanTier, featureKey: string): boolean {
  const feature = FEATURES.find(f => f.key === featureKey);
  if (!feature) return false;
  return PLAN_HIERARCHY[planTier] >= PLAN_HIERARCHY[feature.minimumTier];
}

export function getAllowedFeatures(planTier: PlanTier): FeatureDefinition[] {
  return FEATURES.filter(f => isFeatureAllowed(planTier, f.key));
}

export function getBlockedFeatures(planTier: PlanTier): FeatureDefinition[] {
  return FEATURES.filter(f => !isFeatureAllowed(planTier, f.key));
}

// ── Plan Limits ─────────────────────────────────────────────
export interface PlanLimits {
  maxServers: number;
  maxUsers: number;
  maxAlertRules: number;
  maxRetentionDays: number;
  maxApiCallsPerMonth: number;
  maxBandwidthMB: number;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free:       { maxServers: 3,   maxUsers: 2,   maxAlertRules: 5,   maxRetentionDays: 7,   maxApiCallsPerMonth: 1000,   maxBandwidthMB: 500 },
  pro:        { maxServers: 20,  maxUsers: 10,  maxAlertRules: 50,  maxRetentionDays: 30,  maxApiCallsPerMonth: 50000,  maxBandwidthMB: 5000 },
  team:       { maxServers: 100, maxUsers: 50,  maxAlertRules: 200, maxRetentionDays: 90,  maxApiCallsPerMonth: 200000, maxBandwidthMB: 25000 },
  enterprise: { maxServers: -1,  maxUsers: -1,  maxAlertRules: -1,  maxRetentionDays: 365, maxApiCallsPerMonth: -1,     maxBandwidthMB: -1 },
};

export function getPlanLimits(planTier: PlanTier): PlanLimits {
  return { ...PLAN_LIMITS[planTier] };
}

// ── Usage Limit Checking ────────────────────────────────────
export type UsageResource = 'servers' | 'users' | 'alertRules' | 'apiCalls' | 'bandwidth';

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number; // 0-100
  unlimited: boolean;
}

export function checkUsageLimit(
  planTier: PlanTier,
  resource: UsageResource,
  currentValue: number
): UsageCheckResult {
  const limits = getPlanLimits(planTier);
  const limitMap: Record<UsageResource, number> = {
    servers: limits.maxServers,
    users: limits.maxUsers,
    alertRules: limits.maxAlertRules,
    apiCalls: limits.maxApiCallsPerMonth,
    bandwidth: limits.maxBandwidthMB,
  };

  const limit = limitMap[resource];
  const unlimited = limit === -1;

  return {
    allowed: unlimited || currentValue < limit,
    current: currentValue,
    limit,
    percentage: unlimited ? 0 : Math.min(100, Math.round((currentValue / limit) * 100)),
    unlimited,
  };
}

export function checkAllUsageLimits(
  planTier: PlanTier,
  usage: { servers: number; users: number; alertRules: number; apiCalls: number; bandwidth: number }
): Record<UsageResource, UsageCheckResult> {
  return {
    servers: checkUsageLimit(planTier, 'servers', usage.servers),
    users: checkUsageLimit(planTier, 'users', usage.users),
    alertRules: checkUsageLimit(planTier, 'alertRules', usage.alertRules),
    apiCalls: checkUsageLimit(planTier, 'apiCalls', usage.apiCalls),
    bandwidth: checkUsageLimit(planTier, 'bandwidth', usage.bandwidth),
  };
}

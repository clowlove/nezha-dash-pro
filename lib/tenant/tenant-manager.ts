import { randomBytes } from 'crypto';
import {
  TenantConfig, CreateTenantInput, UpdateTenantInput,
  QuotaUsage, PlanTier, TenantSettings,
  PLAN_QUOTAS, TenantQuota,
} from './types';

// ── In-memory store ───────────────────────────────────────────────────────
const tenants: Map<string, TenantConfig> = new Map();
let idCounter = 0;

function nextId(): string {
  return `tenant_${++idCounter}_${Date.now()}`;
}

const DEFAULT_SETTINGS: TenantSettings = {
  defaultRole: 'viewer',
  requireEmailVerification: true,
  allowPublicInviteLinks: false,
};

// ── Tenant CRUD ───────────────────────────────────────────────────────────
export function createTenant(input: CreateTenantInput): TenantConfig {
  const existing = Array.from(tenants.values()).find((t) => t.slug === input.slug);
  if (existing) throw new Error('Tenant with this slug already exists');

  const plan = input.plan || 'free';
  const now = new Date().toISOString();
  const tenant: TenantConfig = {
    id: nextId(),
    name: input.name,
    slug: input.slug,
    plan,
    quota: { ...PLAN_QUOTAS[plan] },
    ownerId: input.ownerId,
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now,
    updatedAt: now,
  };
  tenants.set(tenant.id, tenant);
  return tenant;
}

export function getTenantById(id: string): TenantConfig | undefined {
  return tenants.get(id);
}

export function getTenantBySlug(slug: string): TenantConfig | undefined {
  return Array.from(tenants.values()).find((t) => t.slug === slug);
}

export function getAllTenants(): TenantConfig[] {
  return Array.from(tenants.values());
}

export function updateTenant(id: string, input: UpdateTenantInput): TenantConfig {
  const tenant = tenants.get(id);
  if (!tenant) throw new Error('Tenant not found');

  if (input.name !== undefined) tenant.name = input.name;
  if (input.plan !== undefined) {
    tenant.plan = input.plan;
    tenant.quota = { ...PLAN_QUOTAS[input.plan] };
  }
  if (input.settings !== undefined) {
    tenant.settings = { ...tenant.settings, ...input.settings };
  }
  tenant.updatedAt = new Date().toISOString();
  return tenant;
}

export function deleteTenant(id: string): boolean {
  return tenants.delete(id);
}

// ── Quota enforcement ─────────────────────────────────────────────────────
/** Override this with actual DB counts in production */
export type QuotaCounter = (tenantId: string) => QuotaUsage;

let quotaCounter: QuotaCounter = () => ({
  servers: 0, users: 0, alerts: 0, teams: 0, apiRequestsThisMinute: 0,
});

export function setQuotaCounter(counter: QuotaCounter): void {
  quotaCounter = counter;
}

export function getQuotaUsage(tenantId: string): QuotaUsage {
  return quotaCounter(tenantId);
}

export function checkQuota(tenantId: string, resource: keyof QuotaUsage): boolean {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const usage = getQuotaUsage(tenantId);
  const quotaKeyMap: Record<string, keyof TenantQuota> = {
    servers: 'maxServers',
    users: 'maxUsers',
    alerts: 'maxAlerts',
    teams: 'maxTeams',
    apiRequestsThisMinute: 'maxApiRequestsPerMinute',
  };
  const quotaKey = quotaKeyMap[resource];
  const limit = tenant.quota[quotaKey];
  // -1 means unlimited
  if (limit === -1) return true;
  return usage[resource] < limit;
}

export function enforceQuota(tenantId: string, resource: keyof QuotaUsage): void {
  if (!checkQuota(tenantId, resource)) {
    const tenant = tenants.get(tenantId);
    throw new Error(
      `Quota exceeded for ${resource} on plan "${tenant?.plan}". Upgrade your plan to increase limits.`
    );
  }
}

// ── Plan management ───────────────────────────────────────────────────────
export function upgradePlan(tenantId: string, newPlan: PlanTier): TenantConfig {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const hierarchy: PlanTier[] = ['free', 'pro', 'enterprise'];
  const currentIdx = hierarchy.indexOf(tenant.plan);
  const newIdx = hierarchy.indexOf(newPlan);
  if (newIdx <= currentIdx) {
    throw new Error('Use downgradePlan for lower tiers or select a higher plan');
  }
  return updateTenant(tenantId, { plan: newPlan });
}

export function downgradePlan(tenantId: string, newPlan: PlanTier): TenantConfig {
  const tenant = tenants.get(tenantId);
  if (!tenant) throw new Error('Tenant not found');

  const hierarchy: PlanTier[] = ['free', 'pro', 'enterprise'];
  const currentIdx = hierarchy.indexOf(tenant.plan);
  const newIdx = hierarchy.indexOf(newPlan);
  if (newIdx >= currentIdx) {
    throw new Error('Use upgradePlan for higher tiers or select a lower plan');
  }

  // Warn if current usage exceeds new limits
  const newQuota = PLAN_QUOTAS[newPlan];
  const usage = getQuotaUsage(tenantId);
  const warnings: string[] = [];
  if (newQuota.maxServers !== -1 && usage.servers > newQuota.maxServers)
    warnings.push(`servers (${usage.servers}/${newQuota.maxServers})`);
  if (newQuota.maxUsers !== -1 && usage.users > newQuota.maxUsers)
    warnings.push(`users (${usage.users}/${newQuota.maxUsers})`);
  if (warnings.length > 0) {
    throw new Error(
      `Cannot downgrade: current usage exceeds new plan limits for: ${warnings.join(', ')}. Reduce usage first.`
    );
  }

  return updateTenant(tenantId, { plan: newPlan });
}

// ── Data isolation helper ─────────────────────────────────────────────────
/** Apply tenant_id filter to any query. DB migration: add tenant_id to all domain tables. */
export function tenantFilter<T extends { tenantId: string }>(
  items: T[],
  tenantId: string
): T[] {
  return items.filter((item) => item.tenantId === tenantId);
}

export const store = { tenants };

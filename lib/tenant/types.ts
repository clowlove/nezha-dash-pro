import type { PlanTier } from '../shared/types';

export type { PlanTier };

export interface TenantQuota {
  maxServers: number;
  maxUsers: number;
  maxAlerts: number;
  maxTeams: number;
  maxApiRequestsPerMinute: number;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  quota: TenantQuota;
  ownerId: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  defaultRole: 'viewer' | 'editor';
  requireEmailVerification: boolean;
  allowPublicInviteLinks: boolean;
  webhookUrl?: string;
  customDomain?: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: PlanTier;
  ownerId: string;
}

export interface UpdateTenantInput {
  name?: string;
  plan?: PlanTier;
  settings?: Partial<TenantSettings>;
}

export interface QuotaUsage {
  servers: number;
  users: number;
  alerts: number;
  teams: number;
  apiRequestsThisMinute: number;
}

export const PLAN_QUOTAS: Record<PlanTier, TenantQuota> = {
  free: {
    maxServers: 5,
    maxUsers: 3,
    maxAlerts: 10,
    maxTeams: 1,
    maxApiRequestsPerMinute: 60,
  },
  pro: {
    maxServers: 50,
    maxUsers: 25,
    maxAlerts: 100,
    maxTeams: 10,
    maxApiRequestsPerMinute: 600,
  },
  team: {
    maxServers: 200,
    maxUsers: 100,
    maxAlerts: 500,
    maxTeams: 50,
    maxApiRequestsPerMinute: 3000,
  },
  enterprise: {
    maxServers: -1, // unlimited
    maxUsers: -1,
    maxAlerts: -1,
    maxTeams: -1,
    maxApiRequestsPerMinute: 6000,
  },
};

// DB migration hook:
//   CREATE TABLE tenants (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     name VARCHAR(255) NOT NULL,
//     slug VARCHAR(255) UNIQUE NOT NULL,
//     plan VARCHAR(50) NOT NULL DEFAULT 'free',
//     owner_id UUID NOT NULL,
//     settings JSONB DEFAULT '{}',
//     created_at TIMESTAMPTZ DEFAULT now(),
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );

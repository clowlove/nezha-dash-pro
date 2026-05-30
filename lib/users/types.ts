export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export type Permission =
  | 'servers.view'
  | 'servers.manage'
  | 'alerts.view'
  | 'alerts.manage'
  | 'billing.view'
  | 'billing.manage'
  | 'settings.view'
  | 'settings.manage'
  | 'users.view'
  | 'users.manage'
  | 'teams.view'
  | 'teams.manage';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  tenantId: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: Role;
  tenantId: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  tenantId: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  teamId?: string;
  tenantId: string;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface InviteInput {
  email: string;
  role: Role;
  teamId?: string;
  tenantId: string;
}

// DB migration hook: replace in-memory stores with actual database queries
// Example migration:
//   CREATE TABLE users (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     email VARCHAR(255) UNIQUE NOT NULL,
//     name VARCHAR(255) NOT NULL,
//     password_hash VARCHAR(255) NOT NULL,
//     password_salt VARCHAR(255) NOT NULL,
//     role VARCHAR(50) NOT NULL DEFAULT 'viewer',
//     tenant_id UUID NOT NULL REFERENCES tenants(id),
//     avatar_url TEXT,
//     is_active BOOLEAN DEFAULT true,
//     last_login_at TIMESTAMPTZ,
//     created_at TIMESTAMPTZ DEFAULT now(),
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );

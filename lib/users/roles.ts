import { Role, Permission } from './types';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'servers.view', 'servers.manage',
    'alerts.view', 'alerts.manage',
    'billing.view', 'billing.manage',
    'settings.view', 'settings.manage',
    'users.view', 'users.manage',
    'teams.view', 'teams.manage',
  ],
  admin: [
    'servers.view', 'servers.manage',
    'alerts.view', 'alerts.manage',
    'billing.view',
    'settings.view', 'settings.manage',
    'users.view', 'users.manage',
    'teams.view', 'teams.manage',
  ],
  editor: [
    'servers.view', 'servers.manage',
    'alerts.view', 'alerts.manage',
    'settings.view',
    'teams.view',
  ],
  viewer: [
    'servers.view',
    'alerts.view',
    'settings.view',
    'teams.view',
  ],
};

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  return permissions.some((p) => rolePerms.includes(p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  return permissions.every((p) => rolePerms.includes(p));
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  const hierarchy: Role[] = ['owner', 'admin', 'editor', 'viewer'];
  const managerIdx = hierarchy.indexOf(managerRole);
  const targetIdx = hierarchy.indexOf(targetRole);
  // A user can only manage roles strictly below them
  return managerIdx < targetIdx;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<Role, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  editor: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

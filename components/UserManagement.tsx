'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/lib/users/types';
import { ROLE_LABELS, ROLE_COLORS, canManageRole } from '@/lib/users/roles';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface Props {
  currentRole: Role;
  tenantId: string;
}

export default function UserManagement({ currentRole, tenantId }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'x-tenant-id': tenantId, 'x-user-role': currentRole, 'x-user-id': 'self' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleInvite = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-role': currentRole,
          'x-user-id': 'self',
        },
        body: JSON.stringify({ action: 'invite', email: inviteEmail, role: inviteRole, invitedBy: 'self' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteEmail('');
      setShowInvite(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-role': currentRole,
          'x-user-id': 'self',
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this user?')) return;
    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId, 'x-user-role': currentRole, 'x-user-id': 'self' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const manageableRoles: Role[] = ['owner', 'admin', 'editor', 'viewer'].filter(
    (r) => canManageRole(currentRole, r as Role)
  ) as Role[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        {manageableRoles.length > 0 && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Invite User
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {showInvite && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            className="px-3 py-2 border rounded-lg"
          >
            {manageableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleInvite} className="px-4 py-2 bg-green-600 text-white rounded-lg">
              Send Invite
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 border rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="divide-y border rounded-lg">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3">
              <div className="flex-1">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <div className="flex items-center gap-2 ml-4">
                {canManageRole(currentRole, user.role) && (
                  <>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      {manageableRoles.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemove(user.id)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-4 text-center text-gray-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}

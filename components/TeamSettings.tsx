'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/lib/users/types';
import { ROLE_LABELS, ROLE_COLORS, hasPermission } from '@/lib/users/roles';

interface TeamItem {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
}

interface Props {
  currentRole: Role;
  tenantId: string;
  baseUrl?: string;
}

export default function TeamSettings({ currentRole, tenantId, baseUrl = '' }: Props) {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [addMemberId, setAddMemberId] = useState('');

  const canManage = hasPermission(currentRole, 'teams.manage');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        headers: { 'x-tenant-id': tenantId, 'x-user-role': currentRole, 'x-user-id': 'self' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTeams(data.teams);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentRole]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-role': currentRole,
          'x-user-id': 'self',
        },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (teamId: string) => {
    if (!addMemberId) return;
    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-role': currentRole,
          'x-user-id': 'self',
        },
        body: JSON.stringify({ teamId, action: 'add', memberId: addMemberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMemberId('');
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-user-role': currentRole,
          'x-user-id': 'self',
        },
        body: JSON.stringify({ teamId, action: 'remove', memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      const res = await fetch(`/api/teams?teamId=${teamId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId, 'x-user-role': currentRole, 'x-user-id': 'self' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const generateLink = (teamId: string) => {
    const token = Math.random().toString(36).slice(2, 10);
    setInviteLink(`${baseUrl}/teams/join/${teamId}?token=${token}`);
    setSelectedTeamId(teamId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Teams</h2>
        {canManage && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create Team
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {showCreate && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <input
            placeholder="Team name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded-lg">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-lg">{team.name}</div>
                  {team.description && <div className="text-sm text-gray-500">{team.description}</div>}
                  <div className="text-xs text-gray-400 mt-1">{team.memberIds.length} members</div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateLink(team.id)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      Invite Link
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Member list */}
              <div className="pl-2 border-l-2 border-gray-100 space-y-1">
                {team.memberIds.map((mid) => (
                  <div key={mid} className="flex items-center justify-between text-sm py-1">
                    <span className="font-mono text-gray-700">{mid}</span>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveMember(team.id, mid)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        remove
                      </button>
                    )}
                  </div>
                ))}
                {team.memberIds.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No members yet</div>
                )}
              </div>

              {/* Add member */}
              {canManage && (
                <div className="flex gap-2">
                  <input
                    placeholder="User ID to add"
                    value={selectedTeamId === team.id ? addMemberId : ''}
                    onChange={(e) => { setAddMemberId(e.target.value); setSelectedTeamId(team.id); }}
                    className="flex-1 px-3 py-1.5 border rounded text-sm"
                  />
                  <button
                    onClick={() => handleAddMember(team.id)}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Invite link display */}
              {selectedTeamId === team.id && inviteLink && (
                <div className="p-2 bg-blue-50 rounded text-sm">
                  <span className="text-blue-700">Invite link:</span>{' '}
                  <code className="break-all">{inviteLink}</code>
                </div>
              )}
            </div>
          ))}
          {teams.length === 0 && (
            <div className="text-center text-gray-500 py-8">No teams yet</div>
          )}
        </div>
      )}
    </div>
  );
}

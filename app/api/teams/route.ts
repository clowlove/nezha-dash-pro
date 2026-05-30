import { NextRequest, NextResponse } from 'next/server';
import {
  createTeam, getTeamsByTenant, addTeamMember,
  removeTeamMember, deleteTeam, getTeamById,
} from '@/lib/users/user-manager';
import { hasPermission } from '@/lib/users/roles';
import { enforceQuota } from '@/lib/tenant/tenant-manager';
import type { Role } from '@/lib/users/types';

function getAuth(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role') as Role | null;
  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing auth headers');
  }
  return { tenantId, userId, userRole };
}

// GET /api/teams — list teams for tenant
export async function GET(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'teams.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const teams = getTeamsByTenant(tenantId);
    return NextResponse.json({ teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// POST /api/teams — create team
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'teams.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    enforceQuota(tenantId, 'teams');
    const body = await req.json();
    const team = createTeam({
      name: body.name,
      description: body.description,
      tenantId,
    });
    return NextResponse.json({ team }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT /api/teams — add/remove member
export async function PUT(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'teams.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { teamId, action, memberId } = body;

    // Verify team belongs to tenant
    const team = getTeamById(teamId);
    if (!team || team.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    let updated;
    if (action === 'add') {
      updated = addTeamMember(teamId, memberId);
    } else if (action === 'remove') {
      updated = removeTeamMember(teamId, memberId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json({ team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/teams — delete team
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'teams.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    const team = getTeamById(teamId);
    if (!team || team.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    deleteTeam(teamId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

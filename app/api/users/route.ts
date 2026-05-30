import { NextRequest, NextResponse } from 'next/server';
import {
  createUser, getUsersByTenant, updateUser, deleteUser,
  authenticateUser, createInvitation, getInvitationsByTenant,
} from '@/lib/users/user-manager';
import { hasPermission } from '@/lib/users/roles';
import { enforceQuota } from '@/lib/tenant/tenant-manager';
import type { Role } from '@/lib/users/types';

// Helper: extract tenant + auth from request headers
function getAuth(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role') as Role | null;
  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing auth headers');
  }
  return { tenantId, userId, userRole };
}

// GET /api/users — list users for tenant
export async function GET(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'users.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = getUsersByTenant(tenantId).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// POST /api/users — create user or send invitation
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'users.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'invite') {
      // Send invitation
      const invitation = createInvitation(
        { email: body.email, role: body.role || 'viewer', tenantId },
        body.invitedBy
      );
      return NextResponse.json({ invitation }, { status: 201 });
    }

    // Create user directly
    enforceQuota(tenantId, 'users');
    const user = createUser({
      email: body.email,
      name: body.name,
      password: body.password,
      role: body.role,
      tenantId,
    });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT /api/users — update user role
export async function PUT(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'users.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId: targetId, ...updates } = body;

    // Verify target user belongs to same tenant
    const targetUsers = getUsersByTenant(tenantId);
    if (!targetUsers.find((u) => u.id === targetId)) {
      return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });
    }

    const user = updateUser(targetId, updates);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/users — remove user
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'users.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('userId');
    if (!targetId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Verify tenant membership
    const targetUsers = getUsersByTenant(tenantId);
    if (!targetUsers.find((u) => u.id === targetId)) {
      return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });
    }

    deleteUser(targetId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

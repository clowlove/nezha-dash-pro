import { NextRequest, NextResponse } from 'next/server';
import {
  getTenantById, updateTenant, getQuotaUsage,
  upgradePlan, downgradePlan,
} from '@/lib/tenant/tenant-manager';
import { hasPermission } from '@/lib/users/roles';
import type { Role } from '@/lib/users/types';
import type { PlanTier } from '@/lib/tenant/types';

function getAuth(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role') as Role | null;
  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing auth headers');
  }
  return { tenantId, userId, userRole };
}

// GET /api/tenants — get tenant config and quota usage
export async function GET(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (view === 'quota') {
      // Anyone can view quota
      const usage = getQuotaUsage(tenantId);
      const tenant = getTenantById(tenantId);
      return NextResponse.json({
        quota: tenant?.quota,
        usage,
        plan: tenant?.plan,
      });
    }

    if (!hasPermission(userRole, 'settings.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenant = getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    return NextResponse.json({ tenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT /api/tenants — update tenant config or change plan
export async function PUT(req: NextRequest) {
  try {
    const { tenantId, userRole } = getAuth(req);
    if (!hasPermission(userRole, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, ...rest } = body;

    let tenant;
    if (action === 'upgrade') {
      tenant = upgradePlan(tenantId, rest.plan as PlanTier);
    } else if (action === 'downgrade') {
      tenant = downgradePlan(tenantId, rest.plan as PlanTier);
    } else {
      tenant = updateTenant(tenantId, rest);
    }

    return NextResponse.json({ tenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

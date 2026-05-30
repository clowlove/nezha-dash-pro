import { NextRequest, NextResponse } from 'next/server';
import type { DeployTarget, SSHConfig } from '@/lib/deploy/types';

// Shared in-memory store
const targets = new Map<string, DeployTarget>();

function makeId(): string {
  return `tgt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// GET /api/deploy/targets — List all targets
export async function GET() {
  return NextResponse.json({ targets: Array.from(targets.values()) });
}

// POST /api/deploy/targets — Create a target
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ssh, tags, group } = body as {
      name: string;
      ssh: SSHConfig;
      tags?: string[];
      group?: string;
    };

    if (!name || !ssh?.host || !ssh?.port || !ssh?.username || !ssh?.authMethod) {
      return NextResponse.json({ error: 'Missing required SSH fields' }, { status: 400 });
    }

    if (ssh.authMethod === 'password' && !ssh.password) {
      return NextResponse.json({ error: 'Password required for password auth' }, { status: 400 });
    }
    if (ssh.authMethod === 'key' && !ssh.privateKey) {
      return NextResponse.json({ error: 'Private key required for key auth' }, { status: 400 });
    }

    const id = makeId();
    const now = new Date().toISOString();
    const target: DeployTarget = { id, name, ssh, tags, group, createdAt: now, updatedAt: now };
    targets.set(id, target);

    return NextResponse.json({ target }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/deploy/targets?id=xxx — Update a target
export async function PUT(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const existing = targets.get(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const updated: DeployTarget = {
    ...existing,
    ...body,
    id,
    updatedAt: new Date().toISOString(),
  };
  targets.set(id, updated);
  return NextResponse.json({ target: updated });
}

// DELETE /api/deploy/targets?id=xxx
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (!targets.has(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  targets.delete(id);
  return NextResponse.json({ success: true });
}

export { targets as targetsStore };

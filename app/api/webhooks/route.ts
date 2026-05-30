import { NextRequest, NextResponse } from 'next/server';
import { webhookManager } from '@/lib/webhooks/webhook-manager';
import type { WebhookCreateInput, WebhookUpdateInput, WebhookEventType } from '@/lib/webhooks/types';

// Helper to get current user (simplified - use your auth system)
async function getCurrentUser(req: NextRequest): Promise<{ id: string } | null> {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');

  // Check API key first
  if (apiKey) {
    // Validate API key against your auth system
    return { id: 'api-key-user' };
  }

  // Check bearer token
  if (authHeader?.startsWith('Bearer ')) {
    return { id: 'bearer-user' };
  }

  return null;
}

// GET /api/webhooks - List all webhooks
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');
  const event = searchParams.get('event') as WebhookEventType | null;

  const filters: { active?: boolean; event?: WebhookEventType } = {};
  if (active !== null) filters.active = active === 'true';
  if (event) filters.event = event;

  const webhooks = await webhookManager.list(filters);

  // Don't expose secrets in list
  const sanitized = webhooks.map(({ secret, ...rest }) => ({
    ...rest,
    secret: `${secret.slice(0, 12)}...`,
  }));

  return NextResponse.json({ webhooks: sanitized });
}

// POST /api/webhooks - Create a new webhook
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if this is a test request
  const url = new URL(req.url);
  if (url.searchParams.get('action') === 'test') {
    return handleTest(req, user);
  }

  try {
    const body = await req.json();
    const { name, url, events, active, headers } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'events array is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate event types
    const validEvents = ['server.online', 'server.offline', 'alert.triggered', 'alert.resolved', 'deploy.completed'];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const input: WebhookCreateInput = { name, url, events, active, headers };
    const webhook = await webhookManager.create(input, user.id);

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// PUT /api/webhooks - Update an existing webhook
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Validate URL if provided
    if (updates.url) {
      try {
        new URL(updates.url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }

    // Validate events if provided
    if (updates.events) {
      const validEvents = ['server.online', 'server.offline', 'alert.triggered', 'alert.resolved', 'deploy.completed'];
      const invalidEvents = updates.events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid event types: ${invalidEvents.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const input: WebhookUpdateInput = updates;
    const webhook = await webhookManager.update(id, input);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ webhook });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/webhooks - Delete a webhook
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
  }

  const deleted = await webhookManager.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// Test helper
async function handleTest(req: NextRequest, user: { id: string }) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await webhookManager.test(id);
    return NextResponse.json({ test: result });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

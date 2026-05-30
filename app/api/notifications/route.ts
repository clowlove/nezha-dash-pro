/**
 * Notification API - test notifications and manage channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNotificationManager } from '@/lib/notifications/manager';
import { NotificationChannel, ChannelType } from '@/lib/notifications/types';

// GET /api/notifications - List all channels and logs
export async function GET(request: NextRequest) {
  const manager = getNotificationManager();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'logs') {
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    return NextResponse.json({ logs: manager.getLogs(limit) });
  }

  return NextResponse.json({ channels: manager.getAllChannels() });
}

// POST /api/notifications - Create channel, test, or send
export async function POST(request: NextRequest) {
  const manager = getNotificationManager();
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { name, type, config } = body;
    if (!name || !type || !config) {
      return NextResponse.json({ error: 'Missing required fields: name, type, config' }, { status: 400 });
    }

    const validTypes: ChannelType[] = ['telegram', 'discord', 'webhook'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const channel: NotificationChannel = {
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      type,
      enabled: true,
      config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    manager.addChannel(channel);
    return NextResponse.json({ channel }, { status: 201 });
  }

  if (action === 'test') {
    const { channelId } = body;
    if (!channelId) {
      return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
    }
    const result = await manager.testChannel(channelId);
    return NextResponse.json(result);
  }

  if (action === 'send') {
    const { channelIds, message } = body;
    if (!channelIds || !message) {
      return NextResponse.json({ error: 'Missing channelIds or message' }, { status: 400 });
    }
    const logs = await manager.send(channelIds, {
      ...message,
      id: message.id || `msg_${Date.now()}`,
      timestamp: message.timestamp || Date.now(),
      source: message.source || 'api',
    });
    return NextResponse.json({ logs });
  }

  return NextResponse.json({ error: 'Invalid action. Use: create, test, send' }, { status: 400 });
}

// PUT /api/notifications - Update a channel
export async function PUT(request: NextRequest) {
  const manager = getNotificationManager();
  const body = await request.json();
  const { channelId, ...updates } = body;

  if (!channelId) {
    return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
  }

  const updated = manager.updateChannel(channelId, updates);
  if (!updated) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  return NextResponse.json({ channel: updated });
}

// DELETE /api/notifications - Remove a channel
export async function DELETE(request: NextRequest) {
  const manager = getNotificationManager();
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Missing channelId parameter' }, { status: 400 });
  }

  const removed = manager.removeChannel(channelId);
  if (!removed) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

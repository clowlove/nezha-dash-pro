import { NextRequest, NextResponse } from 'next/server';
import { taskRunner } from '@/lib/deploy/task-runner';
import { type AgentInstallOptions, type DeployTarget } from '@/lib/deploy/types';

// In-memory target store (shared with targets route)
const targetsStore = new Map<string, DeployTarget>();

export function getTargetsStore() {
  return targetsStore;
}

// POST /api/deploy — Start a deploy task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetIds, version, serverUrl, serverKey, useSystemd, customArgs } = body;

    if (!targetIds?.length || !version || !serverUrl) {
      return NextResponse.json({ error: 'Missing required fields: targetIds, version, serverUrl' }, { status: 400 });
    }

    const targets: DeployTarget[] = [];
    for (const id of targetIds) {
      const target = targetsStore.get(id);
      if (!target) return NextResponse.json({ error: `Target ${id} not found` }, { status: 404 });
      targets.push(target);
    }

    const options: AgentInstallOptions = {
      version,
      serverUrl,
      serverKey,
      useSystemd,
      customArgs,
    };

    const task = taskRunner.createTask(targetIds, options);

    // Run async, don't await
    taskRunner.runTask(task.id, targets, options).catch(console.error);

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/deploy — List all tasks, or ?id=xxx for specific task
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const task = taskRunner.getTask(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task });
  }

  return NextResponse.json({ tasks: taskRunner.listTasks() });
}

// DELETE /api/deploy?id=xxx — Cancel a task
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 });

  const cancelled = taskRunner.cancelTask(id);
  if (!cancelled) return NextResponse.json({ error: 'Task not found or already finished' }, { status: 404 });

  return NextResponse.json({ success: true });
}

// Plugin Management API Route
// GET    — List all installed plugins with status
// POST   — Install, activate, or deactivate a plugin
// DELETE — Uninstall a plugin

import { NextRequest, NextResponse } from 'next/server';
import {
  loadAllPlugins,
  loadPlugin,
  activatePlugin,
  deactivatePlugin,
  uninstallPlugin,
  getPlugin,
  getAllPlugins,
} from '@/lib/plugins/loader';
import type { PluginManifest } from '@/lib/plugins/types';

// Ensure plugins are loaded on first request
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await loadAllPlugins();
    initialized = true;
  }
}

// --- GET: List all installed plugins ---
export async function GET() {
  try {
    await ensureInitialized();
    const plugins = getAllPlugins().map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      author: p.manifest.author,
      status: p.status,
      hooks: p.manifest.hooks,
      permissions: p.manifest.permissions,
      installedAt: p.installedAt,
      activatedAt: p.activatedAt,
      error: p.error,
    }));

    return NextResponse.json({ plugins });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to list plugins', details: String(err) },
      { status: 500 },
    );
  }
}

// --- POST: Install / Activate / Deactivate ---
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();
    const body = await request.json();
    const { action, pluginId } = body as {
      action: 'install' | 'activate' | 'deactivate';
      pluginId: string;
    };

    if (!action || !pluginId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, pluginId' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'install': {
        // Install loads the plugin from its directory
        const plugin = await loadPlugin(pluginId);
        return NextResponse.json({
          message: `Plugin "${plugin.manifest.name}" installed`,
          plugin: {
            id: plugin.manifest.id,
            name: plugin.manifest.name,
            status: plugin.status,
            error: plugin.error,
          },
        });
      }

      case 'activate': {
        const plugin = await activatePlugin(pluginId);
        return NextResponse.json({
          message: `Plugin "${plugin.manifest.name}" activated`,
          plugin: {
            id: plugin.manifest.id,
            name: plugin.manifest.name,
            status: plugin.status,
          },
        });
      }

      case 'deactivate': {
        const plugin = await deactivatePlugin(pluginId);
        return NextResponse.json({
          message: `Plugin "${plugin.manifest.name}" deactivated`,
          plugin: {
            id: plugin.manifest.id,
            name: plugin.manifest.name,
            status: plugin.status,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use install, activate, or deactivate.` },
          { status: 400 },
        );
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Plugin operation failed', details: String(err) },
      { status: 500 },
    );
  }
}

// --- DELETE: Uninstall a plugin ---
export async function DELETE(request: NextRequest) {
  try {
    await ensureInitialized();
    const { searchParams } = new URL(request.url);
    const pluginId = searchParams.get('pluginId');

    if (!pluginId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: pluginId' },
        { status: 400 },
      );
    }

    const existing = getPlugin(pluginId);
    if (!existing) {
      return NextResponse.json(
        { error: `Plugin "${pluginId}" not found` },
        { status: 404 },
      );
    }

    await uninstallPlugin(pluginId);
    return NextResponse.json({
      message: `Plugin "${pluginId}" uninstalled`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to uninstall plugin', details: String(err) },
      { status: 500 },
    );
  }
}

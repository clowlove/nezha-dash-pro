// Plugin Loader for NezhaDash Pro
// Discovers, validates, loads, and hot-reloads plugins from the /plugins directory

import fs from 'fs/promises';
import path from 'path';
import type {
  Plugin,
  PluginManifest,
  PluginStatus,
  PluginContext,
  PluginPermission,
} from './types';
import { hookSystem } from './hooks';
import { createPluginContext } from './api';

const PLUGINS_DIR = path.join(process.cwd(), 'plugins');
const MAX_LOAD_TIME_MS = 5_000;

/** In-memory registry of loaded plugins */
const pluginRegistry = new Map<string, Plugin>();

/** File watchers for hot-reload */
const watchers = new Map<string, fs.FileHandle>();

// --- Discovery ---

/** Scan the plugins directory and return valid plugin paths */
export async function discoverPlugins(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    const dirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(PLUGINS_DIR, entry.name, 'manifest.json');
        try {
          await fs.access(manifestPath);
          dirs.push(entry.name);
        } catch {
          // No manifest — skip
        }
      }
    }
    return dirs;
  } catch {
    // Plugins directory doesn't exist
    return [];
  }
}

// --- Manifest Validation ---

const VALID_HOOKS = ['onServerData', 'onAlert', 'onNotification', 'onDeploy'] as const;
const VALID_PERMISSIONS: PluginPermission[] = [
  'read:servers', 'read:alerts', 'write:notifications', 'read:metrics', 'read:config',
];

function validateManifest(raw: unknown): PluginManifest {
  if (!raw || typeof raw !== 'object') throw new Error('Manifest must be a JSON object');
  const m = raw as Record<string, unknown>;

  if (!m.id || typeof m.id !== 'string') throw new Error('Missing or invalid "id"');
  if (!m.name || typeof m.name !== 'string') throw new Error('Missing or invalid "name"');
  if (!m.version || typeof m.version !== 'string') throw new Error('Missing or invalid "version"');
  if (!m.description || typeof m.description !== 'string') throw new Error('Missing or invalid "description"');
  if (!m.author || typeof m.author !== 'string') throw new Error('Missing or invalid "author"');
  if (!m.main || typeof m.main !== 'string') throw new Error('Missing or invalid "main"');

  const hooks = Array.isArray(m.hooks) ? m.hooks : [];
  for (const h of hooks) {
    if (!VALID_HOOKS.includes(h as any)) throw new Error(`Unknown hook: ${h}`);
  }

  const permissions = Array.isArray(m.permissions) ? m.permissions : [];
  for (const p of permissions) {
    if (!VALID_PERMISSIONS.includes(p as PluginPermission)) throw new Error(`Unknown permission: ${p}`);
  }

  return {
    id: m.id as string,
    name: m.name as string,
    version: m.version as string,
    description: m.description as string,
    author: m.author as string,
    minAppVersion: m.minAppVersion as string | undefined,
    hooks: hooks as PluginManifest['hooks'],
    permissions: permissions as PluginPermission[],
    main: m.main as string,
  };
}

// --- Sandboxed Execution ---

/** Create a restricted module context for plugin code */
function createSandbox(pluginId: string, permissions: PluginPermission[]): {
  exports: Record<string, unknown>;
  require: (mod: string) => unknown;
} {
  const exports: Record<string, unknown> = {};

  // Only allow safe built-in modules
  const ALLOWED_MODULES = ['events', 'util'];
  const builtinModules = new Map<string, unknown>();
  for (const mod of ALLOWED_MODULES) {
    try {
      builtinModules.set(mod, require(mod));
    } catch { /* module not available */ }
  }

  const restrictedRequire = (mod: string): unknown => {
    if (builtinModules.has(mod)) return builtinModules.get(mod);
    throw new Error(`[Plugin:${pluginId}] Module "${mod}" is not allowed`);
  };

  return { exports, require: restrictedRequire };
}

/** Load and execute a single plugin */
export async function loadPlugin(pluginDirName: string): Promise<Plugin> {
  const pluginPath = path.join(PLUGINS_DIR, pluginDirName);
  const manifestPath = path.join(pluginPath, 'manifest.json');

  // Read and validate manifest
  const manifestRaw = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  const manifest = validateManifest(manifestRaw);

  // Check if already loaded
  const existing = pluginRegistry.get(manifest.id);
  if (existing?.status === 'active') {
    await deactivatePlugin(manifest.id);
  }

  const plugin: Plugin = {
    manifest,
    status: 'installed',
    path: pluginPath,
    installedAt: existing?.installedAt ?? new Date().toISOString(),
    activatedAt: existing?.activatedAt,
  };

  // Load entry point with timeout
  const entryPath = path.join(pluginPath, manifest.main);
  try {
    const code = await fs.readFile(entryPath, 'utf-8');
    const sandbox = createSandbox(manifest.id, manifest.permissions);

    // Use a simple Function wrapper for sandboxed execution
    const wrappedCode = `
      (function(exports, require, module, console) {
        ${code}
      })
    `;

    const execute = eval(wrappedCode) as Function;
    const moduleObj = { exports: {} as Record<string, unknown> };

    // Execute with timeout
    await Promise.race([
      Promise.resolve(execute(sandbox.exports, sandbox.require, moduleObj, createPluginConsole(manifest.id))),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Plugin load timeout')), MAX_LOAD_TIME_MS)
      ),
    ]);

    const pluginExports = moduleObj.exports || sandbox.exports;

    // Extract lifecycle hooks
    if (typeof pluginExports.activate === 'function') {
      plugin.activate = pluginExports.activate;
    }
    if (typeof pluginExports.deactivate === 'function') {
      plugin.deactivate = pluginExports.deactivate;
    }

    plugin.status = 'inactive';
  } catch (err) {
    plugin.status = 'error';
    plugin.error = err instanceof Error ? err.message : String(err);
    console.error(`[PluginLoader] Failed to load ${manifest.id}:`, plugin.error);
  }

  pluginRegistry.set(manifest.id, plugin);
  return plugin;
}

/** Load all discovered plugins */
export async function loadAllPlugins(): Promise<Plugin[]> {
  const pluginDirs = await discoverPlugins();
  const plugins: Plugin[] = [];
  for (const dir of pluginDirs) {
    try {
      plugins.push(await loadPlugin(dir));
    } catch (err) {
      console.error(`[PluginLoader] Error loading ${dir}:`, err);
    }
  }
  return plugins;
}

// --- Plugin Lifecycle ---

export async function activatePlugin(pluginId: string): Promise<Plugin> {
  const plugin = pluginRegistry.get(pluginId);
  if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);
  if (plugin.status === 'error') throw new Error(`Plugin "${pluginId}" has errors: ${plugin.error}`);

  const context = createPluginContext(plugin.manifest.permissions);

  // Register hooks from manifest
  for (const hookName of plugin.manifest.hooks) {
    // Plugins register their hooks via the exported register function
    const pluginExports = require(path.join(plugin.path, plugin.manifest.main));
    if (typeof pluginExports[hookName] === 'function') {
      hookSystem.register({
        pluginId,
        name: hookName,
        handler: pluginExports[hookName],
        priority: 10,
      });
    }
  }

  // Call activate lifecycle
  if (plugin.activate) {
    await plugin.activate();
  }

  plugin.status = 'active';
  plugin.activatedAt = new Date().toISOString();
  return plugin;
}

export async function deactivatePlugin(pluginId: string): Promise<Plugin> {
  const plugin = pluginRegistry.get(pluginId);
  if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

  // Unregister all hooks
  hookSystem.unregisterAll(pluginId);

  // Call deactivate lifecycle
  if (plugin.deactivate) {
    await plugin.deactivate();
  }

  plugin.status = 'inactive';
  return plugin;
}

export async function uninstallPlugin(pluginId: string): Promise<void> {
  const plugin = pluginRegistry.get(pluginId);
  if (!plugin) throw new Error(`Plugin "${pluginId}" not found`);

  if (plugin.status === 'active') {
    await deactivatePlugin(pluginId);
  }

  // Remove plugin directory
  await fs.rm(plugin.path, { recursive: true, force: true });
  pluginRegistry.delete(pluginId);
}

// --- Hot Reload ---

export async function enableHotReload(): Promise<void> {
  const { watch } = await import('fs');
  const watcher = watch(PLUGINS_DIR, { recursive: true }, async (eventType, filename) => {
    if (!filename?.endsWith('manifest.json') && !filename?.endsWith('.ts') && !filename?.endsWith('.js')) return;

    // Extract plugin dir name
    const parts = filename.split(path.sep);
    if (parts.length < 2) return;
    const pluginDirName = parts[0];

    const existing = pluginRegistry.get(pluginDirName);
    if (!existing) {
      // New plugin discovered
      console.log(`[HotReload] New plugin detected: ${pluginDirName}`);
      await loadPlugin(pluginDirName);
      return;
    }

    console.log(`[HotReload] Reloading plugin: ${existing.manifest.id}`);
    const wasActive = existing.status === 'active';
    if (wasActive) await deactivatePlugin(existing.manifest.id);

    // Clear require cache for plugin
    const entryPath = path.join(existing.path, existing.manifest.main);
    delete require.cache[require.resolve(entryPath)];

    await loadPlugin(pluginDirName);
    if (wasActive) {
      try {
        await activatePlugin(existing.manifest.id);
      } catch (err) {
        console.error(`[HotReload] Failed to re-activate ${existing.manifest.id}:`, err);
      }
    }
  });

  // Store watcher reference for cleanup
  watchers.set('__root__', watcher as any);
}

// --- Registry Access ---

export function getPlugin(pluginId: string): Plugin | undefined {
  return pluginRegistry.get(pluginId);
}

export function getAllPlugins(): Plugin[] {
  return Array.from(pluginRegistry.values());
}

// --- Helpers ---

function createPluginConsole(pluginId: string) {
  return {
    log: (...args: unknown[]) => console.log(`[Plugin:${pluginId}]`, ...args),
    warn: (...args: unknown[]) => console.warn(`[Plugin:${pluginId}]`, ...args),
    error: (...args: unknown[]) => console.error(`[Plugin:${pluginId}]`, ...args),
    info: (...args: unknown[]) => console.info(`[Plugin:${pluginId}]`, ...args),
  };
}

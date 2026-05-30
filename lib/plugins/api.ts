// Plugin API Surface for NezhaDash Pro
// Provides restricted, sandboxed access to server data, alerts, and notifications
// Plugins have NO direct database or filesystem access

import type {
  PluginPermission,
  PluginContext,
  PluginServerAPI,
  PluginAlertAPI,
  PluginNotificationAPI,
  PluginLogger,
  ServerInfo,
  AlertInfo,
} from './types';

// --- Data Fetchers (would connect to real NezhaDash API in production) ---

/** Fetch server data from the internal API */
async function fetchServers(): Promise<ServerInfo[]> {
  try {
    const res = await fetch('/api/v1/servers', {
      headers: { 'X-Plugin-Request': 'true' },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** Fetch alert data from the internal API */
async function fetchAlerts(): Promise<AlertInfo[]> {
  try {
    const res = await fetch('/api/v1/alerts', {
      headers: { 'X-Plugin-Request': 'true' },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- API Implementations ---

/** Read-only server data API */
function createServerAPI(): PluginServerAPI {
  return {
    async getAll(): Promise<ServerInfo[]> {
      return fetchServers();
    },
    async getById(id: number): Promise<ServerInfo | null> {
      const servers = await fetchServers();
      return servers.find(s => s.id === id) ?? null;
    },
  };
}

/** Read-only alert data API */
function createAlertAPI(): PluginAlertAPI {
  return {
    async getRecent(limit = 50): Promise<AlertInfo[]> {
      const alerts = await fetchAlerts();
      return alerts.slice(0, limit);
    },
    async getByServer(serverId: number): Promise<AlertInfo[]> {
      const alerts = await fetchAlerts();
      return alerts.filter(a => a.serverId === serverId);
    },
  };
}

/** Notification sending API (requires write:notifications permission) */
function createNotificationAPI(permissions: PluginPermission[]): PluginNotificationAPI {
  const hasPermission = permissions.includes('write:notifications');

  return {
    async send(
      title: string,
      body: string,
      severity: 'info' | 'warning' | 'critical' = 'info',
    ): Promise<void> {
      if (!hasPermission) {
        throw new Error('Plugin does not have write:notifications permission');
      }

      try {
        await fetch('/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Plugin-Request': 'true',
          },
          body: JSON.stringify({ title, body, severity, source: 'plugin' }),
        });
      } catch (err) {
        console.error('[PluginAPI] Failed to send notification:', err);
        throw new Error('Failed to send notification');
      }
    },
  };
}

/** Scoped plugin logger */
function createLogger(pluginId: string): PluginLogger {
  return {
    info: (message: string, ...args: unknown[]) =>
      console.log(`[Plugin:${pluginId}:INFO]`, message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      console.warn(`[Plugin:${pluginId}:WARN]`, message, ...args),
    error: (message: string, ...args: unknown[]) =>
      console.error(`[Plugin:${pluginId}:ERROR]`, message, ...args),
  };
}

// --- Context Factory ---

/**
 * Create a PluginContext with only the APIs the plugin has permission to use.
 * Throws if a plugin tries to access an API without the required permission.
 */
export function createPluginContext(permissions: PluginPermission[]): PluginContext {
  const hasServers = permissions.includes('read:servers');
  const hasAlerts = permissions.includes('read:alerts');
  const hasNotifications = permissions.includes('write:notifications');

  return {
    servers: hasServers
      ? createServerAPI()
      : createDeniedProxy('read:servers'),
    alerts: hasAlerts
      ? createAlertAPI()
      : createDeniedProxy('read:alerts'),
    notifications: hasNotifications
      ? createNotificationAPI(permissions)
      : createDeniedProxy('write:notifications'),
    log: createLogger('unknown'),
  };
}

/**
 * Create a PluginContext bound to a specific plugin ID.
 */
export function createBoundPluginContext(pluginId: string, permissions: PluginPermission[]): PluginContext {
  const ctx = createPluginContext(permissions);
  ctx.log = createLogger(pluginId);
  return ctx;
}

// --- Denied Access Proxy ---

/** Creates a proxy that throws permission errors for every method call */
function createDeniedProxy(permission: string): any {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          return () => {
            throw new Error(`Permission denied: "${permission}" is required to access this API`);
          };
        }
        return undefined;
      },
    },
  );
}

/**
 * Validate that a plugin only requests permissions that exist.
 * Used during plugin installation.
 */
export function validatePermissions(permissions: string[]): boolean {
  const valid: string[] = [
    'read:servers',
    'read:alerts',
    'write:notifications',
    'read:metrics',
    'read:config',
  ];
  return permissions.every(p => valid.includes(p));
}

// Plugin System Types for NezhaDash Pro
// Defines interfaces for plugin manifests, hooks, lifecycle, and context

export type PluginStatus = 'installed' | 'active' | 'inactive' | 'error';

export type PluginHookName =
  | 'onServerData'
  | 'onAlert'
  | 'onNotification'
  | 'onDeploy';

export type PluginPermission =
  | 'read:servers'
  | 'read:alerts'
  | 'write:notifications'
  | 'read:metrics'
  | 'read:config';

/** Metadata defined in manifest.json */
export interface PluginManifest {
  /** Unique plugin identifier (e.g. "example-health-check") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semver version string */
  version: string;
  /** Short description */
  description: string;
  /** Plugin author */
  author: string;
  /** Minimum NezhaDash Pro version required */
  minAppVersion?: string;
  /** Hooks this plugin subscribes to */
  hooks: PluginHookName[];
  /** Permissions the plugin requests */
  permissions: PluginPermission[];
  /** Entry point file (relative to plugin dir) */
  main: string;
}

/** A registered hook callback */
export interface PluginHook {
  /** Plugin that owns this hook */
  pluginId: string;
  /** Hook name */
  name: PluginHookName;
  /** Callback function */
  handler: PluginHookHandler;
  /** Lower number = runs first (default: 10) */
  priority: number;
}

/** Generic hook handler signature */
export type PluginHookHandler = (
  data: unknown,
  context: PluginContext,
) => Promise<unknown> | unknown;

/** Runtime context provided to plugin hooks */
export interface PluginContext {
  /** Read-only access to server data */
  servers: PluginServerAPI;
  /** Read-only access to alert data */
  alerts: PluginAlertAPI;
  /** Send notifications (if permitted) */
  notifications: PluginNotificationAPI;
  /** Plugin-scoped logger */
  log: PluginLogger;
}

/** Runtime plugin instance */
export interface Plugin {
  /** Manifest data */
  manifest: PluginManifest;
  /** Current lifecycle status */
  status: PluginStatus;
  /** Absolute path to plugin directory */
  path: string;
  /** Timestamp when plugin was installed */
  installedAt: string;
  /** Timestamp when plugin was last activated */
  activatedAt?: string;
  /** Error message if status is 'error' */
  error?: string;
  /** Plugin's activate lifecycle hook */
  activate?: () => Promise<void> | void;
  /** Plugin's deactivate lifecycle hook */
  deactivate?: () => Promise<void> | void;
}

// --- Restricted API interfaces ---

export interface ServerInfo {
  id: number;
  name: string;
  host: string;
  status: 'online' | 'offline' | 'unknown';
  cpu: number;
  mem: number;
  uptime: number;
  lastCheck: string;
}

export interface PluginServerAPI {
  getAll(): Promise<ServerInfo[]>;
  getById(id: number): Promise<ServerInfo | null>;
}

export interface AlertInfo {
  id: number;
  serverId: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  resolved: boolean;
}

export interface PluginAlertAPI {
  getRecent(limit?: number): Promise<AlertInfo[]>;
  getByServer(serverId: number): Promise<AlertInfo[]>;
}

export interface PluginNotificationAPI {
  send(title: string, body: string, severity?: 'info' | 'warning' | 'critical'): Promise<void>;
}

export interface PluginLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

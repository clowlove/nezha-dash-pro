'use client';

// PluginManager.tsx — Plugin management UI component
// Lists installed plugins with status, activate/deactivate toggles, install dialog

import React, { useState, useEffect, useCallback } from 'react';

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'installed' | 'active' | 'inactive' | 'error';
  hooks: string[];
  permissions: string[];
  installedAt: string;
  activatedAt?: string;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  installed: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  installed: 'Installed',
  error: 'Error',
};

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installId, setInstallId] = useState('');

  // Fetch plugins
  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins');
      const data = await res.json();
      if (res.ok) {
        setPlugins(data.plugins);
        setError(null);
      } else {
        setError(data.error || 'Failed to load plugins');
      }
    } catch (err) {
      setError('Network error loading plugins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Plugin actions
  const performAction = async (action: string, pluginId: string) => {
    setActionLoading(pluginId);
    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, pluginId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPlugins();
      } else {
        setError(data.details || data.error || `Action "${action}" failed`);
      }
    } catch {
      setError('Network error performing action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm(`Uninstall plugin "${pluginId}"? This cannot be undone.`)) return;
    setActionLoading(pluginId);
    try {
      const res = await fetch(`/api/plugins?pluginId=${encodeURIComponent(pluginId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchPlugins();
      } else {
        const data = await res.json();
        setError(data.error || 'Uninstall failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInstall = async () => {
    if (!installId.trim()) return;
    await performAction('install', installId.trim());
    setShowInstallDialog(false);
    setInstallId('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Plugin Manager</h2>
          <p className="text-sm text-gray-500 mt-1">
            {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} installed
          </p>
        </div>
        <button
          onClick={() => setShowInstallDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Install Plugin
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Plugin list */}
      {plugins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No plugins installed</p>
          <p className="text-sm mt-1">Click "Install Plugin" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map(plugin => (
            <div
              key={plugin.id}
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Plugin info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">{plugin.name}</h3>
                    <span className="text-xs text-gray-400">v{plugin.version}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[plugin.status]}`}>
                      {STATUS_LABELS[plugin.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{plugin.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>by {plugin.author}</span>
                    <span>Hooks: {plugin.hooks.join(', ') || 'none'}</span>
                    <span>Perms: {plugin.permissions.length}</span>
                  </div>
                  {plugin.error && (
                    <p className="text-xs text-red-500 mt-1">Error: {plugin.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {plugin.status === 'active' ? (
                    <button
                      disabled={actionLoading === plugin.id}
                      onClick={() => performAction('deactivate', plugin.id)}
                      className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === plugin.id ? '...' : 'Deactivate'}
                    </button>
                  ) : plugin.status === 'inactive' || plugin.status === 'installed' ? (
                    <button
                      disabled={actionLoading === plugin.id}
                      onClick={() => performAction('activate', plugin.id)}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === plugin.id ? '...' : 'Activate'}
                    </button>
                  ) : null}
                  <button
                    disabled={actionLoading === plugin.id}
                    onClick={() => handleUninstall(plugin.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Install dialog */}
      {showInstallDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">Install Plugin</h3>
            <p className="text-sm text-gray-500 mb-3">
              Enter the plugin directory name from the /plugins folder.
            </p>
            <input
              type="text"
              value={installId}
              onChange={e => setInstallId(e.target.value)}
              placeholder="e.g. example-health-check"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => e.key === 'Enter' && handleInstall()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowInstallDialog(false); setInstallId(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInstall}
                disabled={!installId.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

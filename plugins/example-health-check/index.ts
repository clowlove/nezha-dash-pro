// Example Plugin: Health Check Monitor
// Monitors server health status and sends notifications on state changes

// Track previous server states for change detection
const previousStates = new Map<number, string>();

/**
 * onServerData hook — called whenever server data is fetched.
 * Detects state transitions (online→offline, offline→online) and sends notifications.
 */
async function onServerData(servers: unknown, context: any) {
  const serverList = Array.isArray(servers) ? servers : [];
  context.log.info(`Checking health for ${serverList.length} servers`);

  for (const server of serverList) {
    const { id, name, status, cpu, mem } = server as any;
    const prevStatus = previousStates.get(id);

    // Detect state changes
    if (prevStatus && prevStatus !== status) {
      if (status === 'offline') {
        await context.notifications.send(
          `🔴 Server Offline: ${name}`,
          `Server "${name}" (ID: ${id}) has gone offline. Last known CPU: ${cpu}%, Memory: ${mem}%`,
          'critical',
        );
        context.log.warn(`Server ${name} went offline`);
      } else if (status === 'online' && prevStatus === 'offline') {
        await context.notifications.send(
          `🟢 Server Recovered: ${name}`,
          `Server "${name}" (ID: ${id}) is back online. CPU: ${cpu}%, Memory: ${mem}%`,
          'info',
        );
        context.log.info(`Server ${name} recovered`);
      }
    }

    // Warn on high resource usage
    if (status === 'online') {
      if (cpu > 90) {
        context.log.warn(`Server ${name} CPU usage critical: ${cpu}%`);
      }
      if (mem > 90) {
        context.log.warn(`Server ${name} memory usage critical: ${mem}%`);
      }
    }

    previousStates.set(id, status);
  }

  return servers; // Pass data through unchanged
}

/**
 * onAlert hook — called when a new alert is triggered.
 * Logs alert details for monitoring.
 */
async function onAlert(alert: unknown, context: any) {
  const { serverId, type, message, severity } = alert as any;
  context.log.info(`Alert received for server ${serverId}: [${severity}] ${type} — ${message}`);
  return alert;
}

/**
 * activate — called when the plugin is activated.
 */
function activate() {
  console.log('[HealthCheck] Plugin activated — monitoring started');
}

/**
 * deactivate — called when the plugin is deactivated.
 */
function deactivate() {
  previousStates.clear();
  console.log('[HealthCheck] Plugin deactivated — monitoring stopped');
}

module.exports = {
  onServerData,
  onAlert,
  activate,
  deactivate,
};

# NezhaDash Pro JavaScript SDK

Official JavaScript/TypeScript SDK for interacting with the NezhaDash Pro API.

## Installation

```bash
npm install @nezha-dash/sdk
# or
yarn add @nezha-dash/sdk
# or
pnpm add @nezha-dash/sdk
```

## Quick Start

```typescript
import { NezhaDashClient } from '@nezha-dash/sdk';

const client = new NezhaDashClient({
  baseUrl: 'https://your-nezha-instance.com',
  apiKey: 'your-api-key',
});

// Get all servers
const servers = await client.getServers();
console.log(servers);
```

## Features

- 🔐 **Secure** - API key authentication
- 📦 **TypeScript** - Full type definitions included
- 🔄 **Retries** - Automatic retry with exponential backoff
- ⏱️ **Timeouts** - Configurable request timeouts
- 📚 **Comprehensive** - Covers all NezhaDash Pro API endpoints
- 🪶 **Lightweight** - Zero dependencies (uses native fetch)

## Usage

### Server Management

```typescript
// List all servers
const { servers, total } = await client.getServers({
  page: 1,
  page_size: 20,
  status: 'online',
});

// Get a specific server
const server = await client.getServer(123);
console.log(`${server.name}: ${server.status} - ${server.cpu_percent}% CPU`);

// Get server statistics
const stats = await client.getServerStats(123, '24h');

// Get server history
const history = await client.getServerHistory(123, {
  start: '2024-01-01',
  end: '2024-01-31',
  interval: '1h',
});
```

### Alert Rules

```typescript
// Get all alert rules
const rules = await client.getAlertRules();

// Create a new alert rule
const newRule = await client.createAlertRule({
  name: 'High CPU Alert',
  type: 'cpu',
  operator: '>',
  threshold: 90,
  duration: 300,
  notify_channels: [1, 2],
  enabled: true,
});

// Update an alert rule
await client.updateAlertRule(newRule.id, {
  threshold: 85,
});

// Delete an alert rule
await client.deleteAlertRule(newRule.id);
```

### Alerts

```typescript
// Get active alerts
const { alerts } = await client.getAlerts({
  status: 'active',
  severity: 'critical',
});

// Resolve an alert
await client.resolveAlert(alertId);
```

### Notification Channels

```typescript
// Get all notification channels
const { channels } = await client.getNotificationChannels();

// Create a Telegram notification channel
const channel = await client.createNotificationChannel({
  name: 'Alert Bot',
  type: 'telegram',
  enabled: true,
  config: {
    bot_token: 'your-bot-token',
    chat_id: 'your-chat-id',
  },
});

// Test a notification channel
const result = await client.testNotificationChannel(channel.id);
if (result.success) {
  console.log('Test notification sent successfully');
}
```

### Billing

```typescript
// Get available plans
const plans = await client.getBillingPlans();

// Get current subscription
const subscription = await client.getSubscription();
console.log(`Plan: ${subscription.plan_name}`);
console.log(`Servers: ${subscription.usage.servers}/${subscription.usage.servers}`);

// Get invoices
const { invoices } = await client.getInvoices({ page: 1 });

// Get usage statistics
const usage = await client.getUsage();
```

### Deployments

```typescript
// List deployments
const { deploys } = await client.getDeploys({
  server_id: 123,
  status: 'success',
});

// Create a new deployment
const deploy = await client.createDeploy({
  server_id: 123,
  version: 'v1.2.3',
  config: {
    replicas: 3,
    environment: 'production',
  },
});

// Get deployment logs
const logs = await client.getDeployLogs(deploy.id);

// Cancel a deployment
await client.cancelDeploy(deploy.id);

// Rollback a deployment
const rolledBack = await client.rollbackDeploy(deploy.id);
```

### Webhooks

```typescript
// Create a webhook
const webhook = await client.createWebhook({
  name: 'Deployment Notifications',
  url: 'https://hooks.slack.com/services/xxx',
  events: ['deploy.completed', 'alert.triggered', 'alert.resolved'],
  headers: {
    'X-Custom-Header': 'value',
  },
});

// List webhooks
const webhooks = await client.getWebhooks({ active: true });

// Test a webhook
const testResult = await client.testWebhook(webhook.id);
console.log(`Test ${testResult.success ? 'passed' : 'failed'}`);

// Get webhook deliveries
const deliveries = await client.getWebhookDeliveries(webhook.id, { limit: 10 });

// Update a webhook
await client.updateWebhook(webhook.id, {
  events: ['deploy.completed', 'server.offline'],
});

// Delete a webhook
await client.deleteWebhook(webhook.id);
```

## Configuration Options

```typescript
const client = new NezhaDashClient({
  baseUrl: 'https://your-nezha-instance.com', // Required
  apiKey: 'your-api-key',                      // Required
  timeout: 30000,                              // Request timeout in ms (default: 30000)
  retryCount: 3,                               // Number of retries (default: 3)
  retryDelay: 1000,                            // Base delay between retries in ms (default: 1000)
});
```

## Error Handling

```typescript
import { NezhaDashClient, NezhaDashError } from '@nezha-dash/sdk';

const client = new NezhaDashClient({
  baseUrl: 'https://your-nezha-instance.com',
  apiKey: 'your-api-key',
});

try {
  const server = await client.getServer(999);
} catch (error) {
  if (error instanceof NezhaDashError) {
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Details:`, error.details);
  }
}
```

## Webhook Signature Verification

When receiving webhooks, you should verify the signature:

```typescript
import { WebhookManager } from '@nezha-dash/sdk';

function handleWebhook(req: Request, secret: string) {
  const signature = req.headers.get('x-signature-256');
  const payload = await req.text();

  if (!signature) {
    throw new Error('Missing signature');
  }

  const isValid = WebhookManager.verifySignature(payload, signature, secret);

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // Process the webhook
  const event = JSON.parse(payload);
  console.log('Received event:', event.type);
}
```

## Available Events

| Event | Description |
|-------|-------------|
| `server.online` | Server comes online |
| `server.offline` | Server goes offline |
| `alert.triggered` | Alert threshold exceeded |
| `alert.resolved` | Alert condition resolved |
| `deploy.completed` | Deployment completed |

## API Reference

For detailed API documentation, see the [API Documentation](https://docs.nezha-dash.com/api).

## Examples

### Monitor Server Status

```typescript
async function checkServers(client: NezhaDashClient) {
  const { servers } = await client.getServers();

  for (const server of servers) {
    console.log(`${server.name}: ${server.status}`);
    if (server.status === 'offline') {
      console.warn(`⚠️ ${server.name} is offline!`);
    }
    if (server.cpu_percent > 80) {
      console.warn(`⚠️ ${server.name} CPU usage is high: ${server.cpu_percent}%`);
    }
  }
}
```

### Auto-resolve Old Alerts

```typescript
async function autoResolveAlerts(client: NezhaDashClient, maxAgeHours: number) {
  const { alerts } = await client.getAlerts({ status: 'active' });
  const now = new Date();

  for (const alert of alerts) {
    const triggeredAt = new Date(alert.triggered_at);
    const ageHours = (now.getTime() - triggeredAt.getTime()) / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) {
      await client.resolveAlert(alert.id);
      console.log(`Auto-resolved alert ${alert.id}: ${alert.message}`);
    }
  }
}
```

### Deploy with Monitoring

```typescript
async function deployAndMonitor(client: NezhaDashClient, serverId: number, version: string) {
  // Start deployment
  const deploy = await client.createDeploy({ server_id: serverId, version });
  console.log(`Deploy started: ${deploy.id}`);

  // Poll for completion
  let status = deploy.status;
  while (status === 'pending' || status === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const updated = await client.getDeploy(deploy.id);
    status = updated.status;
    console.log(`Progress: ${updated.progress}%`);
  }

  // Check final status
  const final = await client.getDeploy(deploy.id);
  if (final.status === 'success') {
    console.log('✅ Deployment successful');
  } else {
    console.error('❌ Deployment failed');
    const logs = await client.getDeployLogs(deploy.id);
    console.error(logs.join('\n'));
  }
}
```

## License

MIT © NezhaDash Team

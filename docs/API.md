# NezhaDash Pro — REST API Reference

> Base URL: `http://your-host:3000/api`
>
> All endpoints (except health) require authentication via NextAuth session
> cookie or Bearer token unless otherwise noted.

---

## Table of Contents

- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [Alerts](#alerts)
- [Notifications](#notifications)
- [History](#history)
- [Deploy](#deploy)
- [Billing](#billing)
- [Users & 2FA](#users--2fa)
- [Themes](#themes)
- [Error Codes](#error-codes)

---

## Authentication

### Session-based (browser)

Authenticate via the NextAuth.js login flow at `/api/auth/[...nextauth]`.
Once authenticated, requests are authenticated via the session cookie.

### API Token

```
Authorization: Bearer <your-api-token>
```

Generate tokens via the Users / 2FA API or the admin dashboard.

### Health Check (public)

```
GET /api/health
```

**Response** `200 OK`

```json
{ "status": "ok", "timestamp": 1717000000000 }
```

---

## Core Endpoints

### Get Server List

```
GET /api/server
```

Returns all servers from the active driver in Nezha-compatible format.

**Response** `200 OK`

```json
{
  "live_servers": 12,
  "offline_servers": 1,
  "total_out_bandwidth": 1073741824,
  "total_in_bandwidth": 2147483648,
  "total_out_speed": 1048576,
  "total_in_speed": 2097152,
  "result": [
    {
      "id": 1,
      "name": "Tokyo-01",
      "tag": "JP",
      "last_active": 1717000000,
      "online_status": true,
      "display_index": 0,
      "hide_for_guest": false,
      "host": {
        "Platform": "ubuntu",
        "PlatformVersion": "22.04",
        "CPU": ["AMD EPYC 7763"],
        "MemTotal": 8589934592,
        "DiskTotal": 107374182400,
        "SwapTotal": 0,
        "Arch": "x86_64",
        "Virtualization": "kvm",
        "BootTime": 1716900000,
        "CountryCode": "JP",
        "Version": "0.18.0",
        "GPU": []
      },
      "status": {
        "CPU": 23.5,
        "MemUsed": 4294967296,
        "SwapUsed": 0,
        "DiskUsed": 53687091200,
        "NetInTransfer": 107374182400,
        "NetOutTransfer": 53687091200,
        "NetInSpeed": 1048576,
        "NetOutSpeed": 524288,
        "Uptime": 100000,
        "Load1": 1.2,
        "Load5": 0.8,
        "Load15": 0.5,
        "TcpConnCount": 150,
        "UdpConnCount": 30,
        "ProcessCount": 200,
        "Temperatures": 45,
        "GPU": 0
      }
    }
  ]
}
```

### Get Server Detail

```
GET /api/detail?id={serverId}
```

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | Server ID |

**Response** `200 OK`

Returns the full `NezhaAPI` object including `ipv4`, `ipv6`, `valid_ip`.

### Get Server IP

```
GET /api/server-ip?id={serverId}
```

**Response** `200 OK`

```json
{ "ip": "203.0.113.42" }
```

### Get Monitor Data

```
GET /api/monitor?id={serverId}
```

Returns monitoring history (latency, packet loss) for the given server.

**Response** `200 OK`

```json
{
  "result": [
    {
      "monitor_id": 1,
      "monitor_name": "HTTP Check",
      "server_id": 1,
      "server_name": "Tokyo-01",
      "created_at": [1717000000, 1717000060],
      "avg_delay": [45.2, 43.8],
      "packet_loss": [0, 0]
    }
  ]
}
```

### Get Driver Info

```
GET /api/driver-info
```

Returns information about the active driver and its capabilities.

**Response** `200 OK`

```json
{
  "driver": "nezha",
  "capabilities": {
    "supportsMonitoring": true,
    "supportsRealTimeData": true,
    "supportsHistoricalData": true,
    "supportsIpInfo": true,
    "supportsPacketLoss": true,
    "supportsAlerts": false
  }
}
```

---

## Alerts

### List Alerts

```
GET /api/alerts
```

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter: `active`, `acknowledged`, `resolved` |
| `severity` | string | No | Filter: `info`, `warning`, `critical` |
| `serverId` | number | No | Filter by server |

**Response** `200 OK`

```json
{
  "alerts": [
    {
      "id": "alert_abc123",
      "ruleId": "rule_xyz",
      "serverId": 1,
      "serverName": "Tokyo-01",
      "severity": "warning",
      "status": "active",
      "message": "CPU usage exceeded 90%",
      "metric": "cpu",
      "value": 92.3,
      "threshold": 90,
      "createdAt": 1717000000000,
      "updatedAt": 1717000000000
    }
  ],
  "count": 1
}
```

### Evaluate Alert Rules

```
POST /api/alerts
```

Triggers evaluation of all alert rules against current server data.

**Response** `200 OK`

```json
{ "evaluated": true, "newAlerts": 0, "resolvedAlerts": 1 }
```

### Acknowledge Alert

```
POST /api/alerts
Content-Type: application/json

{
  "action": "acknowledge",
  "alertId": "alert_abc123",
  "acknowledgedBy": "admin"
}
```

### Resolve Alert

```
POST /api/alerts
Content-Type: application/json

{
  "action": "resolve",
  "alertId": "alert_abc123"
}
```

### List Alert Rules

```
GET /api/alerts/rules
```

**Response** `200 OK`

```json
{
  "rules": [
    {
      "id": "rule_xyz",
      "name": "High CPU",
      "serverId": null,
      "metric": "cpu",
      "operator": ">",
      "threshold": 90,
      "duration": 300,
      "severity": "warning",
      "enabled": true,
      "cooldown": 600,
      "createdAt": 1717000000000
    }
  ]
}
```

### Create Alert Rule

```
POST /api/alerts/rules
Content-Type: application/json

{
  "name": "High Memory",
  "serverId": null,
  "metric": "memory",
  "operator": ">",
  "threshold": 85,
  "duration": 120,
  "severity": "warning",
  "enabled": true,
  "cooldown": 300
}
```

**Response** `201 Created`

```json
{ "rule": { "id": "rule_new123", "name": "High Memory", ... } }
```

### Update Alert Rule

```
PUT /api/alerts/rules
Content-Type: application/json

{
  "id": "rule_xyz",
  "threshold": 95
}
```

### Delete Alert Rule

```
DELETE /api/alerts/rules?id=rule_xyz
```

**Response** `200 OK`

```json
{ "deleted": true }
```

---

## Notifications

### List Notification Channels

```
GET /api/notifications
```

**Response** `200 OK`

```json
{
  "channels": [
    {
      "id": "ch_1717000000_abc",
      "name": "Ops Telegram",
      "type": "telegram",
      "enabled": true,
      "config": {
        "botToken": "***",
        "chatId": "-100123456"
      },
      "createdAt": 1717000000000,
      "updatedAt": 1717000000000
    }
  ]
}
```

### Get Notification Logs

```
GET /api/notifications?action=logs&limit=50
```

**Response** `200 OK`

```json
{
  "logs": [
    {
      "id": "log_abc",
      "channelId": "ch_1717000000_abc",
      "channelName": "Ops Telegram",
      "message": "⚠️ CPU > 90% on Tokyo-01",
      "success": true,
      "timestamp": 1717000000000
    }
  ]
}
```

### Create Notification Channel

```
POST /api/notifications
Content-Type: application/json

{
  "action": "create",
  "name": "Discord Alerts",
  "type": "discord",
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/..."
  }
}
```

**Response** `201 Created`

```json
{
  "channel": {
    "id": "ch_1717000001_def",
    "name": "Discord Alerts",
    "type": "discord",
    "enabled": true
  }
}
```

### Test Notification

```
POST /api/notifications
Content-Type: application/json

{
  "action": "test",
  "channelId": "ch_1717000000_abc"
}
```

**Response** `200 OK`

```json
{ "success": true, "message": "Test notification sent" }
```

### Send Notification

```
POST /api/notifications
Content-Type: application/json

{
  "action": "send",
  "channelId": "ch_1717000000_abc",
  "message": "Server maintenance starting in 5 minutes"
}
```

### Delete Notification Channel

```
DELETE /api/notifications?id=ch_1717000000_abc
```

**Response** `200 OK`

```json
{ "deleted": true }
```

---

## History

### Query Historical Metrics

```
GET /api/history
```

**Query Parameters**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `serverId` | string | Yes | — | Server identifier |
| `metric` | string | Yes | — | Metric name: `cpu`, `memory`, `disk`, `network_in`, `network_out`, `load`, `ping` |
| `range` | string | No | `24h` | Time range: `1h`, `6h`, `24h`, `7d`, `30d`, `90d` |
| `start` | number | No | auto | Start timestamp (ms) |
| `end` | number | No | now | End timestamp (ms) |
| `interval` | string | No | auto | Aggregation: `1m`, `5m`, `15m`, `1h`, `6h`, `1d` |
| `limit` | number | No | `1000` | Max data points |

**Response** `200 OK`

```json
{
  "serverId": "1",
  "metric": "cpu",
  "interval": "5m",
  "range": { "start": 1716913600000, "end": 1717000000000 },
  "pointCount": 288,
  "data": [
    { "ts": 1716913600000, "value": 23.5 },
    { "ts": 1716913900000, "value": 25.1 }
  ],
  "latest": { "ts": 1716999900000, "value": 22.8 }
}
```

### Ingest Metrics

```
POST /api/history
Content-Type: application/json

{
  "serverId": "1",
  "metrics": {
    "cpu": 23.5,
    "memory": 65.2,
    "disk": 45.0,
    "network_in": 1048576,
    "network_out": 524288
  }
}
```

**Response** `200 OK`

```json
{ "ingested": true, "metrics": 5 }
```

---

## Deploy

### List Deploy Tasks

```
GET /api/deploy
```

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Specific task ID |

**Response** `200 OK`

```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "targetIds": ["tgt_01", "tgt_02"],
      "status": "completed",
      "progress": 100,
      "results": [
        { "targetId": "tgt_01", "status": "success", "duration": 12000 },
        { "targetId": "tgt_02", "status": "failed", "error": "SSH timeout" }
      ],
      "createdAt": 1717000000000,
      "completedAt": 1717000012000
    }
  ]
}
```

### Start Deploy Task

```
POST /api/deploy
Content-Type: application/json

{
  "targetIds": ["tgt_01", "tgt_02"],
  "version": "0.18.0",
  "serverUrl": "https://nezha.example.com",
  "serverKey": "your-agent-key",
  "useSystemd": true,
  "customArgs": ""
}
```

**Response** `201 Created`

```json
{ "task": { "id": "task_new123", "status": "pending", ... } }
```

### List Deploy Targets

```
GET /api/deploy/targets
```

**Response** `200 OK`

```json
{
  "targets": [
    {
      "id": "tgt_01",
      "name": "Tokyo-01",
      "host": "203.0.113.42",
      "port": 22,
      "user": "root",
      "authMethod": "key"
    }
  ]
}
```

### Create Deploy Target

```
POST /api/deploy/targets
Content-Type: application/json

{
  "name": "Singapore-03",
  "host": "198.51.100.10",
  "port": 22,
  "user": "root",
  "authMethod": "key",
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n..."
}
```

**Response** `201 Created`

### Delete Deploy Target

```
DELETE /api/deploy/targets?id=tgt_01
```

**Response** `200 OK`

---

## Billing

### Get Cost Summary

```
GET /api/billing?action=cost
```

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | No | `cost` (default), `traffic`, `report`, `alerts`, `config`, `hourly` |
| `serverId` | number | Conditional | Required for `traffic` action |
| `startTime` | number | No | Unix ms (default: 30 days ago) |
| `endTime` | number | No | Unix ms (default: now) |
| `year` | number | Conditional | For `report` action |
| `month` | number | Conditional | For `report` action (1-12) |
| `quarter` | number | No | For quarterly report (1-4) |

**Response** `200 OK` (cost summary)

```json
{
  "config": {
    "currency": "USD",
    "rates": {
      "cpu": { "unit": "core-hour", "price": 0.05 },
      "memory": { "unit": "gb-hour", "price": 0.01 },
      "disk": { "unit": "gb-month", "price": 0.10 },
      "bandwidth": { "unit": "gb", "price": 0.05 }
    }
  },
  "totalCost": 42.50,
  "breakdown": [
    { "serverId": 1, "name": "Tokyo-01", "cost": 25.30 },
    { "serverId": 2, "name": "US-East-01", "cost": 17.20 }
  ]
}
```

### Get Traffic Records

```
GET /api/billing?action=traffic&serverId=1&startTime=...&endTime=...
```

### Get Hourly Aggregates

```
GET /api/billing?action=hourly&serverId=1
```

### Generate / Retrieve Report

```
GET /api/billing?action=report&year=2026&month=5
```

### Get Billing Alerts

```
GET /api/billing?action=alerts
```

### Configure Billing Rates

```
POST /api/billing
Content-Type: application/json

{
  "action": "setRate",
  "metric": "cpu",
  "rate": { "unit": "core-hour", "price": 0.04 }
}
```

### Set Currency

```
POST /api/billing
Content-Type: application/json

{
  "action": "setCurrency",
  "currency": "EUR"
}
```

### Export Billing Data

```
GET /api/billing/export?format=csv&serverId=1&startTime=...&endTime=...
```

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | `csv` (default) or `json` |
| `serverId` | number | No | Filter by server |
| `startTime` | number | No | Start timestamp (ms) |
| `endTime` | number | No | End timestamp (ms) |

---

## Users & 2FA

### Setup Two-Factor Authentication

```
POST /api/auth/2fa
Content-Type: application/json

{ "action": "setup" }
```

**Response** `200 OK`

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauthUrl": "otpauth://totp/NezhaDash:user@example.com?secret=...",
  "recoveryCodes": ["ABCD-1234", "EFGH-5678"]
}
```

### Verify & Enable 2FA

```
POST /api/auth/2fa
Content-Type: application/json

{
  "action": "verify",
  "code": "123456"
}
```

### Disable 2FA

```
POST /api/auth/2fa
Content-Type: application/json

{
  "action": "disable",
  "code": "123456"
}
```

### Validate TOTP Code

```
POST /api/auth/2fa
Content-Type: application/json

{
  "action": "validate",
  "code": "123456"
}
```

---

## Themes

### List Themes

```
GET /api/themes
```

**Response** `200 OK`

```json
{
  "themes": [
    {
      "id": "midnight",
      "name": "Midnight",
      "description": "Dark theme with deep blue accents",
      "author": "NezhaDash",
      "isDark": true,
      "colors": {
        "background": "#0f0f23",
        "foreground": "#e0e0e0",
        "primary": "#00d4ff",
        "accent": "#ff6b6b"
      }
    }
  ],
  "count": 3
}
```

### Get Theme by ID

```
GET /api/themes?id=midnight
```

### Create Custom Theme

```
POST /api/themes
Content-Type: application/json

{
  "name": "Corporate Blue",
  "isDark": false,
  "colors": {
    "background": "#ffffff",
    "foreground": "#1a1a2e",
    "primary": "#2563eb",
    "accent": "#f59e0b",
    "destructive": "#ef4444",
    "muted": "#6b7280"
  }
}
```

**Response** `201 Created`

```json
{
  "id": "custom_corporate_blue",
  "name": "Corporate Blue",
  "valid": true
}
```

### Validate Theme

```
POST /api/themes
Content-Type: application/json

{
  "action": "validate",
  "colors": { "background": "#fff", "primary": "#000" }
}
```

---

## Error Codes

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Code | Description |
|:---|:---|:---|
| 400 | `BAD_REQUEST` | Missing or invalid request parameters |
| 401 | `UNAUTHORIZED` | Authentication required or session expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists or state conflict |
| 422 | `VALIDATION_ERROR` | Request body validation failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `DRIVER_ERROR` | Upstream data source returned an error |
| 503 | `SERVICE_UNAVAILABLE` | Service is starting up or temporarily down |

---

## Rate Limiting

API endpoints are rate-limited to **120 requests per minute** per IP address.
When rate-limited, the response includes:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

---

## Pagination

Endpoints that return lists support pagination via query parameters:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number (1-indexed) |
| `limit` | number | `50` | Items per page (max: 200) |

Paginated responses include metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 128,
    "totalPages": 3
  }
}
```

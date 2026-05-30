# NezhaDash Pro — Architecture

> This document describes the high-level architecture, data flow, driver
> pattern, state management, security model, and deployment options of
> NezhaDash Pro.

---

## Table of Contents

- [System Overview](#system-overview)
- [System Diagram](#system-diagram)
- [Data Flow](#data-flow)
- [Driver Pattern](#driver-pattern)
- [State Management](#state-management)
- [Security Model](#security-model)
- [Storage Layer](#storage-layer)
- [Deployment Options](#deployment-options)

---

## System Overview

NezhaDash Pro is a **Next.js 16** full-stack application built on the App
Router with React Server Components (RSC). It provides a monitoring dashboard
that can connect to multiple upstream data sources through a pluggable driver
architecture.

### Key Design Decisions

1. **Driver abstraction** — all monitoring sources present a unified Nezha-compatible interface
2. **Server-first** — data fetching happens on the server via RSC and API routes
3. **SQLite storage** — historical metrics and alerts use a local SQLite database (with PostgreSQL support via Drizzle)
4. **Pluggable notifications** — alerts route through a channel-based notification manager
5. **Edge-friendly** — ISR/SSR caching strategies minimize cold-start latency

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Dashboard │  │  Charts  │  │  Alerts  │  │  Admin Panel  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │              │              │               │            │
│       └──────────────┴──────┬───────┴───────────────┘            │
│                             │  HTTP / RSC                       │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    Next.js App Router                            │
│                             │                                   │
│  ┌──────────────────────────┼──────────────────────────────┐    │
│  │                  API Routes (app/api/)                   │    │
│  │  /server  /detail  /monitor  /alerts  /notifications    │    │
│  │  /history  /deploy  /billing  /themes  /auth/2fa        │    │
│  └──────────────────────────┼──────────────────────────────┘    │
│                             │                                   │
│  ┌──────────────────────────┼──────────────────────────────┐    │
│  │                  Library Layer (lib/)                    │    │
│  │                          │                               │    │
│  │  ┌───────────────────────┼───────────────────────────┐   │    │
│  │  │              Driver Manager                       │   │    │
│  │  │  ┌──────────┬──────────┬──────────┬────────────┐  │   │    │
│  │  │  │  Nezha   │ Komari   │ MyNodeQ  │ UptimeKuma │  │   │    │
│  │  │  │  Driver  │ Driver   │ Driver   │  Driver    │  │   │    │
│  │  │  └──────────┴──────────┴──────────┴────────────┘  │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  │                          │                               │    │
│  │  ┌───────────────┐  ┌────────────┐  ┌────────────────┐  │    │
│  │  │ Alert Manager │  │  Storage   │  │  Notification  │  │    │
│  │  │ & Rules Engine│  │  (SQLite)  │  │    Manager     │  │    │
│  │  └───────────────┘  └────────────┘  └────────────────┘  │    │
│  │                          │                               │    │
│  │  ┌───────────────┐  ┌────────────┐  ┌────────────────┐  │    │
│  │  │  Billing &    │  │   Theme    │  │   Deploy &     │  │    │
│  │  │  Cost Tracker │  │   Engine   │  │   SSH Manager  │  │    │
│  │  └───────────────┘  └────────────┘  └────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   ┌─────┴──────┐   ┌────────┴───────┐   ┌────────┴───────┐
   │   Nezha    │   │   Uptime Kuma  │   │   Komari /     │
   │   Server   │   │   Server       │   │   MyNodeQuery  │
   └────────────┘   └────────────────┘   └────────────────┘
```

---

## Data Flow

### Request Lifecycle

```
1. Browser → HTTP request → Next.js middleware (auth check)
2. Route handler (RSC or API route) → requireApiSession()
3. DriverManager.getCurrentDriver() → active driver instance
4. Driver.fetchXxx() → upstream API (Nezha / Komari / Uptime Kuma / …)
5. Driver converts response → NezhaAPI-compatible format
6. Route handler returns JSON / renders React component
7. Client hydrates / receives JSON response
```

### Polling Flow

```
1. Client polls GET /api/server every N seconds
2. ISR cache revalidates based on config.revalidate
3. Driver fetches fresh data from upstream
4. Alert engine evaluates rules against new data
5. If alerts triggered → NotificationManager sends to channels
6. Storage aggregator writes historical metrics
7. Response returned to client
```

### Alert Evaluation Flow

```
1. New server data arrives (via polling or push)
2. Alert engine evaluates all enabled rules:
   - Compare metric value against threshold
   - Check duration (sustained breach)
   - Apply cooldown period
3. New alert → NotificationManager.dispatch(alert)
4. NotificationManager iterates enabled channels:
   - Telegram (Bot API)
   - Discord (Webhook)
   - Custom Webhook (HTTP POST)
5. Result logged to notification log
```

---

## Driver Pattern

All drivers extend `BaseDriver` which implements the `IDataSourceDriver`
interface. The pattern uses **Template Method** for lifecycle hooks.

### Interface

```typescript
interface IDataSourceDriver {
  readonly name: string
  readonly capabilities: DriverCapabilities
  initialize(config: DriverConfig): Promise<void>
  getServers(): Promise<ServerApi>
  getServerDetail(serverId: number): Promise<NezhaAPI>
  getServerMonitor(serverId: number): Promise<NezhaAPIMonitor[]>
  getServerIP(serverId: number): Promise<string>
  healthCheck(): Promise<boolean>
  dispose(): Promise<void>
}
```

### BaseDriver Template Methods

| Method | When Called | Purpose |
|--------|-----------|---------|
| `onInitialize(config)` | After base validation | Driver-specific setup (auth, validation) |
| `onGetServerMonitor(id)` | When monitoring is supported | Fetch historical data |
| `onGetServerIP(id)` | When IP info is supported | Fetch IP details |
| `onHealthCheck()` | During health check | Verify upstream connectivity |
| `onDispose()` | Before driver teardown | Cleanup caches, connections |

### Driver Capabilities

```typescript
interface DriverCapabilities {
  supportsMonitoring: boolean
  supportsRealTimeData: boolean
  supportsHistoricalData: boolean
  supportsIpInfo: boolean
  supportsPacketLoss: boolean
  supportsAlerts: boolean
}
```

### Registration

Drivers are registered in the factory's `DRIVER_REGISTRY`:

```typescript
const DRIVER_REGISTRY = {
  nezha:        () => new NezhaDriver(),
  komari:       () => new KomariDriver(),
  mynodequery:  () => new MyNodeQueryDriver(),
  uptimekuma:   () => new UptimeKumaDriver(),
} as const
```

### Driver Comparison

| Feature | Nezha | Komari | MyNodeQuery | Uptime Kuma |
|---------|:-----:|:------:|:-----------:|:-----------:|
| Real-time data | ✅ | ✅ | ✅ | ✅ |
| Monitoring charts | ✅ | ❌ | ❌ | ✅ |
| Historical data | ✅ | ❌ | ❌ | ✅ |
| IP info | ✅ | ❌ | ✅ | ❌ |
| Packet loss | ✅ | ❌ | ❌ | ✅ |
| Alerts (native) | ❌ | ❌ | ❌ | ✅ |
| Auth method | Token | None | Session | API Key |

---

## State Management

### Server-Side

- **Driver state** — managed by `DriverManager` singleton, holds the active driver instance
- **SQLite database** — persistent storage for historical metrics, alerts, billing data
- **In-memory caches** — driver-level caches (e.g., node maps, session cookies)

### Client-Side

- **React Query / SWR** — client-side data fetching with stale-while-revalidate
- **URL state** — filters, pagination, and view mode stored in URL search params
- **Theme state** — stored in localStorage, applied via CSS custom properties
- **Auth state** — managed by NextAuth.js session provider

### Data Refresh Strategy

| Data Type | Refresh Method | Interval |
|-----------|---------------|----------|
| Server list | ISR + client polling | 5-30s configurable |
| Monitor charts | Client polling | 30-60s |
| Alerts | Server push + polling | 60s |
| Billing data | On-demand | Manual refresh |
| Themes | On page load | Once per session |

---

## Security Model

### Authentication Layers

1. **Session authentication** — NextAuth.js with secure HTTP-only cookies
2. **API token authentication** — Bearer tokens for programmatic access
3. **Two-factor authentication** — TOTP-based 2FA (Google Authenticator compatible)
4. **OAuth2** — Optional external identity provider support

### Authorization

- Admin-only routes checked via `requireApiSession()` middleware
- Guest routes (public dashboard) available without authentication
- Server IP addresses stripped from guest-visible responses

### Data Protection

- Sensitive fields (IPs, auth tokens) never sent to the client
- Environment variables for secrets (no hardcoded credentials)
- CSRF protection via NextAuth.js built-in mechanisms
- Rate limiting on API endpoints (120 req/min)

### Network Security

- HTTPS recommended for production (via reverse proxy)
- Upstream API keys stored server-side only
- WebSocket connections for real-time data use the same auth mechanism

---

## Storage Layer

### Database (Drizzle ORM)

```sql
-- Historical metrics
CREATE TABLE metrics (
  id        INTEGER PRIMARY KEY,
  server_id TEXT NOT NULL,
  metric    TEXT NOT NULL,
  value     REAL NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Alerts
CREATE TABLE alerts (
  id          TEXT PRIMARY KEY,
  rule_id     TEXT NOT NULL,
  server_id   INTEGER,
  severity    TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Alert rules
CREATE TABLE alert_rules (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  metric     TEXT NOT NULL,
  operator   TEXT NOT NULL,
  threshold  REAL NOT NULL,
  severity   TEXT NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1
);
```

### Aggregation

The storage aggregator rolls up raw metrics into time-bucketed summaries:

| Interval | Resolution | Retention |
|----------|-----------|-----------|
| Raw | 1 point | 24 hours |
| 1 minute | 1m buckets | 7 days |
| 5 minutes | 5m buckets | 30 days |
| 1 hour | 1h buckets | 90 days |
| 1 day | 1d buckets | 1 year |

---

## Deployment Options

### Docker (Recommended)

```bash
docker run -d \
  --name nezha-dash-pro \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL="file:./data/prod.db" \
  -e NEXTAUTH_SECRET="your-secret" \
  nezha-dash/pro:latest
```

### Docker Compose

Full stack with reverse proxy:

```yaml
services:
  nezha-dash:
    image: nezha-dash/pro:latest
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:./data/prod.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

### Vercel

Zero-config deployment for the frontend, with external PostgreSQL:

```
DATABASE_URL=postgresql://user:pass@host:5432/nezha
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

### Manual / Bare Metal

```bash
git clone https://github.com/nezha-dash/pro.git
cd pro
pnpm install
pnpm db:push
pnpm build
pnpm start
```

### Environment Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 20.x | 22.x LTS |
| RAM | 256 MB | 512 MB |
| Disk | 100 MB | 1 GB (with history) |
| CPU | 1 core | 2 cores |

/**
 * SQL migrations for the shared NezhaDash database.
 *
 * Every statement uses IF NOT EXISTS so running them repeatedly is safe.
 * The array is executed in order by `runMigrations()` in database.ts.
 */

export const migrations: string[] = [
  // ── Tenants ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    owner_id    TEXT NOT NULL,
    settings    TEXT NOT NULL DEFAULT '{}',
    quota       TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id)`,

  // ── Teams ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS teams (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    tenant_id   TEXT NOT NULL,
    member_ids  TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id)`,

  // ── Users ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    email          TEXT NOT NULL,
    name           TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    password_salt  TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'viewer',
    tenant_id      TEXT NOT NULL,
    avatar_url     TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1,
    last_login_at  TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_tenant   ON users(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant ON users(email, tenant_id)`,

  // ── Invitations ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS invitations (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',
    team_id     TEXT,
    tenant_id   TEXT NOT NULL,
    invited_by  TEXT NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TEXT NOT NULL,
    accepted_at TEXT,
    created_at  TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON invitations(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_token  ON invitations(token)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_email  ON invitations(email)`,

  // ── Alert Rules ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS alert_rules (
    id                      TEXT PRIMARY KEY,
    name                    TEXT NOT NULL,
    description             TEXT,
    enabled                 INTEGER NOT NULL DEFAULT 1,
    metric                  TEXT NOT NULL,
    operator                TEXT NOT NULL,
    threshold               REAL NOT NULL,
    severity                TEXT NOT NULL,
    duration                INTEGER NOT NULL DEFAULT 0,
    cooldown                INTEGER NOT NULL DEFAULT 600,
    notification_channel_ids TEXT NOT NULL DEFAULT '[]',
    server_ids              TEXT,
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled)`,

  // ── Alerts ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS alerts (
    id                   TEXT PRIMARY KEY,
    rule_id              TEXT NOT NULL,
    rule_name            TEXT NOT NULL,
    server_id            INTEGER NOT NULL,
    server_name          TEXT NOT NULL,
    metric_value         REAL NOT NULL,
    threshold            REAL NOT NULL,
    operator             TEXT NOT NULL,
    severity             TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'active',
    message              TEXT NOT NULL,
    ai_diagnosis         TEXT,
    triggered_at         TEXT NOT NULL,
    resolved_at          TEXT,
    acknowledged_at      TEXT,
    acknowledged_by      TEXT,
    notification_status  TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_status    ON alerts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_rule      ON alerts(rule_id)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_server    ON alerts(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(triggered_at)`,

  // ── Webhooks ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS webhooks (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    url              TEXT NOT NULL,
    secret           TEXT NOT NULL,
    events           TEXT NOT NULL DEFAULT '[]',
    active           INTEGER NOT NULL DEFAULT 1,
    headers          TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    last_triggered_at TEXT,
    failure_count    INTEGER NOT NULL DEFAULT 0,
    created_by       TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active)`,

  // ── Webhook Deliveries ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id               TEXT PRIMARY KEY,
    webhook_id       TEXT NOT NULL,
    event_id         TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    status_code      INTEGER,
    response_body    TEXT,
    request_headers  TEXT NOT NULL DEFAULT '{}',
    request_body     TEXT NOT NULL,
    response_headers TEXT,
    duration         INTEGER,
    attempt          INTEGER NOT NULL DEFAULT 1,
    max_attempts     INTEGER NOT NULL DEFAULT 3,
    next_retry_at    TEXT,
    created_at       TEXT NOT NULL,
    completed_at     TEXT,
    error            TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_wh_deliveries_webhook ON webhook_deliveries(webhook_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wh_deliveries_status  ON webhook_deliveries(status)`,

  // ── Notification Channels ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notification_channels (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    config     TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notif_channels_type ON notification_channels(type)`,

  // ── Notification Logs ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notification_logs (
    id          TEXT PRIMARY KEY,
    channel_id  TEXT NOT NULL,
    message_id  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    error       TEXT,
    sent_at     INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notif_logs_channel ON notification_logs(channel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notif_logs_status  ON notification_logs(status)`,
];

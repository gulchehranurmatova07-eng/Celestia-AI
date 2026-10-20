// Schema migrations, applied automatically (and only once) on first database use.
// Append new migrations to the end; never edit one that has shipped.

export const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: "admin control center",
    sql: `
CREATE TABLE admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('owner','admin','support','analyst')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX admin_users_email_idx ON admin_users (lower(email));

CREATE TABLE admin_sessions (
  token_hash   text PRIMARY KEY,
  admin_id     uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  ip           text,
  user_agent   text
);
CREATE INDEX admin_sessions_admin_idx ON admin_sessions (admin_id);

CREATE TABLE admin_invites (
  token_hash text PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('invite','reset')),
  email      text NOT NULL,
  role       text CHECK (role IN ('owner','admin','support','analyst')),
  admin_id   uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- Append-only, hash-chained audit trail.
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL,
  actor_id    uuid,
  actor_email text,
  action      text NOT NULL,
  target      text,
  details     jsonb NOT NULL DEFAULT '{}',
  ip          text,
  prev_hash   text NOT NULL,
  hash        text NOT NULL
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX audit_log_action_idx ON audit_log (action, at DESC);
CREATE FUNCTION audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_immutable();

-- One row per public chat generation. Never stores message content.
CREATE TABLE ai_requests (
  id                 uuid PRIMARY KEY,
  at                 timestamptz NOT NULL DEFAULT now(),
  session_id         text,
  lang               text,
  model              text NOT NULL,
  served_model       text,
  status             text NOT NULL CHECK (status IN ('success','error','refused','aborted')),
  error_category     text,
  http_status        int,
  latency_ms         int,
  ttft_ms            int,
  input_tokens       int,
  output_tokens      int,
  cache_read_tokens  int,
  cache_write_tokens int,
  cost_usd           numeric(14,8),
  fallback           boolean NOT NULL DEFAULT false,
  turn_count         int
);
CREATE INDEX ai_requests_at_idx ON ai_requests (at DESC);
CREATE INDEX ai_requests_status_idx ON ai_requests (status, at DESC);

CREATE TABLE error_groups (
  fingerprint text PRIMARY KEY,
  source      text NOT NULL,
  category    text NOT NULL,
  severity    text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title       text NOT NULL,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  count       bigint NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored')),
  assignee_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX error_groups_last_seen_idx ON error_groups (last_seen DESC);

CREATE TABLE error_events (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  fingerprint text NOT NULL REFERENCES error_groups(fingerprint) ON DELETE CASCADE,
  message     text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}',
  request_id  uuid,
  path        text
);
CREATE INDEX error_events_fp_idx ON error_events (fingerprint, at DESC);
CREATE INDEX error_events_at_idx ON error_events (at DESC);

CREATE TABLE error_notes (
  id          bigserial PRIMARY KEY,
  fingerprint text NOT NULL REFERENCES error_groups(fingerprint) ON DELETE CASCADE,
  at          timestamptz NOT NULL DEFAULT now(),
  author_id   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  kind        text NOT NULL CHECK (kind IN ('note','status','assign')),
  body        text NOT NULL
);
CREATE INDEX error_notes_fp_idx ON error_notes (fingerprint, at);

-- Anonymous, privacy-conscious product events (no message content, no IPs).
CREATE TABLE analytics_events (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  name       text NOT NULL,
  lang       text,
  props      jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX analytics_events_name_idx ON analytics_events (name, at DESC);
CREATE INDEX analytics_events_at_idx ON analytics_events (at DESC);

CREATE TABLE health_checks (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  service    text NOT NULL,
  status     text NOT NULL CHECK (status IN ('up','degraded','down','unconfigured')),
  latency_ms int,
  detail     text
);
CREATE INDEX health_checks_service_idx ON health_checks (service, at DESC);

CREATE TABLE alerts (
  id              bigserial PRIMARY KEY,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  kind            text NOT NULL,
  dedupe_key      text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title           text NOT NULL,
  detail          jsonb NOT NULL DEFAULT '{}',
  link            text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  acknowledged_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolved_at     timestamptz
);
CREATE UNIQUE INDEX alerts_active_key_idx ON alerts (dedupe_key) WHERE status <> 'resolved';
CREATE INDEX alerts_opened_idx ON alerts (opened_at DESC);

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE settings_history (
  id         bigserial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  key        text NOT NULL,
  old_value  jsonb,
  new_value  jsonb,
  changed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX settings_history_key_idx ON settings_history (key, at DESC);
`,
  },
];

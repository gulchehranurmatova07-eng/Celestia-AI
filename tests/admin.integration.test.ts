import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration tests against a real Postgres. Set TEST_DATABASE_URL to a disposable
// database (it is wiped). Skipped when not set.
const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

const ORIGIN = "http://admin.test";
const SETUP_TOKEN = "test-setup-token-0123456789abcdef";
const OWNER = { email: "owner@webcreators.test", password: "Owner-password-123!", name: "Jack" };

type MockReply = { status: number; body?: unknown; sse?: { text: string; usage: Record<string, number>; stop?: string } };
let mockReply: MockReply = { status: 200 };
let mock: http.Server;

function sse(text: string, usage: Record<string, number>, stop = "end_turn") {
  const ev = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  return (
    ev("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: usage.input_tokens, output_tokens: 1, cache_read_input_tokens: usage.cache_read_input_tokens ?? 0, cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0 } } }) +
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    (text ? ev("content_block_delta", { index: 0, delta: { type: "text_delta", text } }) : "") +
    ev("content_block_stop", { index: 0 }) +
    ev("message_delta", { delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: usage.output_tokens } }) +
    ev("message_stop", {})
  );
}

async function call(
  handler: (...args: never[]) => Promise<Response>,
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string; origin?: string | null; ip?: string; headers?: Record<string, string>; params?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { host: "admin.test", "x-forwarded-for": opts.ip ?? "10.0.0.1", ...opts.headers };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const req = new Request(`${ORIGIN}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const res = await (handler as (r: Request, c?: unknown) => Promise<Response>)(req, opts.params ? { params: Promise.resolve(opts.params) } : undefined);
  const setCookie = res.headers.get("set-cookie");
  const cookie = setCookie ? setCookie.split(";")[0] : undefined;
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body
  }
  return { status: res.status, json, text, cookie };
}

suite("admin control center (integration)", () => {
  let db: typeof import("@/lib/server/db");
  let setup: typeof import("@/app/api/admin/auth/setup/route");
  let login: typeof import("@/app/api/admin/auth/login/route");
  let invite: typeof import("@/app/api/admin/auth/invite/route");
  let team: typeof import("@/app/api/admin/team/route");
  let teamMember: typeof import("@/app/api/admin/team/[id]/route");
  let settingsApi: typeof import("@/app/api/admin/settings/route");
  let exportApi: typeof import("@/app/api/admin/export/requests/route");
  let activity: typeof import("@/app/api/admin/activity/route");
  let chat: typeof import("@/app/api/chat/route");
  let telemetry: typeof import("@/app/api/telemetry/route");
  let auditMod: typeof import("@/lib/server/audit");
  let metrics: typeof import("@/lib/server/metrics");
  let ownerCookie = "";

  beforeAll(async () => {
    mock = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        if (mockReply.sse) {
          res.writeHead(200, { "content-type": "text/event-stream" });
          res.end(sse(mockReply.sse.text, mockReply.sse.usage, mockReply.sse.stop));
        } else {
          res.writeHead(mockReply.status, { "content-type": "application/json" });
          res.end(JSON.stringify(mockReply.body ?? {}));
        }
      });
    });
    await new Promise<void>((r) => mock.listen(0, "127.0.0.1", r));
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(mock.address() as AddressInfo).port}`;
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.DATABASE_URL = TEST_DB;
    delete process.env.ADMIN_SETUP_TOKEN;

    const postgres = (await import("postgres")).default;
    const raw = postgres(TEST_DB!, { onnotice: () => {} });
    await raw.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await raw.end();

    db = await import("@/lib/server/db");
    setup = await import("@/app/api/admin/auth/setup/route");
    login = await import("@/app/api/admin/auth/login/route");
    invite = await import("@/app/api/admin/auth/invite/route");
    team = await import("@/app/api/admin/team/route");
    teamMember = await import("@/app/api/admin/team/[id]/route");
    settingsApi = await import("@/app/api/admin/settings/route");
    exportApi = await import("@/app/api/admin/export/requests/route");
    activity = await import("@/app/api/admin/activity/route");
    chat = await import("@/app/api/chat/route");
    telemetry = await import("@/app/api/telemetry/route");
    auditMod = await import("@/lib/server/audit");
    metrics = await import("@/lib/server/metrics");
  });

  afterAll(async () => {
    await db?.closeDb();
    await new Promise<void>((r) => mock.close(() => r()));
  });

  it("setup is unavailable without ADMIN_SETUP_TOKEN", async () => {
    const r = await call(setup.GET, "/api/admin/auth/setup");
    expect(r.json).toMatchObject({ database: true, available: false, tokenConfigured: false });
  });

  it("bootstraps the first owner only with the correct setup token, once", async () => {
    process.env.ADMIN_SETUP_TOKEN = SETUP_TOKEN;
    const bad = await call(setup.POST, "/api/admin/auth/setup", { method: "POST", body: { ...OWNER, token: "wrong-token" } });
    expect(bad.status).toBe(401);
    const weak = await call(setup.POST, "/api/admin/auth/setup", { method: "POST", body: { ...OWNER, password: "short", token: SETUP_TOKEN } });
    expect(weak.status).toBe(400);
    const ok = await call(setup.POST, "/api/admin/auth/setup", { method: "POST", body: { ...OWNER, token: SETUP_TOKEN } });
    expect(ok.status).toBe(200);
    expect(ok.cookie).toMatch(/^celestia_admin=/);
    ownerCookie = ok.cookie!;
    const again = await call(setup.POST, "/api/admin/auth/setup", { method: "POST", body: { ...OWNER, email: "x@y.test", token: SETUP_TOKEN } });
    expect(again.status).toBe(404);
  });

  it("denies admin APIs without a valid session", async () => {
    expect((await call(team.GET, "/api/admin/team")).status).toBe(401);
    expect((await call(activity.GET, "/api/admin/activity", { cookie: "celestia_admin=forged-token-value-1234567890" })).status).toBe(401);
    expect((await call(exportApi.GET, "/api/admin/export/requests")).status).toBe(401);
    expect((await call(team.GET, "/api/admin/team", { cookie: ownerCookie })).status).toBe(200);
  });

  it("rejects cross-origin writes even with a valid session (CSRF)", async () => {
    const r = await call(settingsApi.PATCH, "/api/admin/settings", {
      method: "PATCH",
      cookie: ownerCookie,
      origin: "https://evil.example",
      body: { key: "retention.days", value: 30 },
    });
    expect(r.status).toBe(403);
    const noOrigin = await call(login.POST, "/api/admin/auth/login", { method: "POST", origin: null, body: { email: OWNER.email, password: OWNER.password } });
    expect(noOrigin.status).toBe(403);
  });

  it("throttles repeated failed logins", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await call(login.POST, "/api/admin/auth/login", { method: "POST", ip: "10.9.9.9", body: { email: "nobody@x.test", password: "wrong-password-1" } });
      expect(r.status).toBe(401);
    }
    const blocked = await call(login.POST, "/api/admin/auth/login", { method: "POST", ip: "10.9.9.9", body: { email: OWNER.email, password: OWNER.password } });
    expect(blocked.status).toBe(429);
    const good = await call(login.POST, "/api/admin/auth/login", { method: "POST", ip: "10.0.0.2", body: { email: OWNER.email, password: OWNER.password } });
    expect(good.status).toBe(200);
  });

  let analystCookie = "";
  let adminCookie = "";
  let adminId = "";
  let ownerId = "";

  it("onboards team members only through invites, with enforced roles", async () => {
    const mk = async (email: string, role: string, name: string) => {
      const inv = await call(team.POST, "/api/admin/team", { method: "POST", cookie: ownerCookie, body: { action: "invite", email, role } });
      expect(inv.status).toBe(200);
      const token = new URL(inv.json.url as string).searchParams.get("token")!;
      expect((await call(invite.GET, `/api/admin/auth/invite?token=${token}`)).json).toMatchObject({ email, role });
      const accepted = await call(invite.POST, "/api/admin/auth/invite", { method: "POST", body: { token, name, password: "Member-password-42" } });
      expect(accepted.status).toBe(200);
      const reuse = await call(invite.POST, "/api/admin/auth/invite", { method: "POST", body: { token, name, password: "Member-password-42" } });
      expect(reuse.status).toBe(404); // one-time
      return accepted.cookie!;
    };
    analystCookie = await mk("analyst@webcreators.test", "analyst", "Ana");
    adminCookie = await mk("admin@webcreators.test", "admin", "Don");
    const list = await call(team.GET, "/api/admin/team", { cookie: ownerCookie });
    const admins = list.json.admins as { id: string; email: string }[];
    adminId = admins.find((a) => a.email === "admin@webcreators.test")!.id;
    ownerId = admins.find((a) => a.email === OWNER.email)!.id;
  });

  it("enforces permissions on the server", async () => {
    // Read-only analyst
    expect((await call(settingsApi.PATCH, "/api/admin/settings", { method: "PATCH", cookie: analystCookie, body: { key: "retention.days", value: 30 } })).status).toBe(403);
    expect((await call(team.POST, "/api/admin/team", { method: "POST", cookie: analystCookie, body: { action: "invite", email: "z@z.test", role: "owner" } })).status).toBe(403);
    expect((await call(exportApi.GET, "/api/admin/export/requests", { cookie: analystCookie })).status).toBe(200);
    // Administrator cannot elevate itself or touch owners
    const self = await call(teamMember.PATCH, `/api/admin/team/${adminId}`, { method: "PATCH", cookie: adminCookie, params: { id: adminId }, body: { action: "role", role: "owner", confirm: true } });
    expect(self.status).toBe(403);
    const inviteOwner = await call(team.POST, "/api/admin/team", { method: "POST", cookie: adminCookie, body: { action: "invite", email: "o2@x.test", role: "owner" } });
    expect(inviteOwner.status).toBe(403);
    const demoteOwner = await call(teamMember.PATCH, `/api/admin/team/${ownerId}`, { method: "PATCH", cookie: adminCookie, params: { id: ownerId }, body: { action: "suspend", confirm: true } });
    expect(demoteOwner.status).toBe(403);
    // Destructive actions require explicit confirmation
    const noConfirm = await call(teamMember.PATCH, `/api/admin/team/${adminId}`, { method: "PATCH", cookie: ownerCookie, params: { id: adminId }, body: { action: "suspend" } });
    expect(noConfirm.json.error).toBe("confirmation_required");
  });

  it("revokes access immediately when an admin is suspended", async () => {
    const r = await call(teamMember.PATCH, `/api/admin/team/${adminId}`, { method: "PATCH", cookie: ownerCookie, params: { id: adminId }, body: { action: "suspend", confirm: true } });
    expect(r.status).toBe(200);
    expect((await call(team.GET, "/api/admin/team", { cookie: adminCookie })).status).toBe(401);
    const relogin = await call(login.POST, "/api/admin/auth/login", { method: "POST", ip: "10.0.0.3", body: { email: "admin@webcreators.test", password: "Member-password-42" } });
    expect(relogin.status).toBe(401);
  });

  it("validates, confirms, audits and rolls back settings", async () => {
    const bad = await call(settingsApi.PATCH, "/api/admin/settings", { method: "PATCH", cookie: ownerCookie, body: { key: "retention.days", value: 2 } });
    expect(bad.status).toBe(400);
    const unconfirmed = await call(settingsApi.PATCH, "/api/admin/settings", { method: "PATCH", cookie: ownerCookie, body: { key: "ai.model", value: "claude-haiku-5-5" } });
    expect(unconfirmed.json.error).toBe("confirmation_required");
    const ok = await call(settingsApi.PATCH, "/api/admin/settings", { method: "PATCH", cookie: ownerCookie, body: { key: "ai.model", value: "claude-haiku-5-5", confirm: true } });
    expect(ok.status).toBe(200);
    const sql = await db.requireDb();
    const [h] = await sql<{ id: string }[]>`SELECT id FROM settings_history WHERE key = 'ai.model' ORDER BY id DESC LIMIT 1`;
    await call(settingsApi.PATCH, "/api/admin/settings", { method: "PATCH", cookie: ownerCookie, body: { key: "retention.days", value: 30 } });
    const [rh] = await sql<{ id: string }[]>`SELECT id FROM settings_history WHERE key = 'retention.days' ORDER BY id DESC LIMIT 1`;
    const rb = await call(settingsApi.POST, "/api/admin/settings", { method: "POST", cookie: ownerCookie, body: { action: "rollback", historyId: Number(rh.id), confirm: true } });
    expect(rb.status).toBe(200);
    const rows = await sql`SELECT key FROM settings WHERE key = 'retention.days'`;
    expect(rows.length).toBe(0); // back to default
    expect(Number(h.id)).toBeGreaterThan(0);
  });

  it("records successful chat generations with tokens, latency and estimated cost (no content)", async () => {
    mockReply = { status: 200, sse: { text: "Hello from Celestia", usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } };
    const r = await call(chat.POST as never, "/api/chat", {
      method: "POST",
      headers: { "x-celestia-session": "abcdefghijklmnop1234" },
      body: { messages: [{ role: "user", content: "How much does a website cost?" }], lang: "en" },
    });
    expect(r.status).toBe(200);
    expect(r.text).toContain('"type":"done"');
    const sql = await db.requireDb();
    const [row] = await sql<{ status: string; model: string; input_tokens: number; output_tokens: number; cost_usd: string; session_id: string }[]>`
      SELECT status, model, input_tokens, output_tokens, cost_usd, session_id FROM ai_requests ORDER BY at DESC LIMIT 1`;
    expect(row).toMatchObject({ status: "success", model: "claude-haiku-5-5", input_tokens: 1200, output_tokens: 300, session_id: "abcdefghijklmnop1234" });
    expect(Number(row.cost_usd)).toBeCloseTo((1200 * 0.1 + 300 * 0.5) / 1e6, 10);
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_requests'`;
    expect(cols.map((c) => c.column_name)).not.toContain("content");
  });

  it("captures provider failures as grouped errors with a request reference", async () => {
    mockReply = { status: 400, body: { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } } };
    const body = { messages: [{ role: "user", content: "hi" }], lang: "en" };
    const first = await call(chat.POST as never, "/api/chat", { method: "POST", ip: "10.1.0.1", body });
    expect(first.text).toContain('"code":"not_configured"');
    await call(chat.POST as never, "/api/chat", { method: "POST", ip: "10.1.0.2", body });
    const sql = await db.requireDb();
    const [g] = await sql<{ category: string; severity: string; count: number }[]>`
      SELECT category, severity, count::int FROM error_groups WHERE source = 'ai' AND category = 'billing'`;
    expect(g).toMatchObject({ category: "billing", severity: "critical", count: 2 });
    const [e] = await sql<{ request_id: string | null }[]>`SELECT request_id FROM error_events ORDER BY id DESC LIMIT 1`;
    expect(e.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("computes dashboard metrics that match the underlying rows", async () => {
    const sql = await db.requireDb();
    await sql`DELETE FROM ai_requests`;
    const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    for (const [i, ms] of latencies.entries()) {
      await sql`INSERT INTO ai_requests (id, model, status, latency_ms, input_tokens, output_tokens, cost_usd, session_id)
        VALUES (gen_random_uuid(), 'claude-haiku-5-5', 'success', ${ms}, 100, 50, 0.001, ${"s" + (i % 3)})`;
    }
    await sql`INSERT INTO ai_requests (id, model, status, error_category, latency_ms) VALUES (gen_random_uuid(), 'claude-haiku-5-5', 'error', 'timeout', 60000)`;
    const k = await metrics.kpis(sql, metrics.parseRange({ range: "24h" }));
    // percentile_cont(0.95) over 10 values: 900 + 0.55 * 100
    expect(k).toMatchObject({ requests: 11, success: 10, failed: 1, conversations: 3, inputTokens: 1000, outputTokens: 500 });
    expect(k.p95LatencyMs).toBeCloseTo(955, 6);
    expect(k.avgLatencyMs).toBeCloseTo(550, 6);
    expect(k.costUsd).toBeCloseTo(0.01, 10);
    expect(k.successRate).toBeCloseTo(10 / 11, 10);
    const series = await metrics.requestSeries(sql, metrics.parseRange({ range: "24h" }));
    expect(series.reduce((a, p) => a + p.success, 0)).toBe(10);
    expect(series.length).toBeGreaterThanOrEqual(24);
  });

  it("stores only allowlisted anonymous telemetry", async () => {
    const req = (payload: unknown) =>
      telemetry.POST(new Request(`${ORIGIN}/api/telemetry`, { method: "POST", headers: { "x-forwarded-for": "10.2.0.1" }, body: JSON.stringify(payload) }));
    await req({ sid: "abcdefghijklmnop5678", lang: "ru", events: [{ name: "page_view" }, { name: "cta_clicked", props: { cta: "discuss", email: "leak@x.test" } }, { name: "evil_event" }] });
    await req({ sid: "bad sid!", events: [{ name: "page_view" }] });
    const sql = await db.requireDb();
    const rows = await sql<{ name: string; props: Record<string, string>; lang: string }[]>`SELECT name, props, lang FROM analytics_events ORDER BY id`;
    expect(rows.map((r) => r.name)).toEqual(["page_view", "cta_clicked"]);
    expect(rows[1].props).toEqual({ cta: "discuss" });
    expect(rows[0].lang).toBe("ru");
  });

  it("keeps a tamper-evident, append-only audit log", async () => {
    const sql = await db.requireDb();
    const ok = await auditMod.verifyAuditChain(sql);
    expect(ok.ok).toBe(true);
    expect(ok.checked).toBeGreaterThan(10);
    await expect(sql`UPDATE audit_log SET action = 'x' WHERE id = 1`).rejects.toThrow(/append-only/);
    await expect(sql`DELETE FROM audit_log`).rejects.toThrow(/append-only/);
    // Simulate a privileged attacker bypassing the trigger: the hash chain still detects it.
    await sql`ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_update`;
    await sql`UPDATE audit_log SET details = '{"tampered":true}' WHERE id = 3`;
    await sql`ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_update`;
    const broken = await auditMod.verifyAuditChain(sql);
    expect(broken).toMatchObject({ ok: false, brokenAt: 3 });
    const actions = await sql<{ action: string }[]>`SELECT DISTINCT action FROM audit_log`;
    expect(actions.map((a) => a.action)).toEqual(
      expect.arrayContaining(["team.owner_bootstrapped", "auth.login_failed", "auth.login", "team.invite_created", "team.suspended", "settings.changed", "settings.rolled_back", "auth.permission_denied", "data.exported"]),
    );
  });
});

import { NextResponse } from "next/server";
import { can, isRole, type Permission, type Role } from "../roles";
import { appendAudit } from "./audit";
import { getDb, type Sql } from "./db";
import {
  clientIp,
  isSameOrigin,
  newToken,
  sessionCookie,
  sha256,
  SESSION_COOKIE,
  SESSION_IDLE_MS,
  SESSION_TTL_MS,
} from "./security";

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionHash: string;
};

export async function createSession(sql: Sql, adminId: string, headers: Headers): Promise<string> {
  const token = newToken();
  await sql`
    INSERT INTO admin_sessions (token_hash, admin_id, expires_at, ip, user_agent)
    VALUES (${sha256(token)}, ${adminId}, ${new Date(Date.now() + SESSION_TTL_MS)},
            ${clientIp(headers)}, ${(headers.get("user-agent") ?? "").slice(0, 300)})`;
  return token;
}

/** Resolves a raw session token to an active admin. Enforces expiry, idle timeout and suspension. */
export async function resolveSession(sql: Sql, token: string | undefined | null): Promise<AdminIdentity | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const hash = sha256(token);
  const [row] = await sql<
    { id: string; email: string; name: string; role: string; status: string; last_seen_at: Date; expires_at: Date; revoked_at: Date | null }[]
  >`
    SELECT u.id, u.email, u.name, u.role, u.status, s.last_seen_at, s.expires_at, s.revoked_at
    FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
    WHERE s.token_hash = ${hash}`;
  if (!row || row.revoked_at || row.status !== "active" || !isRole(row.role)) return null;
  const now = Date.now();
  if (row.expires_at.getTime() <= now || now - row.last_seen_at.getTime() > SESSION_IDLE_MS) return null;
  if (now - row.last_seen_at.getTime() > 60_000) {
    await sql`UPDATE admin_sessions SET last_seen_at = now() WHERE token_hash = ${hash}`;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, sessionHash: hash };
}

function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function sessionTokenFrom(headers: Headers): string | null {
  return readCookie(headers, SESSION_COOKIE());
}

export const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

export type AdminContext = { sql: Sql; admin: AdminIdentity; ip: string; audit: (action: string, target?: string | null, details?: Record<string, unknown>) => Promise<void> };

/**
 * Guard for every admin API route. Denies by default:
 * 503 without a database, 403 on cross-origin writes, 401 without a valid session,
 * 403 without the required permission.
 */
export async function requireAdminApi(
  req: Request,
  permission: Permission,
): Promise<{ ok: true; ctx: AdminContext } | { ok: false; res: Response }> {
  const sql = await getDb().catch(() => null);
  if (!sql) return { ok: false, res: json({ error: "database_unavailable" }, 503) };

  const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (write && !isSameOrigin(req.headers)) return { ok: false, res: json({ error: "forbidden_origin" }, 403) };

  const admin = await resolveSession(sql, sessionTokenFrom(req.headers));
  if (!admin) return { ok: false, res: json({ error: "unauthorized" }, 401) };

  const ip = clientIp(req.headers);
  if (!can(admin.role, permission)) {
    await appendAudit(sql, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "auth.permission_denied",
      target: new URL(req.url).pathname,
      details: { permission, method: req.method },
      ip,
    });
    return { ok: false, res: json({ error: "forbidden" }, 403) };
  }

  const audit = (action: string, target?: string | null, details?: Record<string, unknown>) =>
    appendAudit(sql, { actorId: admin.id, actorEmail: admin.email, action, target, details, ip });
  return { ok: true, ctx: { sql, admin, ip, audit } };
}

export function withSessionCookie(res: NextResponse, token: string): NextResponse {
  res.headers.append("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", sessionCookie("", 0));
  return res;
}

export async function readJson(req: Request, maxBytes = 50_000): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Login throttling backed by the audit log, so it works across serverless instances. */
export async function loginBlocked(sql: Sql, email: string, ip: string): Promise<boolean> {
  const [row] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM audit_log
    WHERE action = 'auth.login_failed' AND at > now() - interval '15 minutes'
      AND (ip = ${ip} OR details->>'email' = ${email.toLowerCase()})`;
  return (row?.n ?? 0) >= 5;
}

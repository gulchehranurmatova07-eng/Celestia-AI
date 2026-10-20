import { appendAudit } from "@/lib/server/audit";
import { createSession, json, loginBlocked, readJson, withSessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { recordError } from "@/lib/server/errors";
import { clientIp, dummyPasswordHash, isEmail, isSameOrigin, verifyPassword } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sql = await getDb().catch(() => null);
  if (!sql) return json({ error: "database_unavailable" }, 503);
  if (!isSameOrigin(req.headers)) return json({ error: "forbidden_origin" }, 403);

  const body = await readJson(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password || password.length > 200) return json({ error: "invalid_credentials" }, 400);

  const ip = clientIp(req.headers);
  if (await loginBlocked(sql, email, ip)) {
    await appendAudit(sql, { action: "auth.login_blocked", details: { email }, ip });
    return json({ error: "too_many_attempts" }, 429, { "Retry-After": "900" });
  }

  const [user] = await sql<{ id: string; email: string; password_hash: string; status: string }[]>`
    SELECT id, email, password_hash, status FROM admin_users WHERE lower(email) = ${email}`;
  // Always run one scrypt verification so timing does not reveal which emails exist.
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()));

  if (!user || !valid || user.status !== "active") {
    const reason = !user ? "unknown_email" : !valid ? "bad_password" : "suspended";
    await appendAudit(sql, { actorId: user?.id ?? null, action: "auth.login_failed", details: { email, reason }, ip });
    await recordError({
      source: "auth",
      category: "login_failed",
      severity: "low",
      title: "Admin login failed",
      message: `Admin login failed (${reason})`,
      detail: { reason },
      path: "/api/admin/auth/login",
    });
    return json({ error: user?.status === "suspended" && valid ? "account_suspended" : "invalid_credentials" }, 401);
  }

  const token = await createSession(sql, user.id, req.headers);
  await sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${user.id}`;
  await appendAudit(sql, { actorId: user.id, actorEmail: user.email, action: "auth.login", ip });
  return withSessionCookie(json({ ok: true }), token);
}

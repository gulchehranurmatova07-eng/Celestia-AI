import { appendAudit } from "@/lib/server/audit";
import { createSession, json, loginBlocked, readJson, withSessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { cleanText, clientIp, hashPassword, isEmail, isSameOrigin, passwordProblem, safeEqual } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time bootstrap of the first Owner. Only works while no admin exists and
// ADMIN_SETUP_TOKEN (a long random secret set in the hosting environment) matches.
// There is no public registration: every later admin joins through an invite.

function setupToken(): string | null {
  const t = process.env.ADMIN_SETUP_TOKEN?.trim();
  return t && t.length >= 24 ? t : null;
}

async function adminCount() {
  const sql = await getDb().catch(() => null);
  if (!sql) return { sql: null, count: -1 };
  const [row] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_users`;
  return { sql, count: row.n };
}

export async function GET() {
  const { sql, count } = await adminCount();
  return json({ database: !!sql, available: !!sql && count === 0 && !!setupToken(), tokenConfigured: !!setupToken() });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ error: "forbidden_origin" }, 403);
  const { sql, count } = await adminCount();
  const expected = setupToken();
  if (!sql) return json({ error: "database_unavailable" }, 503);
  if (count !== 0 || !expected) return json({ error: "setup_unavailable" }, 404);

  const ip = clientIp(req.headers);
  const body = await readJson(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (await loginBlocked(sql, email || "setup", ip)) return json({ error: "too_many_attempts" }, 429);

  if (typeof body?.token !== "string" || !safeEqual(body.token.trim(), expected)) {
    await appendAudit(sql, { action: "auth.login_failed", details: { email: email || "setup", reason: "bad_setup_token" }, ip });
    return json({ error: "invalid_setup_token" }, 401);
  }
  const name = cleanText(body?.name, 80);
  if (!isEmail(email) || !name) return json({ error: "invalid_input" }, 400);
  const problem = passwordProblem(body?.password);
  if (problem) return json({ error: "weak_password", message: problem }, 400);

  const hash = await hashPassword(body!.password as string);
  const created = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274003)`;
    const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_users`;
    if (n !== 0) return null;
    const [u] = await tx<{ id: string }[]>`
      INSERT INTO admin_users (email, name, password_hash, role) VALUES (${email}, ${name}, ${hash}, 'owner') RETURNING id`;
    return u;
  });
  if (!created) return json({ error: "setup_unavailable" }, 404);

  await appendAudit(sql, { actorId: created.id, actorEmail: email, action: "team.owner_bootstrapped", target: email, ip });
  const token = await createSession(sql, created.id, req.headers);
  await appendAudit(sql, { actorId: created.id, actorEmail: email, action: "auth.login", ip });
  return withSessionCookie(json({ ok: true }), token);
}

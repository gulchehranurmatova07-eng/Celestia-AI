import { appendAudit } from "@/lib/server/audit";
import { createSession, json, readJson, withSessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { cleanText, clientIp, hashPassword, isSameOrigin, passwordProblem, sha256 } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Invite = { token_hash: string; kind: "invite" | "reset"; email: string; role: string | null; admin_id: string | null };

async function findInvite(token: unknown) {
  const sql = await getDb().catch(() => null);
  if (!sql || typeof token !== "string" || token.length < 20 || token.length > 100) return { sql, invite: null };
  const [invite] = await sql<Invite[]>`
    SELECT token_hash, kind, email, role, admin_id FROM admin_invites
    WHERE token_hash = ${sha256(token)} AND used_at IS NULL AND expires_at > now()`;
  return { sql, invite: invite ?? null };
}

export async function GET(req: Request) {
  const { invite } = await findInvite(new URL(req.url).searchParams.get("token"));
  if (!invite) return json({ error: "invalid_or_expired" }, 404);
  return json({ kind: invite.kind, email: invite.email, role: invite.role });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ error: "forbidden_origin" }, 403);
  const body = await readJson(req);
  const { sql, invite } = await findInvite(body?.token);
  if (!sql) return json({ error: "database_unavailable" }, 503);
  if (!invite) return json({ error: "invalid_or_expired" }, 404);

  const problem = passwordProblem(body?.password);
  if (problem) return json({ error: "weak_password", message: problem }, 400);
  const name = cleanText(body?.name, 80);
  if (invite.kind === "invite" && (!name || !invite.role)) return json({ error: "invalid_input" }, 400);
  const hash = await hashPassword(body!.password as string);
  const ip = clientIp(req.headers);

  class Conflict extends Error {}
  const adminId = await sql.begin(async (tx) => {
    const [claimed] = await tx<{ token_hash: string }[]>`
      UPDATE admin_invites SET used_at = now() WHERE token_hash = ${invite.token_hash} AND used_at IS NULL RETURNING token_hash`;
    if (!claimed) return null;
    if (invite.kind === "reset" && invite.admin_id) {
      await tx`UPDATE admin_users SET password_hash = ${hash}, updated_at = now() WHERE id = ${invite.admin_id}`;
      await tx`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${invite.admin_id} AND revoked_at IS NULL`;
      return invite.admin_id;
    }
    const [exists] = await tx`SELECT 1 FROM admin_users WHERE lower(email) = ${invite.email.toLowerCase()}`;
    if (exists) throw new Conflict(); // rolls back, so the invite stays unused
    const [u] = await tx<{ id: string }[]>`
      INSERT INTO admin_users (email, name, password_hash, role) VALUES (${invite.email}, ${name}, ${hash}, ${invite.role}) RETURNING id`;
    return u.id;
  }).catch((err) => {
    if (err instanceof Conflict) return "conflict" as const;
    throw err;
  });
  if (adminId === "conflict") return json({ error: "email_taken" }, 409);
  if (!adminId) return json({ error: "invalid_or_expired" }, 404);

  await appendAudit(sql, {
    actorId: adminId,
    actorEmail: invite.email,
    action: invite.kind === "reset" ? "team.password_reset_completed" : "team.invite_accepted",
    target: invite.email,
    details: invite.role ? { role: invite.role } : {},
    ip,
  });
  const token = await createSession(sql, adminId, req.headers);
  await appendAudit(sql, { actorId: adminId, actorEmail: invite.email, action: "auth.login", ip });
  return withSessionCookie(json({ ok: true }), token);
}

import { canAssignRole, isRole } from "@/lib/roles";
import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { isEmail, newToken, sha256 } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const g = await requireAdminApi(req, "team.view");
  if (!g.ok) return g.res;
  const { sql } = g.ctx;
  const admins = await sql`
    SELECT id, email, name, role, status, created_at, last_login_at,
      (SELECT count(*)::int FROM admin_sessions s WHERE s.admin_id = u.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions
    FROM admin_users u ORDER BY created_at`;
  const invites = await sql`
    SELECT token_hash, kind, email, role, created_at, expires_at FROM admin_invites
    WHERE used_at IS NULL AND expires_at > now() ORDER BY created_at DESC`;
  return json({ admins, invites });
}

export async function POST(req: Request) {
  const g = await requireAdminApi(req, "team.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const body = await readJson(req);

  if (body?.action === "invite") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isEmail(email) || !isRole(body.role)) return json({ error: "invalid_input" }, 400);
    if (!canAssignRole(admin.role, body.role)) return json({ error: "forbidden" }, 403);
    const [exists] = await sql`SELECT 1 FROM admin_users WHERE lower(email) = ${email}`;
    if (exists) return json({ error: "email_taken" }, 409);
    const token = newToken();
    await sql`
      INSERT INTO admin_invites (token_hash, kind, email, role, created_by, expires_at)
      VALUES (${sha256(token)}, 'invite', ${email}, ${body.role}, ${admin.id}, ${new Date(Date.now() + INVITE_TTL_MS)})`;
    await audit("team.invite_created", email, { role: body.role });
    const origin = new URL(req.headers.get("origin") ?? req.url).origin;
    return json({ ok: true, url: `${origin}/admin/invite?token=${token}`, expiresInHours: 72 });
  }

  if (body?.action === "revoke_invite" && typeof body.tokenHash === "string") {
    const [inv] = await sql<{ email: string; role: string | null }[]>`
      UPDATE admin_invites SET expires_at = now() WHERE token_hash = ${body.tokenHash} AND used_at IS NULL RETURNING email, role`;
    if (!inv) return json({ error: "not_found" }, 404);
    if (inv.role && !canAssignRole(admin.role, inv.role as never)) return json({ error: "forbidden" }, 403);
    await audit("team.invite_revoked", inv.email);
    return json({ ok: true });
  }

  return json({ error: "invalid_action" }, 400);
}

import { canAssignRole, isRole, type Role } from "@/lib/roles";
import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { newToken, sha256 } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdminApi(req, "team.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "not_found" }, 404);
  const body = await readJson(req);
  const action = body?.action;

  const [target] = await sql<{ id: string; email: string; role: Role; status: string }[]>`
    SELECT id, email, role, status FROM admin_users WHERE id = ${id}`;
  if (!target) return json({ error: "not_found" }, 404);

  const self = target.id === admin.id;
  // Nobody changes their own role or status: no self-elevation, no self-lockout.
  if (self && action !== "revoke_sessions") return json({ error: "cannot_modify_self" }, 403);
  if (!canAssignRole(admin.role, target.role, target.role)) return json({ error: "forbidden" }, 403);
  if (["role", "suspend", "revoke_sessions", "reset_link"].includes(String(action)) && body?.confirm !== true) {
    return json({ error: "confirmation_required" }, 400);
  }

  const activeOwners = async () => {
    const [r] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_users WHERE role = 'owner' AND status = 'active'`;
    return r.n;
  };

  switch (action) {
    case "role": {
      if (!isRole(body?.role)) return json({ error: "invalid_input" }, 400);
      if (!canAssignRole(admin.role, body.role, target.role)) return json({ error: "forbidden" }, 403);
      if (target.role === "owner" && body.role !== "owner" && (await activeOwners()) <= 1) {
        return json({ error: "last_owner" }, 409);
      }
      await sql`UPDATE admin_users SET role = ${body.role}, updated_at = now() WHERE id = ${id}`;
      await sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${id} AND revoked_at IS NULL`;
      await audit("team.role_changed", target.email, { from: target.role, to: body.role });
      return json({ ok: true });
    }
    case "suspend": {
      if (target.role === "owner" && (await activeOwners()) <= 1) return json({ error: "last_owner" }, 409);
      await sql`UPDATE admin_users SET status = 'suspended', updated_at = now() WHERE id = ${id}`;
      await sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${id} AND revoked_at IS NULL`;
      await audit("team.suspended", target.email);
      return json({ ok: true });
    }
    case "reactivate": {
      await sql`UPDATE admin_users SET status = 'active', updated_at = now() WHERE id = ${id}`;
      await audit("team.reactivated", target.email);
      return json({ ok: true });
    }
    case "revoke_sessions": {
      const rows = await sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${id} AND revoked_at IS NULL RETURNING 1`;
      await audit("team.sessions_revoked", target.email, { count: rows.length });
      return json({ ok: true, revoked: rows.length });
    }
    case "reset_link": {
      const token = newToken();
      await sql`
        INSERT INTO admin_invites (token_hash, kind, email, admin_id, created_by, expires_at)
        VALUES (${sha256(token)}, 'reset', ${target.email}, ${id}, ${admin.id}, ${new Date(Date.now() + 24 * 3600_000)})`;
      await audit("team.password_reset_issued", target.email);
      const origin = new URL(req.headers.get("origin") ?? req.url).origin;
      return json({ ok: true, url: `${origin}/admin/invite?token=${token}`, expiresInHours: 24 });
    }
    default:
      return json({ error: "invalid_action" }, 400);
  }
}

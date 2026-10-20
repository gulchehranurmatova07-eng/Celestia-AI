import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Change your own password (any role). Signs out every other session. */
export async function POST(req: Request) {
  const g = await requireAdminApi(req, "dashboard.view");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const body = await readJson(req);
  const [row] = await sql<{ password_hash: string }[]>`SELECT password_hash FROM admin_users WHERE id = ${admin.id}`;
  if (typeof body?.currentPassword !== "string" || !(await verifyPassword(body.currentPassword, row.password_hash))) {
    await audit("auth.password_change_failed");
    return json({ error: "invalid_credentials" }, 401);
  }
  const problem = passwordProblem(body.newPassword);
  if (problem) return json({ error: "weak_password", message: problem }, 400);
  await sql`UPDATE admin_users SET password_hash = ${await hashPassword(body.newPassword as string)}, updated_at = now() WHERE id = ${admin.id}`;
  await sql`UPDATE admin_sessions SET revoked_at = now() WHERE admin_id = ${admin.id} AND token_hash <> ${admin.sessionHash} AND revoked_at IS NULL`;
  await audit("auth.password_changed");
  return json({ ok: true });
}

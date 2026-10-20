import { appendAudit } from "@/lib/server/audit";
import { clearSessionCookie, json, resolveSession, sessionTokenFrom } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, sha256 } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return json({ error: "forbidden_origin" }, 403);
  const sql = await getDb().catch(() => null);
  const token = sessionTokenFrom(req.headers);
  if (sql && token) {
    const admin = await resolveSession(sql, token);
    await sql`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${sha256(token)} AND revoked_at IS NULL`;
    if (admin) {
      await appendAudit(sql, { actorId: admin.id, actorEmail: admin.email, action: "auth.logout", ip: clientIp(req.headers) });
    }
  }
  return clearSessionCookie(json({ ok: true }));
}

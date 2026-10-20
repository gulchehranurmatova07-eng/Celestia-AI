import { json, requireAdminApi } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdminApi(req, "alerts.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return json({ error: "not_found" }, 404);
  const [row] = await sql<{ title: string }[]>`
    UPDATE alerts SET status = 'acknowledged', acknowledged_by = ${admin.id}, acknowledged_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'open' RETURNING title`;
  if (!row) return json({ error: "not_found" }, 404);
  await audit("alerts.acknowledged", id, { title: row.title });
  return json({ ok: true });
}

import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { cleanText } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["open", "investigating", "resolved", "ignored"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ fingerprint: string }> }) {
  const g = await requireAdminApi(req, "errors.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const { fingerprint } = await params;
  if (!/^[0-9a-f]{20}$/.test(fingerprint)) return json({ error: "not_found" }, 404);
  const [group] = await sql<{ status: string; title: string }[]>`SELECT status, title FROM error_groups WHERE fingerprint = ${fingerprint}`;
  if (!group) return json({ error: "not_found" }, 404);
  const body = await readJson(req);

  if (typeof body?.status === "string") {
    if (!(STATUSES as readonly string[]).includes(body.status)) return json({ error: "invalid_input" }, 400);
    await sql`
      UPDATE error_groups SET status = ${body.status}, updated_at = now(),
        resolved_at = CASE WHEN ${body.status} = 'resolved' THEN now() ELSE NULL END
      WHERE fingerprint = ${fingerprint}`;
    await sql`INSERT INTO error_notes (fingerprint, author_id, kind, body)
      VALUES (${fingerprint}, ${admin.id}, 'status', ${`Status changed from ${group.status} to ${body.status}`})`;
    await audit("errors.status_changed", fingerprint, { from: group.status, to: body.status });
    return json({ ok: true });
  }

  if ("assigneeId" in (body ?? {})) {
    const assigneeId = body?.assigneeId;
    let label = "Unassigned";
    if (assigneeId !== null) {
      if (typeof assigneeId !== "string") return json({ error: "invalid_input" }, 400);
      const [a] = await sql<{ name: string }[]>`SELECT name FROM admin_users WHERE id = ${assigneeId} AND status = 'active'`;
      if (!a) return json({ error: "invalid_input" }, 400);
      label = `Assigned to ${a.name}`;
    }
    await sql`UPDATE error_groups SET assignee_id = ${assigneeId as string | null}, updated_at = now() WHERE fingerprint = ${fingerprint}`;
    await sql`INSERT INTO error_notes (fingerprint, author_id, kind, body) VALUES (${fingerprint}, ${admin.id}, 'assign', ${label})`;
    await audit("errors.assigned", fingerprint, { assigneeId });
    return json({ ok: true });
  }

  const note = cleanText(body?.note, 2000);
  if (note) {
    await sql`INSERT INTO error_notes (fingerprint, author_id, kind, body) VALUES (${fingerprint}, ${admin.id}, 'note', ${note})`;
    await audit("errors.note_added", fingerprint);
    return json({ ok: true });
  }
  return json({ error: "invalid_input" }, 400);
}

import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { purgeOldData } from "@/lib/server/retention";
import { getSettings } from "@/lib/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await requireAdminApi(req, "data.purge");
  if (!g.ok) return g.res;
  const body = await readJson(req);
  if (body?.confirmText !== "PURGE") return json({ error: "confirmation_required" }, 400);
  const days = (await getSettings({ fresh: true }))["retention.days"];
  const result = await purgeOldData(g.ctx.sql, days);
  await g.ctx.audit("data.purged", null, { retentionDays: days, ...result.counts });
  return json({ ok: true, ...result });
}

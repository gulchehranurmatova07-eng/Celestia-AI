import { evaluateAlerts } from "@/lib/server/alerts";
import { json, requireAdminApi } from "@/lib/server/auth";
import { runHealthChecks } from "@/lib/server/health";
import { getSettings } from "@/lib/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await requireAdminApi(req, "health.run");
  if (!g.ok) return g.res;
  const results = await runHealthChecks(g.ctx.sql);
  await evaluateAlerts(g.ctx.sql, await getSettings({ fresh: true }));
  await g.ctx.audit("health.checks_run", null, { results: results.map((r) => `${r.service}:${r.status}`) });
  return json({ ok: true, results });
}

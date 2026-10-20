import { appendAudit } from "@/lib/server/audit";
import { evaluateAlerts } from "@/lib/server/alerts";
import { json } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { runHealthChecks } from "@/lib/server/health";
import { purgeOldData } from "@/lib/server/retention";
import { safeEqual } from "@/lib/server/security";
import { getSettings } from "@/lib/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scheduled job (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !safeEqual(auth, `Bearer ${secret}`)) return json({ error: "unauthorized" }, 401);
  const sql = await getDb().catch(() => null);
  if (!sql) return json({ error: "database_unavailable" }, 503);
  const settings = await getSettings({ fresh: true });
  const results = await runHealthChecks(sql);
  await evaluateAlerts(sql, settings);
  const purge = await purgeOldData(sql, settings["retention.days"]);
  await appendAudit(sql, { action: "system.scheduled_maintenance", details: { results: results.map((r) => `${r.service}:${r.status}`), purged: purge.counts } });
  return json({ ok: true, results, purge });
}

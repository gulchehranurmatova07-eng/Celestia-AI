import type { Sql } from "./db";

/** Deletes operational data older than `days`. The audit log is never purged. */
export async function purgeOldData(sql: Sql, days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const counts: Record<string, number> = {};
  counts.ai_requests = (await sql`DELETE FROM ai_requests WHERE at < ${cutoff} RETURNING 1`).length;
  counts.analytics_events = (await sql`DELETE FROM analytics_events WHERE at < ${cutoff} RETURNING 1`).length;
  counts.error_events = (await sql`DELETE FROM error_events WHERE at < ${cutoff} RETURNING 1`).length;
  counts.health_checks = (await sql`DELETE FROM health_checks WHERE at < ${cutoff} RETURNING 1`).length;
  counts.resolved_alerts = (await sql`DELETE FROM alerts WHERE status = 'resolved' AND updated_at < ${cutoff} RETURNING 1`).length;
  return { cutoff: cutoff.toISOString(), counts };
}

let lastRun = 0;
/** Automatic retention, at most every 6 hours per instance. */
export async function purgeIfDue(sql: Sql, days: number) {
  if (Date.now() - lastRun < 6 * 3600_000) return null;
  lastRun = Date.now();
  return purgeOldData(sql, days);
}

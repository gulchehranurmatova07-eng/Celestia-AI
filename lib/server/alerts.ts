import type { AppSettings } from "../settingsSchema";
import type { Sql } from "./db";
import type { Severity } from "./errors";
import { spendSummary } from "./metrics";

type Condition = {
  key: string;
  kind: string;
  severity: Severity;
  title: string;
  detail: Record<string, unknown>;
  link: string;
};

/** Evaluates alert rules against real data. Opens new alerts and resolves cleared ones. */
export async function evaluateAlerts(sql: Sql, settings: AppSettings): Promise<void> {
  const firing: Condition[] = [];

  // AI provider / database health (latest check per service).
  const health = await sql<{ service: string; status: string; detail: string; at: Date }[]>`
    SELECT DISTINCT ON (service) service, status, detail, at FROM health_checks ORDER BY service, at DESC`;
  for (const h of health) {
    if (h.status === "down") {
      firing.push({
        key: `health:${h.service}`,
        kind: "service_down",
        severity: "critical",
        title: `${h.service === "ai_provider" ? "AI provider" : h.service} is down`,
        detail: { detail: h.detail, checkedAt: h.at.toISOString() },
        link: "/admin/health",
      });
    }
  }

  // Error rate and p95 latency over the last hour (minimum sample of 10).
  const [hour] = await sql<{ total: number; failed: number; p95: number | null }[]>`
    SELECT count(*) FILTER (WHERE status IN ('success','error','refused'))::int AS total,
      count(*) FILTER (WHERE status = 'error')::int AS failed,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE status = 'success')::float8 AS p95
    FROM ai_requests WHERE at > now() - interval '1 hour'`;
  if (hour.total >= 10) {
    const rate = (hour.failed / hour.total) * 100;
    if (rate > settings["alerts.errorRatePct"]) {
      firing.push({
        key: "ai:error_rate",
        kind: "error_rate",
        severity: rate >= 50 ? "critical" : "high",
        title: `AI failure rate ${rate.toFixed(1)}% in the last hour`,
        detail: { failed: hour.failed, total: hour.total, thresholdPct: settings["alerts.errorRatePct"] },
        link: "/admin/ai?range=24h&status=error",
      });
    }
    if (hour.p95 !== null && hour.p95 > settings["alerts.p95LatencyMs"]) {
      firing.push({
        key: "ai:latency",
        kind: "latency",
        severity: "medium",
        title: `p95 latency ${Math.round(hour.p95)} ms in the last hour`,
        detail: { p95Ms: Math.round(hour.p95), thresholdMs: settings["alerts.p95LatencyMs"], sample: hour.total },
        link: "/admin/ai?range=24h",
      });
    }
  }

  // Error spikes: last hour vs hourly average of the previous 24 hours.
  const [spike] = await sql<{ lastHour: number; prevAvg: number }[]>`
    SELECT count(*) FILTER (WHERE at > now() - interval '1 hour')::int AS "lastHour",
      (count(*) FILTER (WHERE at <= now() - interval '1 hour')::float8 / 24) AS "prevAvg"
    FROM error_events WHERE at > now() - interval '25 hours'`;
  if (spike.lastHour >= 10 && spike.lastHour > 3 * spike.prevAvg) {
    firing.push({
      key: "errors:spike",
      kind: "error_spike",
      severity: "high",
      title: `Error spike: ${spike.lastHour} errors in the last hour`,
      detail: { lastHour: spike.lastHour, previousHourlyAvg: Number(spike.prevAvg.toFixed(2)) },
      link: "/admin/errors",
    });
  }

  // Budget thresholds and spend spikes (estimated cost).
  const spend = await spendSummary(sql);
  const budget = settings["budget.monthlyUsd"];
  if (budget > 0) {
    const pct = (spend.mtd / budget) * 100;
    if (pct >= 80) {
      firing.push({
        key: `budget:${pct >= 100 ? "100" : "80"}`,
        kind: "budget",
        severity: pct >= 100 ? "critical" : "high",
        title: `Estimated spend is at ${pct.toFixed(0)}% of the monthly budget`,
        detail: { monthToDateUsd: Number(spend.mtd.toFixed(4)), budgetUsd: budget },
        link: "/admin/costs",
      });
    }
  }
  if (spend.today >= 0.5 && spend.prev7avg > 0 && spend.today > settings["budget.spikeMultiplier"] * spend.prev7avg) {
    firing.push({
      key: "budget:spike",
      kind: "spend_spike",
      severity: "medium",
      title: `Spending spike: $${spend.today.toFixed(2)} today vs $${spend.prev7avg.toFixed(2)}/day average`,
      detail: { todayUsd: spend.today, prev7DailyAvgUsd: spend.prev7avg, multiplier: settings["budget.spikeMultiplier"] },
      link: "/admin/costs",
    });
  }

  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274004)`;
    for (const c of firing) {
      await tx`
        INSERT INTO alerts (kind, dedupe_key, severity, title, detail, link)
        VALUES (${c.kind}, ${c.key}, ${c.severity}, ${c.title}, ${tx.json(c.detail as never)}, ${c.link})
        ON CONFLICT (dedupe_key) WHERE status <> 'resolved'
        DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, severity = EXCLUDED.severity, updated_at = now()`;
    }
    const keys = firing.map((c) => c.key);
    await tx`
      UPDATE alerts SET status = 'resolved', resolved_at = now(), updated_at = now()
      WHERE status <> 'resolved' AND ${keys.length ? tx`dedupe_key NOT IN ${tx(keys)}` : tx`true`}`;
  });
}

let lastEval = 0;
/** Throttled evaluation for page loads. */
export async function evaluateAlertsThrottled(sql: Sql, settings: AppSettings, everyMs = 60_000) {
  if (Date.now() - lastEval < everyMs) return;
  lastEval = Date.now();
  await evaluateAlerts(sql, settings);
}

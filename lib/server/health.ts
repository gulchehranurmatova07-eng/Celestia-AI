import Anthropic from "@anthropic-ai/sdk";
import type { Sql } from "./db";
import { evaluateAlerts } from "./alerts";
import { recordError } from "./errors";
import { getSettings } from "./settings";

export type HealthStatus = "up" | "degraded" | "down" | "unconfigured";
export type CheckResult = { service: string; status: HealthStatus; latencyMs: number | null; detail: string };

export const SERVICES: { id: string; label: string; description: string }[] = [
  { id: "app", label: "Web app & API", description: "This Next.js deployment answering requests" },
  { id: "database", label: "Database", description: "Postgres connectivity and query latency" },
  { id: "ai_provider", label: "AI provider (Anthropic)", description: "Authenticated call to the Models API for the configured model" },
  { id: "configuration", label: "Configuration", description: "Required environment variables and setup state" },
];

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - start) };
}

async function checkDatabase(sql: Sql): Promise<CheckResult> {
  try {
    const { ms } = await timed(() => sql`SELECT 1`);
    return { service: "database", status: ms > 1500 ? "degraded" : "up", latencyMs: ms, detail: `SELECT 1 in ${ms} ms` };
  } catch (err) {
    return { service: "database", status: "down", latencyMs: null, detail: err instanceof Error ? err.message : "Query failed" };
  }
}

async function checkProvider(): Promise<CheckResult> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return { service: "ai_provider", status: "unconfigured", latencyMs: null, detail: "ANTHROPIC_API_KEY is not set — the public chat shows contact links instead of AI answers." };
  }
  const model = (await getSettings({ fresh: true }))["ai.model"];
  try {
    // Free metadata call: proves network reachability, valid credentials and model access.
    const client = new Anthropic({ maxRetries: 0, timeout: 10_000 });
    const { ms } = await timed(() => client.models.retrieve(model));
    return { service: "ai_provider", status: ms > 5000 ? "degraded" : "up", latencyMs: ms, detail: `Models API reachable; ${model} available (${ms} ms)` };
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    const msg = err instanceof Error ? err.message : "Request failed";
    return { service: "ai_provider", status: "down", latencyMs: null, detail: `${status ? `HTTP ${status}: ` : ""}${msg}`.slice(0, 300) };
  }
}

function checkConfiguration(): CheckResult {
  const problems: string[] = [];
  const notes: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY?.trim()) problems.push("ANTHROPIC_API_KEY missing");
  if (process.env.ADMIN_SETUP_TOKEN?.trim()) notes.push("ADMIN_SETUP_TOKEN is still set (safe to remove after setup)");
  if (!process.env.CRON_SECRET?.trim()) notes.push("CRON_SECRET not set (scheduled health checks disabled)");
  return {
    service: "configuration",
    status: problems.length ? "degraded" : "up",
    latencyMs: null,
    detail: [...problems, ...notes].join(" · ") || "All required settings present",
  };
}

export async function runHealthChecks(sql: Sql): Promise<CheckResult[]> {
  const results: CheckResult[] = [
    { service: "app", status: "up", latencyMs: null, detail: "Serving requests (this check ran on it)" },
    await checkDatabase(sql),
    await checkProvider(),
    checkConfiguration(),
  ];
  for (const r of results) {
    await sql`INSERT INTO health_checks (service, status, latency_ms, detail) VALUES (${r.service}, ${r.status}, ${r.latencyMs}, ${r.detail})`;
    if (r.status === "down") {
      await recordError({
        source: r.service === "database" ? "database" : "integration",
        category: `${r.service}_down`,
        severity: "critical",
        title: `${r.service} health check failed`,
        message: r.detail,
        path: "health-check",
      });
    }
  }
  return results;
}

/** Runs checks only if the last run is older than maxAgeMs (keeps page loads fast). */
export async function runHealthChecksIfStale(sql: Sql, maxAgeMs = 5 * 60_000) {
  const [last] = await sql<{ at: Date }[]>`SELECT max(at) AS at FROM health_checks`;
  if (last?.at && Date.now() - last.at.getTime() < maxAgeMs) return false;
  await runHealthChecks(sql);
  await evaluateAlerts(sql, await getSettings({ fresh: true })); // open/resolve service alerts right away
  return true;
}

export async function latestHealth(sql: Sql) {
  return sql<{ service: string; status: HealthStatus; latency_ms: number | null; detail: string; at: Date }[]>`
    SELECT DISTINCT ON (service) service, status, latency_ms, detail, at
    FROM health_checks ORDER BY service, at DESC`;
}

export function deploymentInfo() {
  const env = process.env;
  return {
    platform: env.VERCEL ? "Vercel" : "Self-hosted / local",
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? "unknown",
    region: env.VERCEL_REGION ?? null,
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    commitMessage: env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0]?.slice(0, 120) ?? null,
    branch: env.VERCEL_GIT_COMMIT_REF ?? null,
    url: env.VERCEL_URL ?? null,
  };
}

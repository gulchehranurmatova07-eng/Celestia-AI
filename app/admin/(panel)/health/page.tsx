import { ActionButton } from "@/components/admin/controls";
import { Card, Kv, Notice, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { PulseIcon } from "@/components/Icons";
import { ago, ms, pct, utc } from "@/lib/format";
import { can } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";
import { deploymentInfo, runHealthChecksIfStale, SERVICES } from "@/lib/server/health";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const { sql, admin } = await requirePage("dashboard.view");
  await runHealthChecksIfStale(sql, 2 * 60_000).catch((e) => console.error("[celestia-ai] health check failed:", e));
  const settings = await getSettings({ fresh: true });

  const [stats, history] = await Promise.all([
    sql<{ service: string; status: string; latency_ms: number | null; detail: string; at: Date; checks: number; up: number; failures: number; last_ok: Date | null }[]>`
      SELECT DISTINCT ON (h.service) h.service, h.status, h.latency_ms, h.detail, h.at, s.checks, s.up, s.failures, s.last_ok
      FROM health_checks h
      JOIN (
        SELECT service, count(*)::int AS checks, count(*) FILTER (WHERE status = 'up')::int AS up,
          count(*) FILTER (WHERE status = 'down')::int AS failures,
          max(at) FILTER (WHERE status = 'up') AS last_ok
        FROM health_checks WHERE at > now() - interval '24 hours' GROUP BY service
      ) s USING (service)
      ORDER BY h.service, h.at DESC`,
    sql<{ id: string; at: Date; service: string; status: string; latency_ms: number | null; detail: string }[]>`
      SELECT id, at, service, status, latency_ms, detail FROM health_checks WHERE status <> 'up' ORDER BY at DESC LIMIT 30`,
  ]);
  const deploy = deploymentInfo();

  return (
    <>
      <PageHeader
        title="System Health"
        description="Live checks of the services Celestia AI depends on. Checks run when this page opens (at most every 2 minutes), on demand, and on the daily schedule when CRON_SECRET is set."
        actions={
          can(admin.role, "health.run") ? (
            <ActionButton url="/api/admin/health" method="POST" variant="primary">
              <PulseIcon size={15} /> Run checks now
            </ActionButton>
          ) : null
        }
      />
      {!settings["chat.enabled"] && (
        <div className="mb-4">
          <Notice tone="warning">Maintenance mode is ON — the public chat shows contact links instead of AI answers. Change it in Settings.</Notice>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {SERVICES.map((svc) => {
          const s = stats.find((x) => x.service === svc.id);
          return (
            <Card key={svc.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-white">{svc.label}</h2>
                  <p className="mt-0.5 text-[12px] text-mist">{svc.description}</p>
                </div>
                <StatusBadge status={s?.status ?? "unknown"} />
              </div>
              <p className="mt-3 break-words rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-[11.5px] text-ink/85">{s?.detail ?? "Not checked yet."}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-4">
                <div>
                  <dt className="text-mist/80">Last check</dt>
                  <dd className="text-ink">{s ? ago(s.at) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-mist/80">Latency</dt>
                  <dd className="text-ink">{ms(s?.latency_ms)}</dd>
                </div>
                <div>
                  <dt className="text-mist/80">Up (24h checks)</dt>
                  <dd className="text-ink">{s && s.checks ? pct(s.up / s.checks, 0) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-mist/80">Last success</dt>
                  <dd className="text-ink">{s?.last_ok ? ago(s.last_ok) : "—"}</dd>
                </div>
              </dl>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Runtime & limits" className="xl:col-span-1">
          <Kv
            items={[
              ["Public chat", settings["chat.enabled"] ? "Enabled" : "Maintenance mode"],
              ["AI model", settings["ai.model"]],
              ["Rate limit", `${settings["chat.rateLimitPerMinute"]} requests / IP / minute`],
              ["Rate limiter", "In-memory, per server instance"],
              ["Environment", `${deploy.platform} · ${deploy.environment}`],
              ["Commit", deploy.commit ?? "—"],
            ]}
          />
          <p className="mt-4 text-[11.5px] leading-relaxed text-mist/70">
            On serverless hosting each instance keeps its own rate-limit counters. For strict global limits enable your host’s firewall rules
            (e.g. Vercel Firewall). Background queues and file storage aren’t used by this app, so they aren’t monitored.
          </p>
        </Card>
        <Card title="Recent failed or degraded checks" className="xl:col-span-2">
          <Table head={["Time (UTC)", "Service", "Status", "Detail"]}>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-mist">
                  No failed or degraded checks recorded.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap text-mist">{utc(h.at, true)}</td>
                  <td>{SERVICES.find((s) => s.id === h.service)?.label ?? h.service}</td>
                  <td>
                    <StatusBadge status={h.status} />
                  </td>
                  <td className="max-w-[420px] break-words font-mono text-[11.5px] text-mist">{h.detail}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { ColumnChart, LineChart } from "@/components/admin/charts";
import { SERIES, STATUS } from "@/lib/chartColors";
import { LiveFeed, RangeFilter, RefreshButton } from "@/components/admin/controls";
import { BarList, Card, EmptyState, Notice, PageHeader, SeverityBadge, StatTile, StatusBadge } from "@/components/admin/ui";
import { ago, change, compact, int, ms, pct, usd, utc } from "@/lib/format";
import { requirePage } from "@/lib/server/adminSession";
import { deploymentInfo, latestHealth, runHealthChecksIfStale } from "@/lib/server/health";
import { byModel, kpis, parseRange, previousRange, requestSeries, visitorSeries } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function OverviewPage({ searchParams }: { searchParams: Search }) {
  const { sql } = await requirePage("dashboard.view");
  const params = await searchParams;
  const range = parseRange(params);

  await runHealthChecksIfStale(sql).catch((e) => console.error("[celestia-ai] health check failed:", e));
  const [cur, prev, series, visitors, models, health, incidents] = await Promise.all([
    kpis(sql, range),
    kpis(sql, previousRange(range)),
    requestSeries(sql, range),
    visitorSeries(sql, range),
    byModel(sql, range),
    latestHealth(sql),
    sql<{ fingerprint: string; title: string; severity: string; status: string; last_seen: Date; count: number; source: string }[]>`
      SELECT fingerprint, title, severity, status, last_seen, count::int, source FROM error_groups
      WHERE status IN ('open','investigating') AND severity IN ('critical','high')
      ORDER BY last_seen DESC LIMIT 5`,
  ]);

  const down = health.filter((h) => h.status === "down").length;
  const degraded = health.filter((h) => h.status === "degraded" || h.status === "unconfigured").length;
  const systemStatus = health.length === 0 ? "unknown" : down ? "down" : degraded ? "degraded" : "up";
  const deploy = deploymentInfo();
  const spark = (k: keyof (typeof series)[number]) => series.map((p) => Number(p[k] ?? 0));

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${range.label} · all times UTC · data as of ${utc(new Date())}`}
        actions={
          <>
            <RangeFilter current={range.key} from={params.from as string} to={params.to as string} />
            <RefreshButton />
          </>
        }
      />

      {params.denied && (
        <div className="mb-5">
          <Notice tone="warning">Your role doesn’t have access to that page. Ask an Owner if you need it.</Notice>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Visitors (anonymous)" value={int(cur.visitors)} delta={change(cur.visitors, prev.visitors)} spark={visitors.map((v) => v.visitors)} />
        <StatTile label="Conversations" value={int(cur.conversations)} delta={change(cur.conversations, prev.conversations)} spark={visitors.map((v) => v.conversations)} />
        <StatTile label="AI requests" value={int(cur.requests)} delta={change(cur.requests, prev.requests)} spark={spark("success")} />
        <StatTile
          label="Success rate"
          value={pct(cur.successRate)}
          delta={cur.successRate !== null && prev.successRate !== null ? cur.successRate - prev.successRate : null}
          hint={`${int(cur.success)} answered`}
        />
        <StatTile label="Failed requests" value={int(cur.failed)} delta={change(cur.failed, prev.failed)} deltaGoodWhen="down" hint={cur.refused ? `+${cur.refused} refused` : undefined} />
        <StatTile label="Avg latency" value={ms(cur.avgLatencyMs)} delta={change(cur.avgLatencyMs, prev.avgLatencyMs)} deltaGoodWhen="down" hint="successful answers" />
        <StatTile label="p95 latency" value={ms(cur.p95LatencyMs)} delta={change(cur.p95LatencyMs, prev.p95LatencyMs)} deltaGoodWhen="down" hint={`p50 ${ms(cur.p50LatencyMs)}`} />
        <StatTile label="Tokens" value={compact(cur.inputTokens + cur.outputTokens)} delta={change(cur.inputTokens + cur.outputTokens, prev.inputTokens + prev.outputTokens)} deltaGoodWhen="neutral" hint={`${compact(cur.inputTokens)} in · ${compact(cur.outputTokens)} out`} spark={spark("tokens")} />
        <StatTile label="Estimated AI cost" value={usd(cur.costUsd)} delta={change(cur.costUsd, prev.costUsd)} deltaGoodWhen="down" hint="estimate" spark={spark("costUsd")} />
        <Link href="/admin/health" className="admin-card flex flex-col justify-between rounded-2xl p-4 transition-colors hover:border-cyan/30">
          <p className="text-[12.5px] text-mist">System health</p>
          <div className="mt-3">
            <StatusBadge status={systemStatus} label={systemStatus === "up" ? "All systems operational" : undefined} />
          </div>
          <p className="mt-2 text-[11px] text-mist/70">{health[0] ? `checked ${ago(health.reduce((a, h) => (h.at > a ? h.at : a), health[0].at))}` : "not checked yet"}</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="AI requests" subtitle={`Successful vs failed, per ${range.unit} (UTC)`} className="xl:col-span-2">
          {cur.requests === 0 ? (
            <EmptyState title="No AI requests in this range">Requests appear here as soon as visitors chat with Celestia AI.</EmptyState>
          ) : (
            <ColumnChart
              data={series}
              unit={range.unit}
              series={[
                { key: "success", label: "Successful", color: SERIES.blue },
                { key: "failed", label: "Failed", color: STATUS.critical },
              ]}
            />
          )}
        </Card>
        <Card title="Live activity" subtitle="Requests, errors and alerts — no conversation content">
          <LiveFeed />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Visitors & conversations" subtitle={`Unique anonymous visits per ${range.unit}`}>
          {cur.visitors === 0 && cur.conversations === 0 ? (
            <EmptyState title="No visits recorded in this range" />
          ) : (
            <LineChart
              data={visitors}
              unit={range.unit}
              format="int"
              series={[
                { key: "visitors", label: "Visitors", color: SERIES.blue, area: true },
                { key: "conversations", label: "Conversations", color: SERIES.aqua },
              ]}
            />
          )}
        </Card>
        <Card title="Model usage & estimated cost" subtitle="Requests by model (estimated cost from the pricing table)">
          <BarList
            rows={models.map((m) => ({ label: m.model, value: m.requests, hint: `${usd(m.costUsd)} · p95 ${ms(m.p95LatencyMs)}` }))}
            format={int}
            emptyText="No model usage in this range."
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Open critical & high incidents" className="xl:col-span-2" actions={<Link href="/admin/errors" className="text-[12px] text-cyan hover:underline">Error Center →</Link>}>
          {incidents.length === 0 ? (
            <EmptyState title="No open critical or high incidents" />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {incidents.map((i) => (
                <li key={i.fingerprint}>
                  <Link href={`/admin/errors/${i.fingerprint}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02]">
                    <SeverityBadge severity={i.severity} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{i.title}</span>
                    <span className="flex-none text-[11px] text-mist">
                      {int(i.count)}× · {ago(i.last_seen)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Current deployment">
          <dl className="space-y-2 text-[13px]">
            {[
              ["Platform", deploy.platform],
              ["Environment", deploy.environment],
              ["Commit", deploy.commit ? `${deploy.commit}${deploy.branch ? ` (${deploy.branch})` : ""}` : "—"],
              ["Message", deploy.commitMessage ?? "—"],
              ["Region", deploy.region ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-mist">{k}</dt>
                <dd className="truncate text-right text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-mist/70">
            Build history and failed deployments need a Vercel API token integration (not configured).
          </p>
        </Card>
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-mist/70">
        Celestia AI has no visitor accounts, so registration, login and per-user metrics don’t apply. “Visitors” are anonymous browser-tab
        sessions; “conversations” are sessions that sent at least one chat message. Costs are estimates from your pricing table — the Claude
        Console billing page is the confirmed source.
      </p>
    </>
  );
}

import Link from "next/link";
import { ColumnChart, LineChart } from "@/components/admin/charts";
import { RangeFilter } from "@/components/admin/controls";
import { Card, Notice, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { SERIES } from "@/lib/chartColors";
import { compact, int, pct, usd } from "@/lib/format";
import { requirePage } from "@/lib/server/adminSession";
import { byModel, costByDay, kpis, parseRange, spendSummary } from "@/lib/server/metrics";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function CostsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql } = await requirePage("dashboard.view");
  const sp = await searchParams;
  const range = parseRange({ range: "30d", ...sp });
  const settings = await getSettings({ fresh: true });
  const [k, days, models, spend, failedCost] = await Promise.all([
    kpis(sql, range),
    costByDay(sql, range.from, range.to),
    byModel(sql, range),
    spendSummary(sql),
    sql<{ usd: number }[]>`SELECT coalesce(sum(cost_usd), 0)::float8 AS usd FROM ai_requests WHERE status <> 'success' AND at >= ${range.from} AND at < ${range.to}`,
  ]);
  const budget = settings["budget.monthlyUsd"];
  const used = budget > 0 ? spend.mtd / budget : null;
  const meterColor = used === null ? "#3987e5" : used >= 1 ? "#d03b3b" : used >= 0.8 ? "#fab219" : "#3987e5";
  const spike = spend.prev7avg > 0 && spend.today > settings["budget.spikeMultiplier"] * spend.prev7avg;

  return (
    <>
      <PageHeader
        title="Usage & Costs"
        description={`Token usage and estimated AI cost · ${range.label} · UTC days`}
        actions={<RangeFilter current={range.key} from={sp.from as string} to={sp.to as string} />}
      />
      <div className="mb-4">
        <Notice>
          <b className="text-white">Estimated, not billed.</b> Costs are calculated from recorded token usage × your pricing table (as of{" "}
          {settings.pricing.asOf}). Confirmed charges are in the Claude Console → Billing; the Anthropic Usage &amp; Cost Admin API isn’t
          connected.
        </Notice>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Est. cost (range)" value={usd(k.costUsd)} />
        <StatTile label="Month to date" value={usd(spend.mtd)} hint="estimate" />
        <StatTile label="Projected month" value={usd(spend.projected)} hint="linear projection" />
        <StatTile label="Today" value={usd(spend.today)} hint={`7-day avg ${usd(spend.prev7avg)}/day`} />
        <StatTile label="Cost per answer" value={usd(k.success ? k.costUsd / k.success : null)} />
        <StatTile label="Spent on failed requests" value={usd(failedCost[0].usd)} hint="partial / refused" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Monthly budget" subtitle={budget > 0 ? `${usd(spend.mtd)} of ${usd(budget)} (estimated)` : "No budget set"}>
          {budget > 0 ? (
            <>
              <div
                className="h-3 rounded-full bg-[#3987e5]/15"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((used ?? 0) * 100)}
                aria-label="Budget used"
              >
                <div className="h-3 rounded-full" style={{ width: `${Math.min((used ?? 0) * 100, 100)}%`, background: meterColor }} />
              </div>
              <p className="mt-2 text-[13px] text-ink">{pct(used, 0)} used</p>
            </>
          ) : (
            <p className="text-[13px] text-mist">
              Set a monthly budget in{" "}
              <Link href="/admin/settings" className="text-cyan hover:underline">
                Settings
              </Link>{" "}
              to get alerts at 80% and 100%.
            </p>
          )}
          <p className={`mt-4 text-[12.5px] ${spike ? "text-[#fac35a]" : "text-mist"}`}>
            {spike
              ? `⚠ Spending spike: today is above ${settings["budget.spikeMultiplier"]}× the 7-day average.`
              : "No spending spike detected today."}
          </p>
        </Card>
        <Card title="Estimated cost per day" className="xl:col-span-2">
          <LineChart data={days} unit="day" format="usd" series={[{ key: "costUsd", label: "Estimated cost", color: SERIES.blue, area: true }]} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Tokens per day" subtitle="Input vs output" className="xl:col-span-2">
          <ColumnChart
            data={days}
            unit="day"
            format="compact"
            series={[
              { key: "inputTokens", label: "Input tokens", color: SERIES.blue },
              { key: "outputTokens", label: "Output tokens", color: SERIES.orange },
            ]}
          />
        </Card>
        <Card title="Usage by feature & account">
          <p className="text-[13px] leading-relaxed text-mist">
            All AI usage comes from one feature — the public website chat. Visitors don’t have accounts, so there is no per-account usage or
            quota to show. Per-visitor abuse is limited by the rate limit ({settings["chat.rateLimitPerMinute"]}/min per IP).
          </p>
        </Card>
      </div>

      <Card className="mt-4" title="Cost by model" subtitle={`${range.label}, estimated`}>
        <Table head={["Model", "Requests", "Input tokens", "Output tokens", "Est. cost", "Share", "Price in / out per 1M"]}>
          {models.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-mist">
                No usage in this range.
              </td>
            </tr>
          ) : (
            models.map((m) => {
              const price = settings.pricing.models[m.model];
              return (
                <tr key={m.model}>
                  <td className="font-mono text-[12px]">{m.model}</td>
                  <td className="tabular-nums">{int(m.requests)}</td>
                  <td className="tabular-nums">{compact(m.inputTokens)}</td>
                  <td className="tabular-nums">{compact(m.outputTokens)}</td>
                  <td className="tabular-nums">{usd(m.costUsd)}</td>
                  <td className="tabular-nums">{k.costUsd > 0 ? pct(m.costUsd / k.costUsd, 0) : "—"}</td>
                  <td className="tabular-nums text-mist">{price ? `$${price.input} / $${price.output}` : "not in pricing table"}</td>
                </tr>
              );
            })
          )}
        </Table>
      </Card>
    </>
  );
}

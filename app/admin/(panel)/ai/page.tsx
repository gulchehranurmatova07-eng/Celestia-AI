import Link from "next/link";
import { ColumnChart, LineChart } from "@/components/admin/charts";
import { QuerySelect, RangeFilter, RefreshButton } from "@/components/admin/controls";
import { BarList, Card, EmptyState, PageHeader, Pagination, StatTile, StatusBadge, Table } from "@/components/admin/ui";
import { DownloadIcon } from "@/components/Icons";
import { SERIES, STATUS } from "@/lib/chartColors";
import { compact, int, ms, pct, usd, utc } from "@/lib/format";
import { can } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";
import { latestHealth } from "@/lib/server/health";
import { byModel, errorCategories, kpis, parseRange, requestPage, requestSeries, REQUEST_STATUSES } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AiOpsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql, admin } = await requirePage("requests.view");
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const range = parseRange(params);
  const page = Math.max(1, Number(str("page")) || 1);

  const [k, series, models, categories, list, health] = await Promise.all([
    kpis(sql, range),
    requestSeries(sql, range),
    byModel(sql, range),
    errorCategories(sql, range),
    requestPage(sql, range, { status: str("status"), model: str("model"), q: str("q"), page, pageSize: PAGE_SIZE }),
    latestHealth(sql),
  ]);
  const provider = health.find((h) => h.service === "ai_provider");

  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const key of ["range", "from", "to", "status", "model", "q"]) if (str(key)) p.set(key, str(key));
    for (const [kk, v] of Object.entries(extra)) p.set(kk, String(v));
    return `?${p.toString()}`;
  };
  const exportHref = `/api/admin/export/requests${qs({})}`;

  return (
    <>
      <PageHeader
        title="AI Operations"
        description={`Model monitoring and request diagnostics · ${range.label} · UTC`}
        actions={
          <>
            <RangeFilter current={range.key} from={str("from")} to={str("to")} />
            <RefreshButton />
            {can(admin.role, "export.data") && (
              <a href={exportHref} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[13px] font-medium text-ink hover:border-cyan/40">
                <DownloadIcon size={15} /> Export CSV
              </a>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatTile label="Requests" value={int(k.requests)} hint={`${int(k.aborted)} aborted by visitor`} />
        <StatTile label="Success rate" value={pct(k.successRate)} hint={`${int(k.success)} ok · ${int(k.failed)} failed`} />
        <StatTile label="Refused (safety)" value={int(k.refused)} />
        <StatTile label="Fallback-model answers" value={int(k.fallbacks)} hint="server-side fallback" />
        <StatTile label="Latency avg · p50" value={ms(k.avgLatencyMs)} hint={`p50 ${ms(k.p50LatencyMs)}`} />
        <StatTile label="p95 latency" value={ms(k.p95LatencyMs)} hint={`first token avg ${ms(k.avgTtftMs)}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Response time" subtitle={`Successful answers, per ${range.unit} (UTC)`}>
          {k.success === 0 ? (
            <EmptyState title="No successful answers in this range" />
          ) : (
            <LineChart
              data={series}
              unit={range.unit}
              format="ms"
              series={[
                { key: "p95LatencyMs", label: "p95", color: SERIES.orange },
                { key: "avgLatencyMs", label: "Average", color: SERIES.blue, area: true },
              ]}
            />
          )}
        </Card>
        <Card title="Generations" subtitle="Successful, failed and refused">
          {k.requests === 0 ? (
            <EmptyState title="No requests in this range" />
          ) : (
            <ColumnChart
              data={series}
              unit={range.unit}
              series={[
                { key: "success", label: "Successful", color: SERIES.blue },
                { key: "refused", label: "Refused", color: STATUS.warning },
                { key: "failed", label: "Failed", color: STATUS.critical },
              ]}
            />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Models" subtitle="Usage, tokens, estimated cost and latency by model" className="xl:col-span-2">
          <Table head={["Model", "Requests", "Failed", "Tokens in / out", "Est. cost", "p95", "Fallbacks"]}>
            {models.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-mist">
                  No usage in this range.
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr key={m.model}>
                  <td className="font-mono text-[12px] text-ink">{m.model}</td>
                  <td className="tabular-nums">{int(m.requests)}</td>
                  <td className="tabular-nums">{int(m.failed)}</td>
                  <td className="tabular-nums">
                    {compact(m.inputTokens)} / {compact(m.outputTokens)}
                  </td>
                  <td className="tabular-nums">{usd(m.costUsd)}</td>
                  <td className="tabular-nums">{ms(m.p95LatencyMs)}</td>
                  <td className="tabular-nums">{int(m.fallbacks)}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
        <Card title="Failure categories" subtitle="Errors and refusals by cause">
          <BarList rows={categories.map((c) => ({ label: c.category, value: c.count }))} format={int} emptyText="No failures in this range. 🎉" />
          <div className="mt-5 border-t border-white/[0.06] pt-4 text-[12.5px]">
            <p className="flex items-center justify-between gap-2">
              <span className="text-mist">Provider availability</span>
              {provider ? <StatusBadge status={provider.status} /> : <StatusBadge status="unknown" />}
            </p>
            <p className="mt-1 text-[11.5px] text-mist/70">{provider ? `${provider.detail} · ${utc(provider.at)}` : "No health check yet."}</p>
            <p className="mt-3 text-[11.5px] leading-relaxed text-mist/70">
              Automatic SDK retries (up to 2 per request) happen inside the provider client and aren’t counted separately; a request that
              still fails after retries is recorded once.
            </p>
          </div>
        </Card>
      </div>

      <Card
        className="mt-4"
        title="Request diagnostics"
        subtitle="Metadata only — conversation text is never stored"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuerySelect
              name="status"
              label="Status"
              value={str("status")}
              options={[{ value: "", label: "All statuses" }, ...REQUEST_STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <QuerySelect name="model" label="Model" value={str("model")} options={[{ value: "", label: "All models" }, ...models.map((m) => ({ value: m.model, label: m.model }))]} />
            <form method="get" className="flex items-center gap-1.5">
              {["range", "from", "to", "status", "model"].map((key) => (str(key) ? <input key={key} type="hidden" name={key} value={str(key)} /> : null))}
              <input name="q" defaultValue={str("q")} placeholder="Request ID…" aria-label="Search by request ID" className="admin-input h-8 w-36 py-0" />
            </form>
          </div>
        }
      >
        <Table head={["Time (UTC)", "Request ID", "Model", "Status", "Category", "Duration", "First token", "Tokens", "Est. cost"]}>
          {list.rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-mist">
                No requests match these filters.
              </td>
            </tr>
          ) : (
            list.rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap tabular-nums text-mist">{utc(r.at, true)}</td>
                <td>
                  <Link href={`/admin/ai/requests/${r.id}`} className="font-mono text-[12px] text-cyan hover:underline">
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="whitespace-nowrap font-mono text-[12px]">
                  {r.served_model ?? r.model}
                  {r.fallback && <span className="ml-1 text-[10px] text-[#fac35a]">fallback</span>}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="text-mist">{r.error_category ?? "—"}</td>
                <td className="tabular-nums">{ms(r.latency_ms)}</td>
                <td className="tabular-nums">{ms(r.ttft_ms)}</td>
                <td className="whitespace-nowrap tabular-nums">{r.input_tokens === null ? "—" : `${compact(r.input_tokens)} / ${compact(r.output_tokens)}`}</td>
                <td className="tabular-nums">{usd(r.cost_usd)}</td>
              </tr>
            ))
          )}
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.total} hrefFor={(p) => qs({ page: p })} />
      </Card>
    </>
  );
}

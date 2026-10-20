import Link from "next/link";
import { LineChart } from "@/components/admin/charts";
import { QuerySelect, RangeFilter, RefreshButton } from "@/components/admin/controls";
import { Card, PageHeader, SeverityBadge, StatTile, StatusBadge, Table } from "@/components/admin/ui";
import { STATUS } from "@/lib/chartColors";
import { ago, int, utc } from "@/lib/format";
import { requirePage } from "@/lib/server/adminSession";
import { errorSeries, parseRange } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

const STATUS_FILTER = ["active", "open", "investigating", "resolved", "ignored", "all"];
const SEVERITIES = ["critical", "high", "medium", "low"];
const SOURCES = ["ai", "backend", "frontend", "database", "auth", "config", "integration"];

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql } = await requirePage("dashboard.view");
  const params = await searchParams;
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const range = parseRange(params);
  const status = STATUS_FILTER.includes(str("status")) ? str("status") : "active";
  const severity = SEVERITIES.includes(str("severity")) ? str("severity") : "";
  const source = SOURCES.includes(str("source")) ? str("source") : "";

  const groups = await sql<
    { fingerprint: string; title: string; source: string; category: string; severity: string; status: string; count: number; first_seen: Date; last_seen: Date; in_range: number; last_hour: number; prev_day: number; assignee: string | null }[]
  >`
    SELECT g.fingerprint, g.title, g.source, g.category, g.severity, g.status, g.count::int, g.first_seen, g.last_seen,
      (SELECT count(*) FROM error_events e WHERE e.fingerprint = g.fingerprint AND e.at >= ${range.from} AND e.at < ${range.to})::int AS in_range,
      (SELECT count(*) FROM error_events e WHERE e.fingerprint = g.fingerprint AND e.at > now() - interval '1 hour')::int AS last_hour,
      (SELECT count(*) FROM error_events e WHERE e.fingerprint = g.fingerprint AND e.at <= now() - interval '1 hour' AND e.at > now() - interval '25 hours')::int AS prev_day,
      a.name AS assignee
    FROM error_groups g LEFT JOIN admin_users a ON a.id = g.assignee_id
    WHERE true
      ${status === "active" ? sql`AND g.status IN ('open','investigating')` : status === "all" ? sql`` : sql`AND g.status = ${status}`}
      ${severity ? sql`AND g.severity = ${severity}` : sql``}
      ${source ? sql`AND g.source = ${source}` : sql``}
    ORDER BY CASE g.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, g.last_seen DESC
    LIMIT 200`;
  const [totals] = await sql<{ open: number; critical: number; events: number; resolved: number }[]>`
    SELECT count(*) FILTER (WHERE status IN ('open','investigating'))::int AS open,
      count(*) FILTER (WHERE status IN ('open','investigating') AND severity = 'critical')::int AS critical,
      (SELECT count(*) FROM error_events WHERE at >= ${range.from} AND at < ${range.to})::int AS events,
      count(*) FILTER (WHERE status = 'resolved' AND resolved_at >= ${range.from})::int AS resolved
    FROM error_groups`;
  const series = await errorSeries(sql, range);

  return (
    <>
      <PageHeader
        title="Error Center"
        description="Errors captured from the AI pipeline, backend, browser, auth and health checks — grouped by fingerprint."
        actions={
          <>
            <RangeFilter current={range.key} from={str("from")} to={str("to")} />
            <RefreshButton />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Open issues" value={int(totals.open)} />
        <StatTile label="Open critical" value={int(totals.critical)} />
        <StatTile label={`Error events · ${range.label.toLowerCase()}`} value={int(totals.events)} />
        <StatTile label="Resolved in range" value={int(totals.resolved)} />
      </div>
      <Card className="mt-4" title="Error events over time" subtitle={`All sources, per ${range.unit} (UTC)`}>
        <LineChart data={series} unit={range.unit} format="int" height={180} series={[{ key: "count", label: "Error events", color: STATUS.critical, area: true }]} />
      </Card>
      <Card
        className="mt-4"
        title="Issues"
        subtitle="Sorted by severity, then most recent"
        actions={
          <div className="flex flex-wrap gap-2">
            <QuerySelect name="status" label="Status" value={status} options={STATUS_FILTER.map((s) => ({ value: s, label: s === "active" ? "Open + investigating" : s[0].toUpperCase() + s.slice(1) }))} />
            <QuerySelect name="severity" label="Severity" value={severity} options={[{ value: "", label: "All severities" }, ...SEVERITIES.map((s) => ({ value: s, label: s }))]} />
            <QuerySelect name="source" label="Source" value={source} options={[{ value: "", label: "All sources" }, ...SOURCES.map((s) => ({ value: s, label: s }))]} />
          </div>
        }
      >
        <Table head={["Severity", "Issue", "Source", "Status", "In range", "Total", "First seen", "Last seen", "Assignee"]}>
          {groups.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-8 text-center text-mist">
                No issues match these filters.
              </td>
            </tr>
          ) : (
            groups.map((g) => {
              const spike = g.last_hour >= 5 && g.last_hour > 3 * (g.prev_day / 24);
              return (
                <tr key={g.fingerprint}>
                  <td>
                    <SeverityBadge severity={g.severity} />
                  </td>
                  <td className="max-w-[360px]">
                    <Link href={`/admin/errors/${g.fingerprint}`} className="text-ink hover:text-cyan hover:underline">
                      {g.title}
                    </Link>
                    {spike && <span className="ml-2 rounded-full bg-[#d03b3b]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#ff9b9b]">SPIKE</span>}
                  </td>
                  <td className="whitespace-nowrap text-mist">
                    {g.source} · {g.category}
                  </td>
                  <td>
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="tabular-nums">{int(g.in_range)}</td>
                  <td className="tabular-nums">{int(g.count)}</td>
                  <td className="whitespace-nowrap text-mist">{utc(g.first_seen)}</td>
                  <td className="whitespace-nowrap text-mist">{ago(g.last_seen)}</td>
                  <td className="text-mist">{g.assignee ?? "—"}</td>
                </tr>
              );
            })
          )}
        </Table>
      </Card>
    </>
  );
}

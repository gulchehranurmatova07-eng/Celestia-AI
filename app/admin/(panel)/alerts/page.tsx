import Link from "next/link";
import { ActionButton, QuerySelect } from "@/components/admin/controls";
import { Card, Kv, PageHeader, SeverityBadge, StatusBadge, Table } from "@/components/admin/ui";
import { ago, usd, utc } from "@/lib/format";
import { can } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

const FILTERS = ["active", "open", "acknowledged", "resolved", "all"];

export default async function AlertsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql, admin } = await requirePage("dashboard.view");
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.status as string) ? (sp.status as string) : "active";
  const settings = await getSettings({ fresh: true });
  const alerts = await sql<
    { id: string; opened_at: Date; updated_at: Date; severity: string; title: string; status: string; link: string | null; acknowledged_at: Date | null; resolved_at: Date | null; ack_name: string | null; detail: Record<string, unknown> }[]
  >`
    SELECT a.id, a.opened_at, a.updated_at, a.severity, a.title, a.status, a.link, a.acknowledged_at, a.resolved_at, u.name AS ack_name, a.detail
    FROM alerts a LEFT JOIN admin_users u ON u.id = a.acknowledged_by
    WHERE true ${filter === "active" ? sql`AND a.status <> 'resolved'` : filter === "all" ? sql`` : sql`AND a.status = ${filter}`}
    ORDER BY a.opened_at DESC LIMIT 200`;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Raised automatically from real signals (health checks, error rate, latency, error spikes, spending). Alerts resolve on their own when the condition clears."
        actions={<QuerySelect name="status" label="Filter" value={filter} options={FILTERS.map((f) => ({ value: f, label: f === "active" ? "Open + acknowledged" : f[0].toUpperCase() + f.slice(1) }))} />}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Alert center" className="xl:col-span-2">
          <Table head={["Severity", "Alert", "Opened", "Status", ""]}>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-mist">
                  No alerts here. All monitored conditions are within thresholds.
                </td>
              </tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id}>
                  <td className="align-top">
                    <SeverityBadge severity={a.severity} />
                  </td>
                  <td className="max-w-[380px] align-top">
                    <p className="text-ink">{a.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-mist">
                      {Object.entries(a.detail)
                        .map(([k, v]) => `${k}: ${typeof v === "number" && k.toLowerCase().includes("usd") ? usd(v) : String(v)}`)
                        .join(" · ")}
                    </p>
                    {a.link && (
                      <Link href={a.link} className="mt-1 inline-block text-[12px] text-cyan hover:underline">
                        View diagnostics →
                      </Link>
                    )}
                  </td>
                  <td className="whitespace-nowrap align-top text-mist">
                    {utc(a.opened_at)}
                    <span className="block text-[11px]">updated {ago(a.updated_at)}</span>
                  </td>
                  <td className="align-top">
                    <StatusBadge status={a.status} />
                    {a.ack_name && <span className="mt-1 block text-[11px] text-mist">by {a.ack_name}</span>}
                    {a.resolved_at && <span className="mt-1 block text-[11px] text-mist">{ago(a.resolved_at)}</span>}
                  </td>
                  <td className="align-top">
                    {a.status === "open" && can(admin.role, "alerts.manage") && (
                      <ActionButton url={`/api/admin/alerts/${a.id}`} className="h-8">
                        Acknowledge
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>
        <Card title="Active thresholds">
          <Kv
            items={[
              ["Failure rate (1h, ≥10 requests)", `> ${settings["alerts.errorRatePct"]}%`],
              ["p95 latency (1h, ≥10 requests)", `> ${settings["alerts.p95LatencyMs"].toLocaleString("en-US")} ms`],
              ["Error spike", "≥10 errors in 1h and 3× the hourly average"],
              ["Monthly budget", settings["budget.monthlyUsd"] > 0 ? `${usd(settings["budget.monthlyUsd"])} (alerts at 80% / 100%)` : "Off"],
              ["Spend spike", `today > ${settings["budget.spikeMultiplier"]}× the 7-day daily average`],
              ["Service down", "Any failed health check"],
            ]}
          />
          <p className="mt-4 text-[11.5px] leading-relaxed text-mist/70">
            Change thresholds in{" "}
            <Link href="/admin/settings" className="text-cyan hover:underline">
              Settings
            </Link>
            . Email/Telegram notifications aren’t connected — no notification provider is configured, so alerts are shown here and as a badge
            in the sidebar.
          </p>
        </Card>
      </div>
    </>
  );
}

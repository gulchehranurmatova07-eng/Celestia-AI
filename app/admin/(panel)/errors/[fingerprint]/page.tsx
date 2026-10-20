import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/admin/charts";
import { ErrorActions } from "@/components/admin/ErrorActions";
import { RangeFilter } from "@/components/admin/controls";
import { Card, Kv, Notice, PageHeader, SeverityBadge, StatusBadge, Table } from "@/components/admin/ui";
import { STATUS } from "@/lib/chartColors";
import { ago, int, utc } from "@/lib/format";
import { can } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";
import { errorSeries, parseRange } from "@/lib/server/metrics";
import { troubleshootingFor } from "@/lib/troubleshooting";

export const dynamic = "force-dynamic";

export default async function ErrorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ fingerprint: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sql, admin } = await requirePage("dashboard.view");
  const { fingerprint } = await params;
  if (!/^[0-9a-f]{20}$/.test(fingerprint)) notFound();
  const sp = await searchParams;
  const range = parseRange({ range: "7d", ...sp });

  const [g] = await sql<
    { title: string; source: string; category: string; severity: string; status: string; count: number; first_seen: Date; last_seen: Date; resolved_at: Date | null; assignee_id: string | null }[]
  >`SELECT title, source, category, severity, status, count::int, first_seen, last_seen, resolved_at, assignee_id FROM error_groups WHERE fingerprint = ${fingerprint}`;
  if (!g) notFound();

  const [events, notes, team, series] = await Promise.all([
    sql<{ id: string; at: Date; message: string; request_id: string | null; path: string | null; detail: Record<string, unknown> }[]>`
      SELECT id, at, message, request_id, path, detail FROM error_events WHERE fingerprint = ${fingerprint} ORDER BY at DESC LIMIT 50`,
    sql<{ at: Date; kind: string; body: string; author: string | null }[]>`
      SELECT n.at, n.kind, n.body, a.name AS author FROM error_notes n LEFT JOIN admin_users a ON a.id = n.author_id
      WHERE n.fingerprint = ${fingerprint} ORDER BY n.at DESC`,
    sql<{ id: string; name: string }[]>`SELECT id, name FROM admin_users WHERE status = 'active' AND role IN ('owner','admin','support') ORDER BY name`,
    errorSeries(sql, range, fingerprint),
  ]);

  // Evidence for "resolved": no occurrences since resolution, plus successful traffic for AI issues.
  let verification: { ok: boolean; text: string } | null = null;
  if (g.status === "resolved" && g.resolved_at) {
    const [v] = await sql<{ since: number; ok: number }[]>`
      SELECT (SELECT count(*) FROM error_events WHERE fingerprint = ${fingerprint} AND at > ${g.resolved_at})::int AS since,
        (SELECT count(*) FROM ai_requests WHERE status = 'success' AND at > ${g.resolved_at})::int AS ok`;
    verification =
      v.since > 0
        ? { ok: false, text: `Not verified: ${v.since} new occurrence(s) since it was marked resolved.` }
        : g.source === "ai"
          ? v.ok > 0
            ? { ok: true, text: `Verified: no recurrence since ${utc(g.resolved_at)} UTC, and ${int(v.ok)} successful AI answers since then.` }
            : { ok: false, text: "Awaiting verification: no recurrence yet, but no successful AI requests since resolution to confirm the fix." }
          : { ok: true, text: `No recurrence since ${utc(g.resolved_at)} UTC. It reopens automatically if it happens again.` };
  }

  return (
    <>
      <PageHeader
        title={g.title}
        description={
          <>
            <Link href="/admin/errors" className="text-cyan hover:underline">
              Error Center
            </Link>{" "}
            / fingerprint <span className="font-mono">{fingerprint}</span>
          </>
        }
        actions={<RangeFilter current={range.key} from={sp.from as string} to={sp.to as string} />}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Summary">
            <div className="mb-4 flex flex-wrap gap-2">
              <SeverityBadge severity={g.severity} />
              <StatusBadge status={g.status} />
            </div>
            <Kv
              items={[
                ["Source · category", `${g.source} · ${g.category}`],
                ["Total occurrences", int(g.count)],
                ["First seen (UTC)", utc(g.first_seen, true)],
                ["Last seen", `${utc(g.last_seen, true)} (${ago(g.last_seen)})`],
              ]}
            />
            {verification && (
              <div className="mt-4">
                <Notice tone={verification.ok ? "info" : "warning"}>{verification.text}</Notice>
              </div>
            )}
          </Card>
          <Card title="Occurrences" subtitle={`Per ${range.unit} (UTC)`}>
            <LineChart data={series} unit={range.unit} format="int" height={170} series={[{ key: "count", label: "Occurrences", color: STATUS.critical, area: true }]} />
          </Card>
          <Card title="Suggested checks" subtitle="Hypotheses based on the error category — not a confirmed root cause">
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-ink/90">
              {troubleshootingFor(g.category).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>
          <Card title="Recent events" subtitle="Latest 50 · secrets are redacted before storage">
            <Table head={["Time (UTC)", "Message", "Request", "Context"]}>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap align-top text-mist">{utc(e.at, true)}</td>
                  <td className="max-w-[380px] break-words align-top font-mono text-[11.5px] text-ink/90">{e.message}</td>
                  <td className="align-top">
                    {e.request_id ? (
                      <Link href={`/admin/ai/requests/${e.request_id}`} className="font-mono text-[12px] text-cyan hover:underline">
                        {e.request_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-mist">—</span>
                    )}
                  </td>
                  <td className="max-w-[260px] break-words align-top font-mono text-[11px] text-mist">
                    {[e.path, ...Object.entries(e.detail ?? {}).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 160) : JSON.stringify(v)}`)]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-4">
          {can(admin.role, "errors.manage") && (
            <Card title="Manage">
              <ErrorActions fingerprint={fingerprint} status={g.status} assigneeId={g.assignee_id} team={team} />
            </Card>
          )}
          <Card title="History & notes">
            {notes.length === 0 ? (
              <p className="text-[13px] text-mist">No notes yet.</p>
            ) : (
              <ol className="space-y-3">
                {notes.map((n, i) => (
                  <li key={i} className="border-l-2 border-white/10 pl-3">
                    <p className="text-[11px] text-mist">
                      {utc(n.at)} · {n.author ?? "System"} · {n.kind}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-ink/90">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

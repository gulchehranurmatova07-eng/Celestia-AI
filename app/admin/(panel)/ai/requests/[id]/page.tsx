import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Kv, PageHeader, SeverityBadge, StatusBadge, Table } from "@/components/admin/ui";
import { int, ms, usd, utc } from "@/lib/format";
import { requirePage } from "@/lib/server/adminSession";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { sql } = await requirePage("requests.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r] = await sql<Record<string, unknown>[]>`SELECT *, cost_usd::float8 AS cost_usd FROM ai_requests WHERE id = ${id}`;
  if (!r) notFound();
  const events = await sql<{ id: string; at: Date; message: string; fingerprint: string; severity: string; title: string; detail: unknown }[]>`
    SELECT e.id, e.at, e.message, e.fingerprint, g.severity, g.title, e.detail
    FROM error_events e JOIN error_groups g USING (fingerprint) WHERE e.request_id = ${id} ORDER BY e.at`;

  return (
    <>
      <PageHeader
        title="Request detail"
        description={
          <>
            <Link href="/admin/ai" className="text-cyan hover:underline">
              AI Operations
            </Link>{" "}
            / <span className="font-mono">{id}</span>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Diagnostics" className="xl:col-span-2">
          <Kv
            items={[
              ["Trace / request ID", <span key="id" className="font-mono text-[12px]">{id}</span>],
              ["Status", <StatusBadge key="s" status={String(r.status)} />],
              ["Time (UTC)", utc(r.at as Date, true)],
              ["Error category", String(r.error_category ?? "—")],
              ["Requested model", String(r.model)],
              ["Served model", `${r.served_model ?? "—"}${r.fallback ? " (server-side fallback)" : ""}`],
              ["Total duration", ms(r.latency_ms as number | null)],
              ["Time to first token", ms(r.ttft_ms as number | null)],
              ["Input tokens", int(r.input_tokens as number | null)],
              ["Output tokens", int(r.output_tokens as number | null)],
              ["Cache read / write tokens", `${int(r.cache_read_tokens as number | null)} / ${int(r.cache_write_tokens as number | null)}`],
              ["Estimated cost", usd(r.cost_usd as number | null)],
              ["Upstream HTTP status", String(r.http_status ?? "—")],
              ["Language · turns", `${r.lang ?? "—"} · ${r.turn_count ?? "—"}`],
              ["Visitor session (anonymous)", String(r.session_id ?? "—")],
            ]}
          />
        </Card>
        <Card title="Privacy">
          <p className="text-[13px] leading-relaxed text-mist">
            Only metadata is recorded. Visitor messages and AI answers are never stored, so this view can’t show conversation content. Visitors
            see the first 8 characters of this ID as a support reference.
          </p>
        </Card>
      </div>
      <Card title="Related errors" className="mt-4">
        <Table head={["Time (UTC)", "Severity", "Error", "Safe diagnostic message"]}>
          {events.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-mist">
                No errors recorded for this request.
              </td>
            </tr>
          ) : (
            events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-mist">{utc(e.at, true)}</td>
                <td>
                  <SeverityBadge severity={e.severity} />
                </td>
                <td>
                  <Link href={`/admin/errors/${e.fingerprint}`} className="text-cyan hover:underline">
                    {e.title}
                  </Link>
                </td>
                <td className="max-w-[420px] break-words font-mono text-[11.5px] text-mist">{e.message}</td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}

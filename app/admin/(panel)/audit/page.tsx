import { AuditVerify } from "@/components/admin/AuditVerify";
import { QuerySelect } from "@/components/admin/controls";
import { Card, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { utc } from "@/lib/format";
import { requirePage } from "@/lib/server/adminSession";

export const dynamic = "force-dynamic";

const CATEGORIES = ["auth", "team", "settings", "errors", "alerts", "data", "health", "system"];
const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql } = await requirePage("audit.view");
  const sp = await searchParams;
  const category = CATEGORIES.includes(sp.category as string) ? (sp.category as string) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = category ? sql`WHERE action LIKE ${category + ".%"}` : sql``;
  const [{ total }] = await sql<{ total: number }[]>`SELECT count(*)::int AS total FROM audit_log ${where}`;
  const rows = await sql<{ id: string; at: Date; actor_email: string | null; action: string; target: string | null; details: Record<string, unknown>; ip: string | null; hash: string }[]>`
    SELECT id, at, actor_email, action, target, details, ip, hash FROM audit_log ${where}
    ORDER BY id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Append-only record of sign-ins and every privileged action. Each entry is hash-chained to the previous one, and the database rejects edits and deletions."
        actions={<AuditVerify />}
      />
      <Card
        title="Entries"
        subtitle={`${total.toLocaleString("en-US")} total`}
        actions={<QuerySelect name="category" label="Category" value={category} options={[{ value: "", label: "All actions" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />}
      >
        <Table head={["#", "Time (UTC)", "Actor", "Action", "Target", "Details", "IP"]}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-mist">
                No entries.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="tabular-nums text-mist" title={`hash ${r.hash}`}>
                  {r.id}
                </td>
                <td className="whitespace-nowrap tabular-nums text-mist">{utc(r.at, true)}</td>
                <td className="max-w-[200px] truncate">{r.actor_email ?? "system / anonymous"}</td>
                <td className="whitespace-nowrap font-mono text-[12px] text-ink">{r.action}</td>
                <td className="max-w-[180px] truncate text-mist">{r.target ?? "—"}</td>
                <td className="max-w-[320px] break-words font-mono text-[11px] text-mist">
                  {Object.keys(r.details ?? {}).length ? JSON.stringify(r.details).slice(0, 240) : "—"}
                </td>
                <td className="whitespace-nowrap font-mono text-[11px] text-mist">{r.ip ?? "—"}</td>
              </tr>
            ))
          )}
        </Table>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}

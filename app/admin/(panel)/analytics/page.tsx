import { LineChart } from "@/components/admin/charts";
import { RangeFilter } from "@/components/admin/controls";
import { BarList, Card, PageHeader, Table } from "@/components/admin/ui";
import { SERIES } from "@/lib/chartColors";
import { int, pct } from "@/lib/format";
import { LANG_META, isLang } from "@/lib/i18n";
import { requirePage } from "@/lib/server/adminSession";
import { eventCounts, funnel, languageBreakdown, parseRange, propBreakdown, visitorSeries } from "@/lib/server/metrics";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  page_view: "Page viewed",
  chat_opened: "Chat opened",
  chat_minimized: "Chat minimized",
  message_sent: "Message sent",
  language_changed: "Language changed",
  cta_shown: "Call-to-action shown",
  cta_clicked: "Call-to-action clicked",
  contact_clicked: "Contact link clicked",
  chat_cleared: "Chat cleared",
  answer_copied: "Answer copied",
};

const CTA_LABEL: Record<string, string> = {
  discuss: "Discuss My Project",
  explore: "Explore Services",
  estimate: "Get a Price Estimate",
  portfolio: "View Portfolio",
  another: "Ask Another Question",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sql } = await requirePage("dashboard.view");
  const sp = await searchParams;
  const range = parseRange({ range: "7d", ...sp });
  const [f, events, langs, ctas, contacts, opens, sources, visitors, settings] = await Promise.all([
    funnel(sql, range),
    eventCounts(sql, range),
    languageBreakdown(sql, range),
    propBreakdown(sql, range, "cta_clicked", "cta"),
    propBreakdown(sql, range, "contact_clicked", "channel"),
    propBreakdown(sql, range, "chat_opened", "source"),
    propBreakdown(sql, range, "message_sent", "source"),
    visitorSeries(sql, range),
    getSettings({ fresh: true }),
  ]);

  const steps = [
    { label: "Visited the site", value: f.visited },
    { label: "Opened the chat", value: f.opened },
    { label: "Sent a message", value: f.messaged },
    { label: "Received an AI answer", value: f.answered },
    { label: "Clicked a call-to-action", value: f.ctaClicked },
    { label: "Clicked Gmail / Telegram", value: f.contacted },
  ];
  const top = Math.max(steps[0].value, 1);

  return (
    <>
      <PageHeader
        title="Product Analytics"
        description={`How visitors use Celestia AI · ${range.label} · anonymous, aggregated`}
        actions={<RangeFilter current={range.key} from={sp.from as string} to={sp.to as string} />}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Conversion funnel" subtitle="Unique anonymous visits reaching each step" className="xl:col-span-2">
          <ol className="space-y-3">
            {steps.map((s, i) => {
              const prev = i === 0 ? null : steps[i - 1].value;
              return (
                <li key={s.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-ink">
                      <span className="mr-2 text-mist">{i + 1}.</span>
                      {s.label}
                    </span>
                    <span className="tabular-nums text-ink">
                      {int(s.value)}
                      <span className="ml-2 hidden text-[11px] text-mist sm:inline">
                        {i === 0 ? "" : `${prev ? pct(s.value / prev, 0) : "—"} of previous · ${pct(s.value / top, 0)} of visits`}
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/[0.04]">
                    <div className="h-2.5 rounded-full bg-[#3987e5]" style={{ width: `${Math.max((s.value / top) * 100, s.value ? 1.5 : 0)}%` }} />
                  </div>
                  {i > 0 && (
                    <p className="mt-1 text-[11px] text-mist sm:hidden">
                      {prev ? pct(s.value / prev, 0) : "—"} of previous · {pct(s.value / top, 0)} of visits
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
        <Card title="Languages" subtitle="Chat requests by language">
          <BarList rows={langs.map((l) => ({ label: isLang(l.value) ? LANG_META[l.value].label : l.value, value: l.count }))} format={int} emptyText="No chat requests in this range." />
        </Card>
      </div>

      <Card className="mt-4" title="Visitors & conversations" subtitle={`Per ${range.unit} (UTC)`}>
        <LineChart
          data={visitors}
          unit={range.unit}
          format="int"
          series={[
            { key: "visitors", label: "Visitors", color: SERIES.blue, area: true },
            { key: "conversations", label: "Conversations", color: SERIES.aqua },
          ]}
        />
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Call-to-action clicks">
          <BarList rows={ctas.map((c) => ({ label: CTA_LABEL[c.value] ?? c.value, value: c.count }))} format={int} emptyText="No CTA clicks yet." />
        </Card>
        <Card title="Contact clicks">
          <BarList rows={contacts.map((c) => ({ label: c.value === "email" ? "Gmail" : c.value === "telegram" ? "Telegram" : c.value, value: c.count }))} format={int} emptyText="No contact clicks yet." />
        </Card>
        <Card title="How the chat was opened">
          <BarList rows={opens.map((c) => ({ label: c.value, value: c.count }))} format={int} emptyText="No chats opened yet." />
        </Card>
        <Card title="How messages were sent">
          <BarList rows={sources.map((c) => ({ label: c.value.replace("_", " "), value: c.count }))} format={int} emptyText="No messages yet." />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="All events" className="xl:col-span-2">
          <Table head={["Event", "Count", "Unique visits"]}>
            {events.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-mist">
                  No events in this range.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.name}>
                  <td>{EVENT_LABEL[e.name] ?? e.name}</td>
                  <td className="tabular-nums">{int(e.count)}</td>
                  <td className="tabular-nums">{int(e.sessions)}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
        <Card title="Privacy & limits">
          <ul className="list-disc space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-mist">
            <li>No cookies, IP addresses, names or message text are stored for analytics.</li>
            <li>A random ID per browser tab groups one visit’s events; it resets when the tab closes.</li>
            <li>Because of that, returning-visitor retention can’t be measured — by design.</li>
            <li>Registration/login funnels don’t apply: the public site has no accounts.</li>
            <li>Events older than {settings["retention.days"]} days are deleted automatically.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

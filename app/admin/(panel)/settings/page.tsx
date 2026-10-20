import { ActionButton } from "@/components/admin/controls";
import { PricingEditor, SettingRow } from "@/components/admin/SettingsControls";
import { PasswordForm } from "@/components/admin/TeamControls";
import { Card, Notice, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { utc } from "@/lib/format";
import { can } from "@/lib/roles";
import { requirePage } from "@/lib/server/adminSession";
import { getSettings } from "@/lib/server/settings";
import { SETTING_META, type SettingKey } from "@/lib/settingsSchema";

export const dynamic = "force-dynamic";

const GROUPS: { title: string; keys: Exclude<SettingKey, "pricing">[] }[] = [
  { title: "AI", keys: ["ai.model", "ai.effort", "ai.maxTokens"] },
  { title: "Chat", keys: ["chat.enabled", "chat.rateLimitPerMinute"] },
  { title: "Budget & alerts", keys: ["budget.monthlyUsd", "budget.spikeMultiplier", "alerts.errorRatePct", "alerts.p95LatencyMs"] },
  { title: "Data retention", keys: ["retention.days"] },
];

const SECRETS = [
  { name: "ANTHROPIC_API_KEY", purpose: "AI answers", required: true },
  { name: "DATABASE_URL", purpose: "Admin, metrics, audit log", required: true },
  { name: "ADMIN_SETUP_TOKEN", purpose: "One-time owner setup (remove after setup)", required: false },
  { name: "CRON_SECRET", purpose: "Scheduled health checks & retention", required: false },
  { name: "NEXT_PUBLIC_PORTFOLIO_URL", purpose: "“View Portfolio” button", required: false },
];

export default async function SettingsPage() {
  const { sql, admin } = await requirePage("dashboard.view");
  const canEdit = can(admin.role, "settings.manage");
  const settings = await getSettings({ fresh: true });
  const history = await sql<{ id: string; at: Date; key: string; old_value: unknown; new_value: unknown; by: string | null }[]>`
    SELECT h.id, h.at, h.key, h.old_value, h.new_value, u.name AS by
    FROM settings_history h LEFT JOIN admin_users u ON u.id = h.changed_by ORDER BY h.at DESC LIMIT 30`;
  const show = (v: unknown) => (v === null ? "default" : typeof v === "object" ? "pricing table" : String(v));

  return (
    <>
      <PageHeader
        title="Settings"
        description="Validated, audited configuration. Changes apply within ~15 seconds. Secrets stay in your hosting environment and are never shown here."
      />
      {!canEdit && (
        <div className="mb-4">
          <Notice>Your role can view settings but not change them.</Notice>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {GROUPS.map((g) => (
            <Card key={g.title} title={g.title}>
              <div className="-my-4">
                {g.keys.map((k) => (
                  <SettingRow key={k} k={k} value={settings[k]} canEdit={canEdit} />
                ))}
              </div>
              {g.title === "Data retention" && can(admin.role, "data.purge") && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d03b3b]/25 p-3">
                  <p className="text-[12.5px] text-mist">Delete data older than {settings["retention.days"]} days now (runs automatically every few hours). The audit log is kept.</p>
                  <ActionButton
                    url="/api/admin/data/purge"
                    method="POST"
                    variant="danger"
                    confirm={{
                      title: "Purge old data now?",
                      message: `Permanently deletes AI request records, analytics events, error events and health checks older than ${settings["retention.days"]} days.`,
                      typeToConfirm: "PURGE",
                      confirmLabel: "Purge",
                      danger: true,
                    }}
                  >
                    Purge now
                  </ActionButton>
                </div>
              )}
            </Card>
          ))}
          <Card title="Model pricing" subtitle={`${settings.pricing.source} · USD per 1M tokens · used for cost estimates only`}>
            <PricingEditor pricing={settings.pricing} canEdit={canEdit} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Secrets & environment" subtitle="Shown as configured / missing only">
            <ul className="space-y-3">
              {SECRETS.map((s) => {
                const set = !!process.env[s.name]?.trim();
                return (
                  <li key={s.name} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] text-ink">{s.name}</p>
                      <p className="text-[11.5px] text-mist">{s.purpose}</p>
                    </div>
                    <StatusBadge status={set ? "active" : s.required ? "error" : "unknown"} label={set ? "Configured" : s.required ? "Missing" : "Not set"} />
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[11.5px] leading-relaxed text-mist/70">Edit these in Vercel → Project → Settings → Environment Variables, then redeploy.</p>
          </Card>
          <Card title="Your account">
            <PasswordForm />
          </Card>
        </div>
      </div>
      <Card className="mt-4" title="Change history" subtitle="Every change can be rolled back to the value before it">
        <Table head={["Time (UTC)", "Setting", "Change", "By", ""]}>
          {history.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-mist">
                No changes yet — all settings are at their defaults.
              </td>
            </tr>
          ) : (
            history.map((h) => (
              <tr key={h.id}>
                <td className="whitespace-nowrap text-mist">{utc(h.at)}</td>
                <td>{SETTING_META[h.key as SettingKey]?.label ?? h.key}</td>
                <td className="font-mono text-[12px]">
                  {show(h.old_value)} → {show(h.new_value)}
                </td>
                <td className="text-mist">{h.by ?? "—"}</td>
                <td>
                  {canEdit && (
                    <ActionButton
                      url="/api/admin/settings"
                      method="POST"
                      body={{ action: "rollback", historyId: Number(h.id) }}
                      className="h-8"
                      variant="ghost"
                      confirm={{
                        title: "Roll back this change?",
                        message: `“${SETTING_META[h.key as SettingKey]?.label ?? h.key}” will return to ${show(h.old_value)}.`,
                        confirmLabel: "Roll back",
                      }}
                    >
                      Roll back
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}

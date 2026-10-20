import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { evaluateAlertsThrottled } from "@/lib/server/alerts";
import { requirePage } from "@/lib/server/adminSession";
import { purgeIfDue } from "@/lib/server/retention";
import { getSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { sql, admin } = await requirePage("dashboard.view");
  const settings = await getSettings({ fresh: true });
  // Housekeeping piggybacks on admin visits (throttled); the optional cron job does the same.
  await evaluateAlertsThrottled(sql, settings).catch((e) => console.error("[celestia-ai] alert evaluation failed:", e));
  await purgeIfDue(sql, settings["retention.days"]).catch((e) => console.error("[celestia-ai] retention failed:", e));
  const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM alerts WHERE status = 'open'`;
  return (
    <AdminShell admin={{ name: admin.name, email: admin.email, role: admin.role }} openAlerts={n}>
      {children}
    </AdminShell>
  );
}

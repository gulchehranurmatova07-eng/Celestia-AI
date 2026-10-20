import { isSettingKey, SETTING_META, validateSetting } from "@/lib/settingsSchema";
import { json, readJson, requireAdminApi } from "@/lib/server/auth";
import { getSettings, invalidateSettingsCache, writeSetting } from "@/lib/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const g = await requireAdminApi(req, "settings.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const body = await readJson(req);
  if (!isSettingKey(body?.key)) return json({ error: "invalid_setting" }, 400);
  const key = body.key;
  const check = validateSetting(key, body.value);
  if (!check.ok) return json({ error: "invalid_value", message: check.error }, 400);
  if (SETTING_META[key].impact === "high" && body.confirm !== true) return json({ error: "confirmation_required" }, 400);

  const before = (await getSettings({ fresh: true }))[key];
  await writeSetting(sql, key, check.value, admin.id);
  await audit("settings.changed", key, { from: before as never, to: check.value as never });
  return json({ ok: true, value: check.value });
}

/** Roll back to the value before a given history entry. */
export async function POST(req: Request) {
  const g = await requireAdminApi(req, "settings.manage");
  if (!g.ok) return g.res;
  const { sql, admin, audit } = g.ctx;
  const body = await readJson(req);
  if (body?.action !== "rollback" || typeof body.historyId !== "number" || body.confirm !== true) {
    return json({ error: "invalid_input" }, 400);
  }
  const [h] = await sql<{ key: string; old_value: unknown }[]>`SELECT key, old_value FROM settings_history WHERE id = ${body.historyId}`;
  if (!h || !isSettingKey(h.key)) return json({ error: "not_found" }, 404);
  const before = (await getSettings({ fresh: true }))[h.key];
  if (h.old_value === null) {
    // The setting was at its default before this change: remove the override.
    await sql`DELETE FROM settings WHERE key = ${h.key}`;
    await sql`INSERT INTO settings_history (key, old_value, new_value, changed_by) VALUES (${h.key}, ${sql.json(before as never)}, NULL, ${admin.id})`;
  } else {
    const check = validateSetting(h.key, h.old_value);
    if (!check.ok) return json({ error: "invalid_value", message: check.error }, 400);
    await writeSetting(sql, h.key, check.value, admin.id);
  }
  invalidateSettingsCache();
  await audit("settings.rolled_back", h.key, { historyId: body.historyId, from: before as never, to: (h.old_value ?? "default") as never });
  return json({ ok: true });
}

import { defaultSettings, validateSetting, type AppSettings, type SettingKey } from "../settingsSchema";
import { getDb, type Sql } from "./db";

const CACHE_MS = 15_000;
let cache: { at: number; value: AppSettings } | null = null;

export function invalidateSettingsCache() {
  cache = null;
}

/**
 * Effective settings: stored overrides on top of env-based defaults. Never throws.
 * The public chat uses a short per-instance cache; admin views pass `fresh` so they
 * always show what is stored (instances don't share memory).
 */
export async function getSettings(opts: { fresh?: boolean } = {}): Promise<AppSettings> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = defaultSettings(process.env);
  try {
    const sql = await getDb();
    if (sql) {
      const rows = await sql<{ key: string; value: unknown }[]>`SELECT key, value FROM settings`;
      for (const row of rows) {
        const check = validateSetting(row.key as SettingKey, row.value);
        if (check.ok) (value as Record<string, unknown>)[row.key] = check.value;
      }
    }
  } catch (err) {
    console.error("[celestia-ai] settings load failed:", err instanceof Error ? err.message : err);
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Writes one validated setting and records its history (for rollback). */
export async function writeSetting(sql: Sql, key: SettingKey, value: unknown, adminId: string) {
  await sql.begin(async (tx) => {
    const [prev] = await tx<{ value: unknown }[]>`SELECT value FROM settings WHERE key = ${key} FOR UPDATE`;
    await tx`
      INSERT INTO settings (key, value, updated_at, updated_by)
      VALUES (${key}, ${tx.json(value as never)}, now(), ${adminId})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`;
    await tx`
      INSERT INTO settings_history (key, old_value, new_value, changed_by)
      VALUES (${key}, ${prev ? tx.json(prev.value as never) : null}, ${tx.json(value as never)}, ${adminId})`;
  });
  invalidateSettingsCache();
}

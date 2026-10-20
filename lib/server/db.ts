import postgres from "postgres";
import { MIGRATIONS } from "./migrations";

// Server-only Postgres access. Works with Neon, Supabase, Vercel Postgres or any
// Postgres 13+ reachable through DATABASE_URL. Without it, the public site keeps
// working and every observability write becomes a no-op.

export type Sql = postgres.Sql<Record<string, unknown>>;

type DbState = { sql: Sql | null; ready: Promise<void> | null; url: string | null };
const globalForDb = globalThis as unknown as { __celestiaDb?: DbState };
const state: DbState = (globalForDb.__celestiaDb ??= { sql: null, ready: null, url: null });

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

function connect(url: string): Sql {
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // compatible with transaction-mode poolers (Neon, Supabase, PgBouncer)
    ssl: local || /sslmode=disable/.test(url) ? false : "require",
    onnotice: () => {},
    connection: { TimeZone: "UTC" }, // all bucketing and reporting is in UTC
    transform: { undefined: null },
  }) as unknown as Sql;
}

async function migrate(sql: Sql) {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274001)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (
      version int PRIMARY KEY, name text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    const rows = await tx<{ version: number }[]>`SELECT version FROM schema_migrations`;
    const applied = new Set(rows.map((r) => r.version));
    for (const m of MIGRATIONS) {
      if (applied.has(m.version)) continue;
      await tx.unsafe(m.sql);
      await tx`INSERT INTO schema_migrations (version, name) VALUES (${m.version}, ${m.name})`;
    }
  });
}

/** Returns a ready (migrated) client, or null when no database is configured. */
export async function getDb(): Promise<Sql | null> {
  const url = databaseUrl();
  if (!url) return null;
  if (!state.sql || state.url !== url) {
    state.sql = connect(url);
    state.url = url;
    state.ready = null;
  }
  const sql = state.sql;
  state.ready ??= migrate(sql).catch((err) => {
    state.ready = null; // retry on the next call
    throw err;
  });
  await state.ready;
  return sql;
}

/** Like getDb() but throws when the database is not configured. */
export async function requireDb(): Promise<Sql> {
  const sql = await getDb();
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}

/** For tests: close the pool so the process can exit. */
export async function closeDb() {
  if (state.sql) await state.sql.end({ timeout: 5 });
  state.sql = null;
  state.ready = null;
  state.url = null;
}

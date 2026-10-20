import { sha256 } from "./security";
import type { Sql } from "./db";

export type AuditEntry = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown>;
  ip?: string | null;
};

const GENESIS = "0".repeat(64);

function canonical(e: {
  at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: unknown;
  ip: string | null;
}) {
  // Stable key order so the hash can be recomputed exactly.
  return JSON.stringify([e.at, e.actor_id, e.actor_email, e.action, e.target, e.details, e.ip]);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/**
 * Appends a hash-chained entry. Each row's hash covers its content and the previous
 * row's hash, so any later edit or deletion breaks verification. A database trigger
 * additionally rejects UPDATE/DELETE/TRUNCATE on the table.
 */
export async function appendAudit(sql: Sql, entry: AuditEntry): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274002)`;
    const [last] = await tx<{ hash: string }[]>`SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`;
    const prevHash = last?.hash ?? GENESIS;
    const row = {
      at: new Date().toISOString(),
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target: entry.target ?? null,
      details: sortKeys(entry.details ?? {}),
      ip: entry.ip ?? null,
    };
    const hash = sha256(prevHash + canonical(row));
    await tx`
      INSERT INTO audit_log (at, actor_id, actor_email, action, target, details, ip, prev_hash, hash)
      VALUES (${row.at}, ${row.actor_id}, ${row.actor_email}, ${row.action}, ${row.target},
              ${tx.json(row.details as never)}, ${row.ip}, ${prevHash}, ${hash})`;
  });
}

/** Recomputes the whole chain. Returns the first broken row id, if any. */
export async function verifyAuditChain(sql: Sql): Promise<{ ok: boolean; checked: number; brokenAt: number | null }> {
  let prev = GENESIS;
  let checked = 0;
  let lastId = 0;
  for (;;) {
    const rows = await sql<
      {
        id: string;
        at: Date;
        actor_id: string | null;
        actor_email: string | null;
        action: string;
        target: string | null;
        details: unknown;
        ip: string | null;
        prev_hash: string;
        hash: string;
      }[]
    >`SELECT * FROM audit_log WHERE id > ${lastId} ORDER BY id LIMIT 1000`;
    if (rows.length === 0) break;
    for (const r of rows) {
      const expected = sha256(
        prev +
          canonical({
            at: r.at.toISOString(),
            actor_id: r.actor_id,
            actor_email: r.actor_email,
            action: r.action,
            target: r.target,
            details: sortKeys(r.details),
            ip: r.ip,
          }),
      );
      if (r.prev_hash !== prev || r.hash !== expected) return { ok: false, checked, brokenAt: Number(r.id) };
      prev = r.hash;
      checked++;
      lastId = Number(r.id);
    }
  }
  return { ok: true, checked, brokenAt: null };
}

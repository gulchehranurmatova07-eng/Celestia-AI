"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminFetch, Button } from "./controls";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
];

export function ErrorActions({
  fingerprint,
  status,
  assigneeId,
  team,
}: {
  fingerprint: string;
  status: string;
  assigneeId: string | null;
  team: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/admin/errors/${fingerprint}`;

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(url, { method: "PATCH", body });
      start(() => router.refresh());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-mist/80">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Button
              key={s.value}
              variant={s.value === status ? "primary" : "secondary"}
              className="h-8"
              disabled={busy || s.value === status}
              aria-pressed={s.value === status}
              onClick={() => patch({ status: s.value })}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-mist/80">Assignee</span>
        <select
          className="admin-input w-full"
          value={assigneeId ?? ""}
          disabled={busy}
          onChange={(e) => patch({ assigneeId: e.target.value || null })}
        >
          <option value="">Unassigned</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (note.trim() && (await patch({ note }))) setNote("");
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-mist/80">Internal note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What did you find? What was changed?"
            className="admin-input h-auto w-full resize-y"
          />
        </label>
        <Button type="submit" className="mt-2" disabled={busy || !note.trim()}>
          Add note
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-[12.5px] text-[#ff9b9b]">
          {error}
        </p>
      )}
    </div>
  );
}

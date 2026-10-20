"use client";

import { useState } from "react";
import { adminFetch, Button } from "./controls";
import { CircleCheckIcon } from "../Icons";

export function AuditVerify() {
  const [state, setState] = useState<{ ok: boolean; checked: number; brokenAt: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            setState((await adminFetch("/api/admin/audit/verify", { method: "GET" })) as never);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <CircleCheckIcon size={15} /> {busy ? "Verifying…" : "Verify integrity"}
      </Button>
      {state && (
        <span role="status" className={`text-[12.5px] ${state.ok ? "text-[#3ccf6e]" : "text-[#ff9b9b]"}`}>
          {state.ok
            ? `Intact — ${state.checked.toLocaleString("en-US")} entries verified against the hash chain.`
            : `Integrity check FAILED at entry #${state.brokenAt} — the log was modified outside the application.`}
        </span>
      )}
      {error && <span className="text-[12.5px] text-[#ff9b9b]">{error}</span>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MODEL_OPTIONS, SETTING_META, type AppSettings, type Pricing, type SettingKey } from "@/lib/settingsSchema";
import { adminFetch, Button, Dialog } from "./controls";

type Editable = Exclude<SettingKey, "pricing">;

function useSave() {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async (key: SettingKey, value: unknown, confirm = false) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await adminFetch("/api/admin/settings", { method: "PATCH", body: { key, value, confirm } });
      setSaved(true);
      start(() => router.refresh());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, saved, save };
}

export function SettingRow({ k, value, canEdit }: { k: Editable; value: AppSettings[Editable]; canEdit: boolean }) {
  const meta = SETTING_META[k];
  const [draft, setDraft] = useState<string>(String(value));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { busy, error, saved, save } = useSave();
  const isBool = typeof value === "boolean";
  const dirty = draft !== String(value);

  const parsed = (): unknown => {
    if (isBool) return draft === "true";
    if (typeof value === "number") return Number(draft);
    return draft;
  };
  const submit = () => (meta.impact === "high" ? setConfirmOpen(true) : save(k, parsed()));

  let input;
  if (k === "ai.model") {
    input = (
      <select disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className="admin-input w-full sm:w-60" aria-label={meta.label}>
        {MODEL_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  } else if (k === "ai.effort") {
    input = (
      <select disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className="admin-input w-full sm:w-60" aria-label={meta.label}>
        {["low", "medium", "high"].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    );
  } else if (isBool) {
    input = (
      <select disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className="admin-input w-full sm:w-60" aria-label={meta.label}>
        <option value="true">On</option>
        <option value="false">Off (maintenance mode)</option>
      </select>
    );
  } else {
    input = <input type="number" disabled={!canEdit} value={draft} onChange={(e) => setDraft(e.target.value)} className="admin-input w-full sm:w-60" aria-label={meta.label} step="any" />;
  }

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.05] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">
          {meta.label}
          {meta.impact === "high" && <span className="ml-2 rounded-full bg-[#fab219]/10 px-1.5 py-0.5 text-[10px] text-[#fac35a]">high impact</span>}
        </p>
        <p className="mt-0.5 text-[12px] text-mist">{meta.help}</p>
        {error && <p className="mt-1 text-[12px] text-[#ff9b9b]">{error}</p>}
        {saved && !dirty && <p className="mt-1 text-[12px] text-[#3ccf6e]">Saved and audited.</p>}
      </div>
      <div className="flex flex-none items-center gap-2">
        {input}
        {canEdit && (
          <Button variant="primary" disabled={!dirty || busy} onClick={submit}>
            Save
          </Button>
        )}
      </div>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={`Change “${meta.label}”?`}>
        <p className="text-[13.5px] leading-relaxed text-mist">
          {k === "chat.enabled" && draft === "false"
            ? "Visitors will immediately see a maintenance message with your contact links instead of AI answers."
            : `This affects every visitor immediately. New value: ${draft}.`}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              if (await save(k, parsed(), true)) setConfirmOpen(false);
            }}
          >
            Confirm change
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function PricingEditor({ pricing, canEdit }: { pricing: Pricing; canEdit: boolean }) {
  const [draft, setDraft] = useState(pricing);
  const { busy, error, saved, save } = useSave();
  const fields = ["input", "output", "cacheRead", "cacheWrite"] as const;
  return (
    <div>
      <div className="scrollbar-thin -mx-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-mist/80">
              <th className="px-5 py-2 font-medium">Model</th>
              {fields.map((f) => (
                <th key={f} className="px-2 py-2 font-medium">
                  {f === "cacheRead" ? "Cache read" : f === "cacheWrite" ? "Cache write" : f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(draft.models).map(([model, price]) => (
              <tr key={model} className="border-t border-white/[0.04]">
                <td className="px-5 py-2 font-mono text-[12px]">{model}</td>
                {fields.map((f) => (
                  <td key={f} className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      disabled={!canEdit}
                      aria-label={`${model} ${f} price`}
                      value={price[f]}
                      onChange={(e) => setDraft({ ...draft, models: { ...draft.models, [model]: { ...price, [f]: Number(e.target.value) } } })}
                      className="admin-input h-8 w-24 py-0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-[12.5px] text-mist">
          Prices as of{" "}
          <input type="date" disabled={!canEdit} value={draft.asOf} onChange={(e) => setDraft({ ...draft, asOf: e.target.value })} className="admin-input ml-1 h-8 py-0" />
        </label>
        {canEdit && (
          <Button variant="primary" disabled={busy || JSON.stringify(draft) === JSON.stringify(pricing)} onClick={() => save("pricing", { ...draft, source: "Edited in admin" })}>
            Save pricing
          </Button>
        )}
        {error && <span className="text-[12px] text-[#ff9b9b]">{error}</span>}
        {saved && <span className="text-[12px] text-[#3ccf6e]">Saved. New requests use these prices; past costs are unchanged.</span>}
      </div>
    </div>
  );
}

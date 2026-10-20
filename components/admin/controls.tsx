"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { ago, ms } from "@/lib/format";
import { CheckIcon, CloseIcon, CopyIcon, RetryIcon } from "../Icons";

const API_ERRORS: Record<string, string> = {
  unauthorized: "Your session expired. Please sign in again.",
  forbidden: "Your role doesn’t allow this action.",
  forbidden_origin: "Request blocked (cross-origin).",
  confirmation_required: "Please confirm this action.",
  cannot_modify_self: "You can’t change your own role or status.",
  last_owner: "There must always be at least one active Owner.",
  email_taken: "An admin with this email already exists.",
  invalid_input: "Some fields are invalid.",
  invalid_value: "That value isn’t allowed.",
  not_found: "Not found (it may have changed). Refresh the page.",
  database_unavailable: "Database unavailable.",
  invalid_credentials: "Current password is incorrect.",
  weak_password: "Password is too weak.",
};

export async function adminFetch(url: string, init: { method: string; body?: unknown }) {
  const res = await fetch(url, {
    method: init.method,
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && !url.includes("/account")) {
    window.location.href = "/admin/login";
  }
  if (!res.ok) {
    const code = String(data.error ?? "error");
    throw new Error(typeof data.message === "string" ? data.message : (API_ERRORS[code] ?? `Request failed (${res.status})`));
  }
  return data;
}

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-electric text-white hover:bg-[#2a7bff] shadow-[0_8px_24px_-12px_rgb(23_107_255/0.9)]",
    secondary: "border border-white/10 bg-white/[0.03] text-ink hover:border-cyan/40 hover:bg-white/[0.05]",
    danger: "border border-[#d03b3b]/40 bg-[#d03b3b]/10 text-[#ffb4b4] hover:bg-[#d03b3b]/20",
    ghost: "text-mist hover:bg-white/[0.05] hover:text-white",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#0b1222] p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-white">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-mist hover:bg-white/5 hover:text-white">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export type ConfirmSpec = { title: string; message: ReactNode; confirmLabel?: string; typeToConfirm?: string; danger?: boolean };

/** Button that calls an admin API (optionally after a confirmation dialog) and refreshes the page. */
export function ActionButton({
  url,
  method = "PATCH",
  body,
  children,
  confirm,
  variant = "secondary",
  onResult,
  className,
}: {
  url: string;
  method?: string;
  body?: Record<string, unknown>;
  children: ReactNode;
  confirm?: ConfirmSpec;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  onResult?: (data: Record<string, unknown>) => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [, startTransition] = useTransition();

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await adminFetch(url, { method, body: confirm ? { ...body, confirm: true, confirmText: confirm.typeToConfirm } : body });
      setOpen(false);
      onResult?.(data);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant={variant} disabled={busy} onClick={() => (confirm ? setOpen(true) : run())} className={className}>
        {children}
      </Button>
      {error && !open && (
        <span role="alert" className="text-xs text-[#ff9b9b]">
          {error}
        </span>
      )}
      {confirm && (
        <Dialog open={open} onClose={() => setOpen(false)} title={confirm.title}>
          <div className="text-[13.5px] leading-relaxed text-mist">{confirm.message}</div>
          {confirm.typeToConfirm && (
            <label className="mt-4 block text-[13px] text-mist">
              Type <span className="font-mono text-white">{confirm.typeToConfirm}</span> to confirm
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="admin-input mt-1.5 w-full"
                autoComplete="off"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-[#ff9b9b]">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={confirm.danger ? "danger" : "primary"}
              disabled={busy || (!!confirm.typeToConfirm && typed !== confirm.typeToConfirm)}
              onClick={run}
            >
              {busy ? "Working…" : (confirm.confirmLabel ?? "Confirm")}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

const PRESETS = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

/** Date-range filter. Writes ?range= (and from/to for custom) and keeps other params. */
export function RangeFilter({ current, from, to }: { current: string; from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [custom, setCustom] = useState(current === "custom");
  const [f, setF] = useState(from ?? "");
  const [t, setT] = useState(to ?? "");

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) (v === null ? p.delete(k) : p.set(k, v));
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={current === p.key}
            onClick={() => {
              setCustom(false);
              go({ range: p.key, from: null, to: null });
            }}
            className={`h-8 rounded-[10px] px-3 text-[12.5px] transition-colors ${
              current === p.key ? "bg-electric/20 text-white" : "text-mist hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={current === "custom"}
          onClick={() => setCustom(true)}
          className={`h-8 rounded-[10px] px-3 text-[12.5px] transition-colors ${
            current === "custom" || custom ? "bg-electric/20 text-white" : "text-mist hover:text-white"
          }`}
        >
          Custom
        </button>
      </div>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (f && t) go({ range: "custom", from: f, to: t });
          }}
        >
          <input type="date" aria-label="From (UTC)" value={f} max={t || undefined} onChange={(e) => setF(e.target.value)} className="admin-input h-8 py-0" />
          <span className="text-mist">→</span>
          <input type="date" aria-label="To (UTC)" value={t} min={f || undefined} onChange={(e) => setT(e.target.value)} className="admin-input h-8 py-0" />
          <Button type="submit" className="h-8" disabled={!f || !t}>
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}

/** Small select that navigates by setting a query parameter. */
export function QuerySelect({ name, value, options, label }: { name: string; value: string; options: { value: string; label: string }[]; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px] text-mist">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set(name, e.target.value);
          else p.delete(name);
          p.delete("page");
          router.push(`${pathname}?${p.toString()}`);
        }}
        className="admin-input h-8 py-0 pr-8"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-electric/[0.08] p-2">
      <code className="min-w-0 flex-1 truncate px-1 text-[12px] text-ink">{value}</code>
      <Button
        className="h-8"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard unavailable — the value stays visible for manual copy.
          }
        }}
      >
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />} {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

type FeedItem = { type: "request" | "error" | "alert"; at: string; ref: string; label: string; meta: string | null; value: number | null; extra: string | null };

/** Live operational feed, polled every 15 seconds while the tab is visible. */
export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const data = await adminFetch("/api/admin/activity", { method: "GET" });
        if (stop) return;
        setItems(data.items as FeedItem[]);
        setUpdated(data.at as string);
        setFailed(false);
      } catch {
        if (!stop) setFailed(true);
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-[11px] text-mist">
        <span className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-[#d03b3b]" : "bg-[#0ca30c] shadow-[0_0_8px_#0ca30c]"}`} />
        {failed ? "Live updates paused (connection problem)" : updated ? `Live · updated ${ago(updated)} · refreshes every 15s` : "Connecting…"}
      </p>
      {items === null ? (
        <p className="py-6 text-center text-[13px] text-mist">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-mist">No activity yet. Events appear here as visitors use the chat.</p>
      ) : (
        <ul className="space-y-1" aria-live="polite">
          {items.map((it) => {
            const href = it.type === "request" ? `/admin/ai/requests/${it.ref}` : it.type === "error" ? `/admin/errors/${it.ref}` : "/admin/alerts";
            const dot =
              it.type === "request"
                ? it.label === "success"
                  ? "bg-[#0ca30c]"
                  : it.label === "aborted"
                    ? "bg-mist"
                    : "bg-[#d03b3b]"
                : it.label === "critical"
                  ? "bg-[#d03b3b]"
                  : it.label === "high"
                    ? "bg-[#ec835a]"
                    : "bg-[#fab219]";
            const text =
              it.type === "request"
                ? `${it.label === "success" ? "Answer generated" : `Request ${it.label}${it.extra ? ` · ${it.extra}` : ""}`} · ${it.meta}${it.value !== null ? ` · ${ms(it.value)}` : ""}`
                : it.type === "error"
                  ? `${it.extra} (${it.meta})`
                  : `Alert: ${it.extra}`;
            return (
              <li key={`${it.type}-${it.ref}-${it.at}`}>
                <Link href={href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-white/[0.03]">
                  <span className={`h-1.5 w-1.5 flex-none rounded-full ${dot}`} />
                  <span className="min-w-0 flex-1 truncate text-ink/90">{text}</span>
                  <span className="flex-none text-[11px] text-mist">{ago(it.at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-label="Refresh data">
      <RetryIcon size={15} className={pending ? "animate-spin" : ""} /> Refresh
    </Button>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { compact } from "@/lib/format";
import { AlertTriangleIcon, CircleCheckIcon, CircleDotIcon, CircleMinusIcon, CircleXIcon } from "../Icons";
import { Sparkline } from "./charts";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-mist">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`admin-card min-w-0 rounded-2xl ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-mist">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaGoodWhen = "up",
  hint,
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Relative change vs previous period (0.12 = +12%), or null for no baseline. */
  delta?: number | null;
  deltaGoodWhen?: "up" | "down" | "neutral";
  hint?: string;
  spark?: number[];
}) {
  let deltaEl: ReactNode = null;
  if (delta !== undefined) {
    if (delta === null) {
      deltaEl = <span className="text-[11px] text-mist/70">no prior data</span>;
    } else {
      const up = delta >= 0;
      const good = deltaGoodWhen === "neutral" ? null : (deltaGoodWhen === "up") === up;
      const color = good === null || Math.abs(delta) < 0.005 ? "text-mist" : good ? "text-[#3ccf6e]" : "text-[#ff7a7a]";
      deltaEl = (
        <span className={`text-[11px] font-medium ${color}`}>
          {up ? "▲" : "▼"} {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
          <span className="font-normal text-mist/70"> vs prev.</span>
        </span>
      );
    }
  }
  return (
    <div className="admin-card flex min-w-0 flex-col justify-between rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] text-mist">{label}</p>
        {spark && spark.some((v) => v > 0) && <Sparkline values={spark} />}
      </div>
      <p className="mt-3 truncate text-[26px] font-semibold leading-none tracking-tight text-white">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-mist">{unit}</span>}
      </p>
      <div className="mt-2 flex min-h-[16px] items-center justify-between gap-2">
        {deltaEl}
        {hint && <span className="truncate text-[11px] text-mist/70">{hint}</span>}
      </div>
    </div>
  );
}

const SEVERITY_STYLE: Record<string, { cls: string; Icon: typeof CircleXIcon }> = {
  critical: { cls: "text-[#ff6b6b] bg-[#d03b3b]/12 border-[#d03b3b]/35", Icon: CircleXIcon },
  high: { cls: "text-[#f39a72] bg-[#ec835a]/12 border-[#ec835a]/35", Icon: AlertTriangleIcon },
  medium: { cls: "text-[#fac35a] bg-[#fab219]/10 border-[#fab219]/30", Icon: AlertTriangleIcon },
  low: { cls: "text-mist bg-white/[0.04] border-white/10", Icon: CircleDotIcon },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${s.cls}`}>
      <s.Icon size={12} /> {severity}
    </span>
  );
}

const STATUS_STYLE: Record<string, { cls: string; Icon: typeof CircleXIcon; label?: string }> = {
  success: { cls: "text-[#3ccf6e] bg-[#0ca30c]/12 border-[#0ca30c]/35", Icon: CircleCheckIcon },
  up: { cls: "text-[#3ccf6e] bg-[#0ca30c]/12 border-[#0ca30c]/35", Icon: CircleCheckIcon, label: "Operational" },
  resolved: { cls: "text-[#3ccf6e] bg-[#0ca30c]/12 border-[#0ca30c]/35", Icon: CircleCheckIcon },
  active: { cls: "text-[#3ccf6e] bg-[#0ca30c]/12 border-[#0ca30c]/35", Icon: CircleCheckIcon },
  error: { cls: "text-[#ff6b6b] bg-[#d03b3b]/12 border-[#d03b3b]/35", Icon: CircleXIcon, label: "Failed" },
  down: { cls: "text-[#ff6b6b] bg-[#d03b3b]/12 border-[#d03b3b]/35", Icon: CircleXIcon, label: "Down" },
  open: { cls: "text-[#ff8f8f] bg-[#d03b3b]/10 border-[#d03b3b]/30", Icon: CircleDotIcon },
  suspended: { cls: "text-[#ff8f8f] bg-[#d03b3b]/10 border-[#d03b3b]/30", Icon: CircleMinusIcon },
  degraded: { cls: "text-[#fac35a] bg-[#fab219]/10 border-[#fab219]/30", Icon: AlertTriangleIcon, label: "Degraded" },
  refused: { cls: "text-[#fac35a] bg-[#fab219]/10 border-[#fab219]/30", Icon: AlertTriangleIcon },
  investigating: { cls: "text-[#fac35a] bg-[#fab219]/10 border-[#fab219]/30", Icon: AlertTriangleIcon },
  acknowledged: { cls: "text-[#8fb8ff] bg-electric/12 border-electric/35", Icon: CircleDotIcon },
  aborted: { cls: "text-mist bg-white/[0.04] border-white/10", Icon: CircleMinusIcon },
  ignored: { cls: "text-mist bg-white/[0.04] border-white/10", Icon: CircleMinusIcon },
  unconfigured: { cls: "text-mist bg-white/[0.04] border-white/10", Icon: CircleMinusIcon, label: "Not configured" },
  unknown: { cls: "text-mist bg-white/[0.04] border-white/10", Icon: CircleMinusIcon, label: "No data" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.unknown;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${s.cls}`}>
      <s.Icon size={12} /> {label ?? s.label ?? status}
    </span>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-mist/60">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-[13px] leading-relaxed text-mist">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "danger"; children: ReactNode }) {
  const cls =
    tone === "danger"
      ? "border-[#d03b3b]/35 bg-[#d03b3b]/10 text-[#ffc4c4]"
      : tone === "warning"
        ? "border-[#fab219]/30 bg-[#fab219]/[0.07] text-[#fbd78a]"
        : "border-electric/30 bg-electric/[0.08] text-[#bcd3ff]";
  return <div className={`rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${cls}`}>{children}</div>;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="scrollbar-thin -mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.08em] text-mist/80">
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium first:pl-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-white/[0.04] [&>tr:last-child]:border-0 [&_td]:px-5 [&_td]:py-2.5 [&>tr:hover]:bg-white/[0.02]">
          {children}
        </tbody>
      </table>
      {empty}
    </div>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ink transition-colors hover:border-cyan/40";
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-mist">
      <span>
        {from}–{to} of {total.toLocaleString("en-US")}
      </span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={btn} href={hrefFor(page - 1)}>Previous</Link> : <span className={`${btn} opacity-40`}>Previous</span>}
        {page < pages ? <Link className={btn} href={hrefFor(page + 1)}>Next</Link> : <span className={`${btn} opacity-40`}>Next</span>}
      </div>
    </div>
  );
}

export function BarList({ rows, format = (n) => compact(n), emptyText = "No data in this range." }: { rows: { label: string; value: number; hint?: string }[]; format?: (n: number) => string; emptyText?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <p className="py-6 text-center text-[13px] text-mist">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{r.label}</span>
            <span className="flex-none tabular-nums text-ink">
              {format(r.value)}
              {r.hint && <span className="ml-1.5 text-[11px] text-mist">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.04]" title={`${r.label}: ${format(r.value)}`}>
            <div className="h-2 rounded-full bg-[#3987e5] transition-[width]" style={{ width: `${Math.max((r.value / max) * 100, 1.5)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Kv({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-[0.08em] text-mist/80">{k}</dt>
          <dd className="mt-0.5 break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

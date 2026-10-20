"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { SERIES } from "@/lib/chartColors";
import { compact, int, ms, pct, usd } from "@/lib/format";

// Lightweight, dependency-free SVG charts. Palette lives in lib/chartColors.

export type Fmt = "int" | "compact" | "usd" | "ms" | "pct";
const fmt = (f: Fmt, v: number | null) =>
  f === "usd" ? usd(v) : f === "ms" ? ms(v) : f === "pct" ? pct(v) : f === "int" ? int(v) : compact(v);

type Point = { t: string } & Record<string, number | string | null>;
type Series = { key: string; label: string; color: string; area?: boolean };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * exp;
}

/** Axis maximum; whole-number ticks for count data. */
function axisMax(v: number, format: Fmt) {
  const m = niceMax(v);
  return format === "int" ? Math.max(4, Math.ceil(m / 4) * 4) : m;
}

function tickLabel(t: string, unit: "hour" | "day") {
  const iso = new Date(t).toISOString();
  return unit === "hour" ? `${iso.slice(11, 13)}:00` : `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

function fullLabel(t: string, unit: "hour" | "day") {
  const iso = new Date(t).toISOString();
  return unit === "hour" ? `${iso.slice(0, 10)} ${iso.slice(11, 13)}:00 UTC` : `${iso.slice(0, 10)} (UTC)`;
}

const H = 220;
const PAD = { top: 12, right: 22, bottom: 26 };

/** Left padding wide enough for the longest y-axis label (avoids clipping "1,500 ms"). */
function leftPad(labels: string[]) {
  const longest = Math.max(...labels.map((l) => l.length), 1);
  return Math.min(Math.max(Math.ceil(longest * 6.4) + 14, 36), 96);
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-[12px] text-mist">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, width, title, rows, format }: { x: number; width: number; title: string; rows: { label: string; color: string; value: number | null }[]; format: Fmt }) {
  const left = Math.min(Math.max(x + 12, 0), Math.max(width - 190, 0));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[160px] rounded-xl border border-white/10 bg-[#0d1529]/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur"
      style={{ left }}
    >
      <p className="mb-1 text-[11px] text-mist">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          <span className="h-[3px] w-3 flex-none rounded-full" style={{ background: r.color }} />
          <span className="font-semibold tabular-nums text-white">{fmt(format, r.value)}</span>
          <span className="text-mist">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

/** Line/area time series with a crosshair that snaps to the nearest bucket. */
export function LineChart({ data, series, unit, format = "compact", height = H }: { data: Point[]; series: Series[]; unit: "hour" | "day"; format?: Fmt; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const max = useMemo(() => axisMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0)))), format), [data, series, format]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const axisFmt: Fmt = format === "int" ? "compact" : format;
  const left = leftPad(ticks.map((t) => fmt(axisFmt, t)));
  const innerW = Math.max(width - left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const step = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70))));

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(rel * (data.length - 1)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min((h ?? -1) + 1, data.length - 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max((h ?? data.length) - 1, 0));
  };

  return (
    <div>
      <Legend series={series} />
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${series.map((s) => s.label).join(", ")} over time`}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
            className="outline-none focus-visible:ring-1 focus-visible:ring-cyan/40"
          >
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={s.color} stopOpacity="0.18" />
                  <stop offset="1" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={left + innerW} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
                <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-[#7f8aa3] text-[10.5px] tabular-nums">
                  {fmt(axisFmt, t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % step === 0 ? (
                <text key={d.t} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[#7f8aa3] text-[10.5px] tabular-nums">
                  {tickLabel(d.t, unit)}
                </text>
              ) : null,
            )}
            {series.map((s) => {
              const pts = data.map((d, i) => [x(i), y(Number(d[s.key] ?? 0))] as const);
              const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
              return (
                <g key={s.key}>
                  {s.area && pts.length > 1 && (
                    <path d={`${line}L${pts[pts.length - 1][0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={`url(#${gid}-${s.key})`} />
                  )}
                  <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}
            {hover !== null && data[hover] && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.25)" />
                {series.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover][s.key] ?? 0))} r={4} fill={s.color} stroke="#0b1222" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              x={left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip
            x={x(hover)}
            width={width}
            title={fullLabel(data[hover].t, unit)}
            format={format}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: (data[hover][s.key] as number | null) ?? null }))}
          />
        )}
      </div>
    </div>
  );
}

/** Stacked columns (e.g. successful vs failed requests per bucket). */
export function ColumnChart({ data, series, unit, format = "int", height = H }: { data: Point[]; series: Series[]; unit: "hour" | "day"; format?: Fmt; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => series.reduce((a, s) => a + Number(d[s.key] ?? 0), 0));
  const max = axisMax(Math.max(0, ...totals), format);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const axisFmt: Fmt = format === "int" ? "compact" : format;
  const left = leftPad(ticks.map((t) => fmt(axisFmt, t)));
  const innerW = Math.max(width - left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, Math.max(band - 4, 2));
  const y = (v: number) => (v / max) * innerH;
  const step = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70))));

  return (
    <div>
      <Legend series={series} />
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${series.map((s) => s.label).join(" and ")} per ${unit}`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={left + innerW} y1={PAD.top + innerH - y(t)} y2={PAD.top + innerH - y(t)} stroke="rgba(255,255,255,0.06)" />
                <text x={left - 8} y={PAD.top + innerH - y(t) + 4} textAnchor="end" className="fill-[#7f8aa3] text-[10.5px] tabular-nums">
                  {fmt(axisFmt, t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = left + band * i + band / 2;
              let acc = 0;
              return (
                <g
                  key={d.t}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  className="outline-none"
                >
                  <rect x={left + band * i} y={PAD.top} width={band} height={innerH} fill={hover === i ? "rgba(255,255,255,0.04)" : "transparent"} />
                  {series.map((s, si) => {
                    const v = Number(d[s.key] ?? 0);
                    if (v <= 0) return null;
                    const h = y(v);
                    const top = PAD.top + innerH - acc - h;
                    acc += h + 2; // 2px surface gap between stacked segments
                    const isTop = series.slice(si + 1).every((n) => Number(d[n.key] ?? 0) <= 0);
                    const r = isTop ? Math.min(4, barW / 2, h) : 0;
                    return (
                      <path
                        key={s.key}
                        d={`M${cx - barW / 2},${top + h}V${top + r}Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top}H${cx + barW / 2 - r}Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r}V${top + h}Z`}
                        fill={s.color}
                        opacity={hover === null || hover === i ? 1 : 0.55}
                      />
                    );
                  })}
                  {i % step === 0 && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-[#7f8aa3] text-[10.5px] tabular-nums">
                      {tickLabel(d.t, unit)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && data[hover] && (
          <Tooltip
            x={left + band * hover + band / 2}
            width={width}
            title={fullLabel(data[hover].t, unit)}
            format={format}
            rows={series.map((s) => ({ label: s.label, color: s.color, value: Number(data[hover][s.key] ?? 0) }))}
          />
        )}
      </div>
    </div>
  );
}

export function Sparkline({ values, color = SERIES.blue }: { values: number[]; color?: string }) {
  const w = 72;
  const h = 24;
  const max = Math.max(...values, 0) || 1;
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - 2 - (v / max) * (h - 4)}`);
  return (
    <svg width={w} height={h} aria-hidden="true" className="flex-none opacity-80">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

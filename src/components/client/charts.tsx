"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/* ─────────────────────────────────────────────────────────────────────────────
   Small, dependency-free chart kit following the Groundwork dataviz rules:
   thin marks, 4px rounded data-ends square at the baseline, 2px surface gaps,
   recessive hairline grid, text in ink tokens (never series colors),
   hover + keyboard-focus tooltips, and a table view for every chart.
   ───────────────────────────────────────────────────────────────────────────── */

type Tip = { x: number; y: number; value: string; label: string } | null;

/** Hosts a single tooltip for any descendant carrying data-tip-value / data-tip-label. */
export function TipHost({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const show = (el: Element | null) => {
    const target = el?.closest<HTMLElement>("[data-tip-value]");
    const host = ref.current;
    if (!target || !host) return setTip(null);
    const r = target.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    setTip({ x: r.left - h.left + r.width / 2, y: r.top - h.top, value: target.dataset.tipValue ?? "", label: target.dataset.tipLabel ?? "" });
  };
  return (
    <div
      ref={ref}
      className={cx("relative", className)}
      onPointerOver={(e) => show(e.target as Element)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => show(e.target as Element)}
      onBlur={() => setTip(null)}
    >
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left whitespace-nowrap shadow-pop"
          style={{ left: Math.max(60, tip.x), top: tip.y - 8 }}
        >
          <div className="tnum text-[13px] font-semibold text-ink">{tip.value}</div>
          <div className="text-[12px] text-ink-3">{tip.label}</div>
        </div>
      )}
    </div>
  );
}

export function LegendItem({ swatch, children }: { swatch: "done" | "missed" | "track" | "line" | "dashed" | "project"; children: ReactNode }) {
  const s = {
    done: <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-done)" }} />,
    missed: <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-missed)" }} />,
    track: <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--chart-track)" }} />,
    line: <span className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--chart-done)" }} />,
    dashed: <span className="inline-block w-4 border-t-2 border-dashed border-ink-3" />,
    project: <span className="inline-block size-1.5 rounded-full bg-ink-2" />,
  }[swatch];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
      {s}
      {children}
    </span>
  );
}

export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">Show data table</summary>
      <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2 text-left text-ink-2">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tnum divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5 text-ink-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/* ── Runway: one column per day from plan start to the deadline ─────────── */

export interface RunwayDay {
  date: string;
  label: string; // "Mon, Nov 16"
  done: number;
  missed: number;
  planned: number;
  isToday: boolean;
  isPast: boolean;
  hasProject: boolean;
  monthLabel?: string;
}

export function Runway({ days, height = 64 }: { days: RunwayDay[]; height?: number }) {
  const max = Math.max(60, ...days.map((d) => d.done + d.missed + d.planned));
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
  return (
    <div>
      <TipHost>
        <div className="flex items-end gap-[2px] sm:gap-[3px]" style={{ height }} role="list" aria-label="Daily scheduled study from plan start to December 31">
          {days.map((d) => {
            const total = d.done + d.missed + d.planned;
            const h = (v: number) => (v > 0 ? Math.max(3, (v / max) * (height - 4)) : 0);
            const tip = d.isPast
              ? `${fmt(d.done)} done${d.missed ? `, ${fmt(d.missed)} moved forward` : ""}`
              : total
                ? `${fmt(d.planned + d.done)} scheduled${d.done ? `, ${fmt(d.done)} done` : ""}`
                : "Nothing scheduled";
            return (
              <div
                key={d.date}
                role="listitem"
                tabIndex={0}
                data-tip-value={tip}
                data-tip-label={`${d.label}${d.isToday ? " (today)" : ""}${d.hasProject ? ", weekend project" : ""}`}
                aria-label={`${d.label}: ${tip}`}
                className={cx("group relative flex h-full min-w-0 flex-1 flex-col justify-end gap-[2px] rounded-[3px] outline-offset-1", d.isToday && "bg-surface-2")}
              >
                {d.planned > 0 && <div className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80" style={{ height: h(d.planned), background: "var(--chart-track)" }} />}
                {d.missed > 0 && <div className={cx("w-full", d.planned ? "" : "rounded-t-[4px]")} style={{ height: h(d.missed), background: "var(--chart-missed)" }} />}
                {d.done > 0 && <div className={cx("w-full", d.planned || d.missed ? "" : "rounded-t-[4px]")} style={{ height: h(d.done), background: "var(--chart-done)" }} />}
                {total === 0 && <div className="h-[3px] w-full rounded-full bg-line" />}
                {d.isToday && <div className="absolute inset-x-0 -bottom-[5px] mx-auto h-[3px] w-full rounded-full bg-ink" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </TipHost>
      <div className="mt-2.5 flex gap-[2px] sm:gap-[3px]" aria-hidden="true">
        {days.map((d) => (
          <div key={d.date} className="relative flex h-4 min-w-0 flex-1 justify-center">
            {d.hasProject && <span className="mt-0.5 size-1.5 rounded-full bg-ink-2" />}
            {d.monthLabel && <span className="absolute top-3 left-0 text-[11.5px] whitespace-nowrap text-ink-3">{d.monthLabel}</span>}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
        <LegendItem swatch="done">Done</LegendItem>
        <LegendItem swatch="missed">Missed, moved forward</LegendItem>
        <LegendItem swatch="track">Still scheduled</LegendItem>
        <LegendItem swatch="project">Weekend project</LegendItem>
      </div>
    </div>
  );
}

/* ── Horizontal bars (single series) ───────────────────────────────────── */

export function HBarList({ rows, valueFormat }: { rows: { key: string; label: string; value: number; max: number; href?: string; sub?: string }[]; valueFormat?: (v: number, max: number) => string }) {
  const fmt = valueFormat ?? ((v, m) => `${v}/${m}`);
  return (
    <TipHost>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = r.max ? (r.value / r.max) * 100 : 0;
          return (
            <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_3.5rem]">
              <span className="truncate text-[13px] text-ink-2" title={r.label}>
                {r.label}
              </span>
              <span className="tnum text-right text-[13px] text-ink sm:order-last">{fmt(r.value, r.max)}</span>
              <div
                tabIndex={0}
                data-tip-value={`${fmt(r.value, r.max)} (${Math.round(pct)}%)`}
                data-tip-label={r.sub ?? r.label}
                aria-label={`${r.label}: ${fmt(r.value, r.max)}`}
                className="col-span-2 h-2 rounded-full sm:col-span-1"
                style={{ background: "var(--chart-track)" }}
              >
                <div className="h-full rounded-full" style={{ width: `${Math.max(pct, r.value ? 2 : 0)}%`, background: "var(--chart-done)" }} />
              </div>
            </li>
          );
        })}
      </ul>
    </TipHost>
  );
}

/* ── Columns (single series, e.g. hours per week) ──────────────────────── */

export function Columns({ data, height = 140, unit = "" }: { data: { key: string; label: string; short: string; value: number }[]; height?: number; unit?: string }) {
  const format = (v: number) => `${v}${unit ? ` ${unit}` : ""}`;
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  return (
    <TipHost>
      <div className="relative" style={{ height: height + 22 }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: 22 + (t / top) * height }}>
            <span className="tnum w-8 -translate-y-1/2 text-right text-[11px] text-ink-3">{format(t)}</span>
            <div className="h-px flex-1 -translate-y-1/2 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-10 flex items-end justify-around gap-[2px]">
          {data.map((d) => (
            <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <div
                tabIndex={0}
                data-tip-value={format(d.value)}
                data-tip-label={d.label}
                aria-label={`${d.label}: ${format(d.value)}`}
                className="w-full max-w-6 rounded-t-[4px] transition-opacity hover:opacity-80"
                style={{ height: d.value ? Math.max(2, (d.value / top) * height) : 0, background: "var(--chart-done)" }}
              />
              <span className="mt-1.5 h-4 truncate text-[11px] text-ink-3">{d.short}</span>
            </div>
          ))}
        </div>
      </div>
    </TipHost>
  );
}

function niceTicks(max: number) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => max / s <= 4) ?? Math.ceil(max / 4);
  const out: number[] = [];
  for (let v = 0; v <= max + step - 1e-9; v += step) out.push(v);
  if (out.length < 2) out.push(step);
  return out;
}

/* ── Line: actual cumulative vs. planned pace, with crosshair ───────────── */

export function TrendLine({ points, target, height = 200, todayIndex }: { points: { date: string; label: string; actual: number | null; plan: number }[]; target: number; height?: number; todayIndex: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const padL = 34;
  const padR = 84;
  const padT = 10;
  const padB = 24;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const ticks = niceTicks(Math.max(target, 1, ...points.map((p) => p.actual ?? 0)));
  const top = ticks[ticks.length - 1];
  const x = (i: number) => padL + (points.length <= 1 ? 0 : (i / (points.length - 1)) * w);
  const y = (v: number) => padT + h - (v / top) * h;
  const actualPts = points.map((p, i) => (p.actual == null ? null : `${x(i)},${y(p.actual)}`)).filter(Boolean);
  const planPath = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.plan)}`).join(" ");
  const lastActualIdx = points.reduce((n, p, i) => (p.actual != null ? i : n), -1);
  const hv = hover != null ? points[hover] : null;

  const onMove = (clientX: number) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.round(((clientX - r.left - padL) / w) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div ref={wrap} className="relative select-none">
      <svg
        width={width}
        height={height}
        className="block max-w-full touch-pan-y"
        role="img"
        aria-label={`Topics completed over time versus planned pace. ${lastActualIdx >= 0 ? `${points[lastActualIdx].actual} completed so far` : "No topics completed yet"}, ${target} planned by December 31.`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setHover((v) => Math.min(points.length - 1, (v ?? todayIndex) + 1));
          if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? todayIndex) - 1));
        }}
        onFocus={() => setHover(todayIndex)}
        onBlur={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-3 text-[11px]">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i === 0 || p.date.endsWith("-01") || i === points.length - 1 ? (
            <text key={p.date} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-ink-3 text-[11px]">
              {p.label.replace(/^\w+, /, "")}
            </text>
          ) : null,
        )}
        <path d={planPath} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
        {actualPts.length > 1 && <polyline points={actualPts.join(" ")} fill="none" stroke="var(--chart-done)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {lastActualIdx >= 0 && (
          <>
            <circle cx={x(lastActualIdx)} cy={y(points[lastActualIdx].actual!)} r={5} fill="var(--chart-done)" stroke="var(--surface)" strokeWidth={2} />
            <text x={x(lastActualIdx) + 9} y={y(points[lastActualIdx].actual!)} dy="0.32em" className="tnum fill-ink text-[12px] font-semibold">
              {points[lastActualIdx].actual}
            </text>
          </>
        )}
        <text x={padL + w + 6} y={y(points[points.length - 1].plan)} dy="0.32em" className="tnum fill-ink-2 text-[12px]">
          {points[points.length - 1].plan} planned
        </text>
        {hv && hover != null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + h} stroke="var(--line-strong)" strokeWidth={1} />}
      </svg>
      {hv && hover != null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-pop"
          style={{ left: Math.min(width - 150, Math.max(0, x(hover) + 8)) }}
        >
          <div className="mb-1 text-ink-3">{hv.label}</div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-3 rounded" style={{ background: "var(--chart-done)" }} />
            <span className="tnum font-semibold text-ink">{hv.actual ?? "—"}</span>
            <span className="text-ink-3">completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 border-t-2 border-dashed border-ink-3" />
            <span className="tnum font-semibold text-ink">{hv.plan}</span>
            <span className="text-ink-3">planned pace</span>
          </div>
        </div>
      )}
    </div>
  );
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ── Contribution heatmap ──────────────────────────────────────────────── */

export interface HeatCell {
  date: string;
  label: string;
  minutes: number;
  events: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export function Heatmap({ weeks, monthLabels }: { weeks: HeatCell[][]; monthLabels: { index: number; label: string }[] }) {
  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""];
  return (
    <div>
      <TipHost className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1">
          <div className="relative ml-8 h-4">
            {monthLabels.map((m) => (
              <span key={m.label + m.index} className="absolute text-[11px] text-ink-3" style={{ left: m.index * 16 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <div className="flex w-7 flex-col gap-1" aria-hidden="true">
              {dayLabels.map((d, i) => (
                <span key={i} className="h-3 text-[10.5px] leading-3 text-ink-3">
                  {d}
                </span>
              ))}
            </div>
            <div className="flex gap-1" role="grid" aria-label="Daily learning activity">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1" role="row">
                  {week.map((c) => (
                    <div
                      key={c.date}
                      role="gridcell"
                      tabIndex={c.future ? -1 : 0}
                      data-tip-value={c.future ? "Upcoming" : c.events ? `${c.minutes} min, ${c.events} ${c.events === 1 ? "activity" : "activities"}` : "No learning activity"}
                      data-tip-label={c.label}
                      aria-label={`${c.label}: ${c.future ? "upcoming" : c.events ? `${c.minutes} minutes, ${c.events} activities` : "no activity"}`}
                      className={cx("size-3 rounded-[3px]", c.future && "opacity-40")}
                      style={{ background: `var(--heat-${c.level})` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </TipHost>
      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-3 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        More
      </div>
    </div>
  );
}

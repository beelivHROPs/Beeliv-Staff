"use client";

import { useId } from "react";
import { ChartPlot, type PlotBox } from "./ChartPlot";
import { ChartTooltip, type TooltipRow } from "./ChartTooltip";
import { GRID, PLUM } from "./colors";

export type TrendPoint = {
  id: string;
  /** Top axis line, e.g. "Mon". */
  label: string;
  /** Second axis line, e.g. "24 Sep". */
  sub: string;
  /** Tooltip heading, e.g. "Thursday, 24 September". */
  title: string;
  value: number;
  rows: TooltipRow[];
  footer?: TooltipRow;
};

const BOX: PlotBox = { left: 40, right: 12, top: 30, bottom: 34 };

/**
 * Smooth path through the points (monotone cubic, Fritsch-Carlson): curves
 * like an analytics chart but never overshoots the real values - a rate can't
 * appear to dip below its lowest day or peak above its highest.
 */
function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return n ? `M${pts[0][0]} ${pts[0][1]}` : "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c = dx[i] / 3;
    d += ` C${(pts[i][0] + c).toFixed(1)} ${(pts[i][1] + c * t[i]).toFixed(1)} ${(pts[i + 1][0] - c).toFixed(1)} ${(pts[i + 1][1] - c * t[i + 1]).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/**
 * Analytics-style trend (project lead, 2026-09-30): smooth monotone curve,
 * soft plum gradient fill, and the peak value called out in a small pill
 * (like the reference's "93.6%"). One primary series (Client plum). Pure SVG.
 * Hover / touch scrub / arrow keys inspect a point. The value domain is set by
 * the caller (a rate: 0-100 with % ticks) - the chart draws, it never decides
 * what a "good" value is (no thresholds, no targets).
 */
export function TrendChart({
  points,
  height = 220,
  min = 0,
  max = 100,
  ticks = [0, 25, 50, 75, 100],
  format = (n: number) => `${n}%`,
  color = PLUM,
  summary,
  hint = "Trend by day. Use the left and right arrow keys to inspect each day.",
}: {
  points: TrendPoint[];
  height?: number;
  min?: number;
  max?: number;
  ticks?: number[];
  format?: (n: number) => string;
  color?: string;
  summary: string;
  hint?: string;
}) {
  const uid = useId();
  const plotH = height - BOX.top - BOX.bottom;
  const y = (v: number) => BOX.top + plotH - ((v - min) / (max - min)) * plotH;
  const xs = (i: number, w: number) => (points.length === 1 ? BOX.left + (w - BOX.left - BOX.right) / 2 : BOX.left + ((w - BOX.left - BOX.right) * i) / (points.length - 1));

  return (
    <ChartPlot
      height={height}
      count={points.length}
      summary={summary}
      hint={hint}
      indexAt={(x, w) => (points.length === 1 ? 0 : Math.round(((x - BOX.left) / (w - BOX.left - BOX.right)) * (points.length - 1)))}
      xAt={xs}
      announce={(i) => `${points[i].title}. ${points[i].rows.map((r) => `${r.label} ${r.value}`).join(", ")}.`}
      tooltip={(i) => <ChartTooltip title={points[i].title} rows={points[i].rows} footer={points[i].footer} />}
    >
      {({ width, active }) => {
        const line = smoothPath(points.map((p, i) => [xs(i, width), y(p.value)]));
        const area = points.length > 1 ? `${line} L${xs(points.length - 1, width).toFixed(1)} ${y(min)} L${xs(0, width).toFixed(1)} ${y(min)} Z` : "";
        // Peak callout: the highest value (latest one on a tie). Hidden while
        // a point is being inspected - the tooltip takes over then.
        const peak = points.reduce((best, p, i) => (p.value >= points[best].value ? i : best), 0);
        const peakLabel = points.length ? format(Math.round(points[peak].value * 10) / 10) : "";
        const pillW = peakLabel.length * 7.2 + 18;
        const pillX = points.length ? Math.min(Math.max(xs(peak, width) - pillW / 2, BOX.left), width - BOX.right - pillW) : 0;
        const slot = points.length > 1 ? (width - BOX.left - BOX.right) / (points.length - 1) : 80;
        const step = Math.max(1, Math.ceil(40 / slot));
        const twoLines = slot >= 50;
        const showDots = points.length <= 14;
        return (
          <>
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.28} />
                <stop offset="0.6" stopColor={color} stopOpacity={0.08} />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <filter id={`${uid}-glow`} x="-5%" y="-30%" width="110%" height="160%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={BOX.left} x2={width - BOX.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} strokeDasharray={t === min ? undefined : "3 4"} />
                <text x={BOX.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ap-faint)">
                  {format(t)}
                </text>
              </g>
            ))}
            {area ? <path d={area} fill={`url(#${uid}-fill)`} /> : null}
            {/* soft glow under the line, then the line itself */}
            <path d={line} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={4} filter={`url(#${uid}-glow)`} transform="translate(0 3)" />
            <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {active !== null ? <line x1={xs(active, width)} x2={xs(active, width)} y1={BOX.top} y2={y(min)} stroke={color} strokeOpacity={0.35} strokeWidth={1} /> : null}
            {points.map((p, i) =>
              showDots || active === i ? <circle key={p.id} cx={xs(i, width)} cy={y(p.value)} r={active === i ? 5 : 3} fill={active === i ? color : "var(--ap-surface)"} stroke={color} strokeWidth={2} /> : null,
            )}
            {points.length && active === null ? (
              <g aria-hidden="true">
                <line x1={xs(peak, width)} x2={xs(peak, width)} y1={y(points[peak].value)} y2={y(min)} stroke={color} strokeOpacity={0.25} strokeDasharray="3 4" />
                <circle cx={xs(peak, width)} cy={y(points[peak].value)} r={9} fill={color} fillOpacity={0.14} />
                <circle cx={xs(peak, width)} cy={y(points[peak].value)} r={4.5} fill="var(--ap-surface)" stroke={color} strokeWidth={2.5} />
                <rect x={pillX} y={Math.max(2, y(points[peak].value) - 30)} width={pillW} height={20} rx={10} fill={color} />
                <text x={pillX + pillW / 2} y={Math.max(2, y(points[peak].value) - 30) + 14} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#fff">
                  {peakLabel}
                </text>
              </g>
            ) : null}
            {points.map((p, i) =>
              i % step === 0 || i === points.length - 1 ? (
                <g key={`x-${p.id}`}>
                  <text x={xs(i, width)} y={height - (twoLines ? 17 : 10)} textAnchor="middle" fontSize={11} fill="var(--ap-muted)">
                    {twoLines ? p.label : p.sub}
                  </text>
                  {twoLines ? (
                    <text x={xs(i, width)} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--ap-faint)">
                      {p.sub}
                    </text>
                  ) : null}
                </g>
              ) : null,
            )}
          </>
        );
      }}
    </ChartPlot>
  );
}

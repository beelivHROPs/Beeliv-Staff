"use client";

import { useId } from "react";
import { ChartPlot, niceMax, type PlotBox } from "./ChartPlot";
import { ChartTooltip, type TooltipRow } from "./ChartTooltip";
import { GRID } from "./colors";

export type StackSegment = { key: string; label: string; value: number; color: string };
export type StackedBarPoint = {
  id: string;
  /** Top axis line, e.g. "Mon". */
  label: string;
  /** Second axis line, e.g. "24 Sep". */
  sub: string;
  /** Tooltip heading, e.g. "Thursday, 24 September". */
  title: string;
  /** Stack order = array order, bottom to top. */
  segments: StackSegment[];
  footer?: TooltipRow;
};

const BOX: PlotBox = { left: 30, right: 4, top: 8, bottom: 34 };

/**
 * Stacked columns per day (attendance composition over time). Hover / touch
 * scrub / arrow keys inspect a day; the tooltip lists every segment. Segment
 * colours arrive with the data (semantic tokens), so this component knows
 * nothing about attendance rules.
 */
export function StackedBarChart({ points, height = 220, summary, hint = "Attendance by day. Use the left and right arrow keys to inspect each day." }: { points: StackedBarPoint[]; height?: number; summary: string; hint?: string }) {
  const uid = useId();
  const totals = points.map((p) => p.segments.reduce((n, s) => n + s.value, 0));
  const { max, ticks } = niceMax(Math.max(0, ...totals));
  const innerW = (w: number) => w - BOX.left - BOX.right;
  const slotOf = (w: number) => innerW(w) / Math.max(1, points.length);
  const plotH = height - BOX.top - BOX.bottom;
  const y = (v: number) => BOX.top + plotH - (v / max) * plotH;

  return (
    <ChartPlot
      height={height}
      count={points.length}
      summary={summary}
      hint={hint}
      indexAt={(x, w) => Math.floor((x - BOX.left) / slotOf(w))}
      xAt={(i, w) => BOX.left + slotOf(w) * (i + 0.5)}
      announce={(i) => `${points[i].title}. ${points[i].segments.map((s) => `${s.label} ${s.value}`).join(", ")}.`}
      tooltip={(i) => <ChartTooltip title={points[i].title} rows={[...points[i].segments].reverse().map((s) => ({ label: s.label, value: s.value, color: s.color }))} footer={points[i].footer} />}
    >
      {({ width, active }) => {
        const slot = slotOf(width);
        const barW = Math.max(6, Math.min(34, slot * 0.58));
        // Thin the x labels so they never collide (needs ~40px each).
        const step = Math.max(1, Math.ceil(40 / slot));
        const twoLines = slot >= 50;
        return (
          <>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={BOX.left} x2={width - BOX.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} strokeDasharray={t === 0 ? undefined : "3 4"} />
                <text x={BOX.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ap-faint)">
                  {t}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = BOX.left + slot * (i + 0.5);
              const x0 = cx - barW / 2;
              let acc = 0;
              const dim = active !== null && active !== i;
              return (
                <g key={p.id} opacity={dim ? 0.45 : 1} style={{ transition: "opacity .15s" }}>
                  <clipPath id={`${uid}-${i}`}>
                    <rect x={x0} y={y(totals[i])} width={barW} height={Math.max(0, y(0) - y(totals[i]))} rx={Math.min(5, barW / 3)} />
                  </clipPath>
                  <g clipPath={`url(#${uid}-${i})`}>
                    {p.segments.map((s) => {
                      const top = y(acc + s.value);
                      const h = y(acc) - top;
                      acc += s.value;
                      // 1px hairline of the card colour separates stacked segments.
                      return h > 0 ? <rect key={s.key} x={x0} y={top} width={barW} height={h} fill={s.color} stroke="var(--ap-surface)" strokeWidth={0.75} /> : null;
                    })}
                  </g>
                  {i % step === 0 || i === points.length - 1 ? (
                    <text x={cx} y={height - (twoLines ? 17 : 10)} textAnchor="middle" fontSize={11} fill="var(--ap-muted)">
                      {twoLines ? p.label : p.sub}
                    </text>
                  ) : null}
                  {twoLines && (i % step === 0 || i === points.length - 1) ? (
                    <text x={cx} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--ap-faint)">
                      {p.sub}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </>
        );
      }}
    </ChartPlot>
  );
}

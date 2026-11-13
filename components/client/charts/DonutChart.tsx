"use client";

import { useRouter } from "next/navigation";
import { TRACK } from "./colors";

export type DonutSegment = { key: string; label: string; value: number; color: string; href?: string };

/**
 * Restrained ring chart: thin ring, small gaps, one meaningful composition.
 * Pure SVG. The segments are a mouse convenience (click drills into the
 * filtered records); the accessible route is the legend beside it
 * (ChartLegend), so segments are aria-hidden and not tab stops.
 * `ariaLabel` should summarise the data in a sentence ("42 of 48 present ...").
 */
export function DonutChart({
  segments,
  size = 168,
  thickness = 18,
  centerValue,
  centerLabel,
  ariaLabel,
  activeKey,
  onActiveChange,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  ariaLabel: string;
  activeKey?: string | null;
  onActiveChange?: (key: string | null) => void;
}) {
  const router = useRouter();
  const total = segments.reduce((n, s) => n + s.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 2.5 : 0;
  // Each arc starts where the previous one ended.
  const arcs = visible.map((s, i) => ({ s, len: (s.value / total) * C, start: visible.slice(0, i).reduce((n, x) => n + (x.value / total) * C, 0) }));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={thickness} />
        {total > 0
          ? arcs.map(({ s, len, start }) => {
              const dash = Math.max(0, len - gap);
              return (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={activeKey === s.key ? thickness + 3 : thickness}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-start}
                  opacity={activeKey && activeKey !== s.key ? 0.45 : 1}
                  className={s.href ? "cursor-pointer" : ""}
                  style={{ transition: "opacity .15s, stroke-width .15s" }}
                  onMouseEnter={() => onActiveChange?.(s.key)}
                  onMouseLeave={() => onActiveChange?.(null)}
                  onClick={s.href ? () => router.push(s.href!) : undefined}
                />
              );
            })
          : null}
      </svg>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
          <b className="text-[27px] font-bold tracking-tight text-(--ap-ink) tabular-nums">{centerValue}</b>
          {centerLabel ? <span className="text-[13px] text-(--ap-muted)">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

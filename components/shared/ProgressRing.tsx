"use client";

import { useEffect, useId, useState } from "react";
import { DASHBOARD_TONE_BASE } from "@/lib/dashboard-accent";

// Irregular wedge-width weights (project-lead reference: Mintora's
// "Monthly Growth" donut — a faceted ring of varying-width segments with
// visible gaps, not a smooth arc or uniform ticks). Still a single-value
// gauge underneath — Mintora's own "+64%" is one number too — so these
// widths are pure decorative texture, not fabricated categories; a
// segment is colored "filled" if its midpoint falls within `value`%.
const WEDGE_WEIGHTS = [0.16, 0.09, 0.19, 0.08, 0.15, 0.2, 0.13];
const GAP_DEGREES = 5;

// Rounded to 4 decimals — full float precision differed by ~1 part in 1e15
// between server and client renders of the same trig call (a real, if
// tiny, SSR hydration mismatch React logged a warning for), and nothing
// visually needs more precision than this anyway.
function round(n: number) {
  return Math.round(n * 10000) / 10000;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const totalGapDegrees = GAP_DEGREES * WEDGE_WEIGHTS.length;
const availableDegrees = 360 - totalGapDegrees;
const wedges = (() => {
  let cursor = 0;
  return WEDGE_WEIGHTS.map((weight) => {
    const width = weight * availableDegrees;
    const start = cursor;
    const end = cursor + width;
    cursor = end + GAP_DEGREES;
    return { start, end, mid: (start + end) / 2 };
  });
})();

/**
 * Circular progress indicator — a faceted ring of irregular-width wedges
 * (see WEDGE_WEIGHTS above). Animates from 0 to `value` once on mount
 * (design-system.md §15: progress animates on first load, ease-out,
 * ~1-1.2s, runs once) — not on every re-render, and not repeatedly.
 */
export function ProgressRing({
  value,
  size = 60,
  label,
  showCenterLabel = false,
  centerLabelClassName = "text-lg font-bold text-foreground",
  tone = "purple",
}: {
  /** 0-100 */
  value: number;
  size?: number;
  label?: React.ReactNode;
  /** Renders a "64%"-style label in the ring's center, counting up in sync
   *  with the wedges filling in. A plain boolean + className (not a render
   *  function) — every caller here is a Server Component, and a function
   *  prop can't cross the Server-to-Client-Component boundary ("Functions
   *  cannot be passed directly to Client Components", a real build error
   *  the dev-server page-loads-fine checks never caught). */
  showCenterLabel?: boolean;
  centerLabelClassName?: string;
  /** Matches the dashboard's own AppShell navTone/HeroStatCard tone, so the
   *  ring's color reads as belonging to that dashboard instead of always
   *  being purple. */
  tone?: "purple" | "gold" | "lavender" | "slate";
}) {
  const gradientId = `progress-ring-${useId().replace(/:/g, "")}`;
  const strokeWidth = Math.max(6, size * 0.15);
  const radius = size / 2 - strokeWidth / 2;
  const cx = size / 2;
  const cy = size / 2;
  const base = DASHBOARD_TONE_BASE[tone];
  const clamped = Math.max(0, Math.min(100, value));
  const targetFraction = clamped / 100;
  const [animatedFraction, setAnimatedFraction] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let raf: number;
    const start = performance.now();
    const duration = prefersReducedMotion ? 0 : 1100;
    function tick(now: number) {
      const elapsed = now - start;
      const t = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedFraction(eased * targetFraction);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetFraction]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            {/* userSpaceOnUse + fixed coordinates spanning the whole ring —
                without this, gradientUnits defaults to objectBoundingBox,
                which stretches the full color range across EACH wedge's
                own tiny bounding box independently. That's what caused the
                "scattered" look ("still doesn't match") — every filled
                wedge cycled through both colors on its own instead of the
                ring showing one continuous sweep. Single-hue light->dark
                of the dashboard's own tone token, matching HeroStatCard's
                gradient exactly (not primary->gold — mixing two different
                hues per-stop desaturates into a muddy color, the same
                lesson already learned on that component). */}
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={size}
              y2={size}
            >
              <stop offset="0%" stopColor={`color-mix(in srgb, ${base} 45%, white 55%)`} />
              <stop offset="100%" stopColor={base} />
            </linearGradient>
          </defs>
          {wedges.map((wedge, i) => {
            const isFilled = wedge.mid / 360 <= animatedFraction;
            return (
              <path
                key={i}
                d={arcPath(cx, cy, radius, wedge.start, wedge.end)}
                fill="none"
                stroke={isFilled ? `url(#${gradientId})` : "var(--border)"}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className="transition-[stroke] duration-200"
              />
            );
          })}
        </svg>
        {showCenterLabel ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={centerLabelClassName}>{Math.round(animatedFraction * 100)}%</span>
          </div>
        ) : null}
      </div>
      {label}
    </div>
  );
}

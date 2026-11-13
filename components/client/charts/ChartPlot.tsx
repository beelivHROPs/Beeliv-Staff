"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

/** Width of an element, kept up to date with ResizeObserver (0 until measured). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure once right away (ResizeObserver only reports changes after this).
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export type PlotBox = { left: number; right: number; top: number; bottom: number };

/** Round a maximum up to a tidy axis maximum (4 ticks). */
export function niceMax(max: number, steps = 4): { max: number; ticks: number[] } {
  const raw = Math.max(1, max);
  const stepRaw = raw / steps;
  const pow = 10 ** Math.floor(Math.log10(stepRaw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= stepRaw) ?? 10) * pow;
  const top = Math.ceil(raw / step) * step;
  return { max: top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

/**
 * Shared frame for the interactive charts (TrendChart, StackedBarChart).
 * It owns the boring, easy-to-get-wrong parts once:
 *  - responsive width (the chart is drawn at its real pixel size, so text is
 *    never stretched);
 *  - pointer scrubbing (mouse + touch; vertical scroll still works) and
 *    keyboard inspection (Left / Right / Home / End, Esc clears);
 *  - one floating tooltip and a polite live region so the inspected point is
 *    announced to screen readers;
 *  - role="img" + an aria-label summary on the drawing itself.
 * Charts only draw; they never compute business values.
 */
export function ChartPlot({
  height,
  count,
  summary,
  hint,
  indexAt,
  xAt,
  announce,
  tooltip,
  children,
}: {
  height: number;
  /** Number of points / bars. */
  count: number;
  /** aria-label of the drawing: what the chart shows, in a sentence. */
  summary: string;
  /** Name of the focusable inspector (keyboard users). */
  hint: string;
  /** Which point sits under an x position. */
  indexAt: (x: number, width: number) => number;
  /** Where a point sits horizontally (tooltip anchor). */
  xAt: (i: number, width: number) => number;
  /** Text announced for the inspected point. */
  announce: (i: number) => string;
  tooltip: (i: number) => ReactNode;
  children: (args: { width: number; active: number | null }) => ReactNode;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActive(clamp(indexAt(e.clientX - rect.left, rect.width)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const cur = active ?? count;
    if (e.key === "ArrowLeft") setActive(clamp(cur - 1));
    else if (e.key === "ArrowRight") setActive(active === null ? count - 1 : clamp(cur + 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(count - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const tipX = active !== null && width ? Math.max(97, Math.min(width - 97, xAt(active, width))) : 0;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="block overflow-visible">
          {children({ width, active })}
        </svg>
      ) : null}
      {/* Inspector: pointer scrubbing + keyboard access. */}
      <div
        role="group"
        tabIndex={0}
        aria-label={hint}
        className="client-chart-focus absolute inset-0 cursor-crosshair touch-pan-y outline-none"
        onPointerMove={fromPointer}
        onPointerDown={fromPointer}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      />
      {active !== null && width ? (
        <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2" style={{ left: tipX }}>
          {tooltip(active)}
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {active !== null ? announce(active) : ""}
      </span>
    </div>
  );
}

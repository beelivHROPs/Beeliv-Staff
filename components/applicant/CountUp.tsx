"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

function motionOff(): boolean {
  return document.documentElement.hasAttribute("data-ap-reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One clock for a percentage and its progress bar: returns `shown`, which
 * counts from 0 up to `value` (ease-out, 700ms) once `ref`'s element is on
 * screen and the page is interactive. Use the same `shown` for the number
 * AND the bar width, so they move exactly together. Later value changes
 * glide from the current number. Reduce motion → jumps straight to `value`.
 *
 * Starts at 0 on the server too (the dashboard's data is client-side), so
 * nothing paints "full" before JavaScript is ready.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(value: number, { duration = 700, delay = 120 } = {}): { ref: RefObject<T | null>; shown: number; done: boolean } {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(0);
  const [inView, setInView] = useState(false);
  const cur = useRef(0); // number currently on screen

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const r = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(r);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const start = cur.current;
    if (start === value) return;
    const off = motionOff(); // Reduce motion: land on the value in one frame
    let raf = 0;
    const t0 = performance.now() + (start === 0 && !off ? delay : 0);
    const tick = (now: number) => {
      const p = off ? 1 : Math.min(1, Math.max(0, (now - t0) / duration));
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic, close to --ap-ease
      const n = start + (value - start) * eased;
      cur.current = n;
      setShown(n);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, delay]);

  return { ref, shown, done: inView && Math.abs(shown - value) < 0.5 };
}

/** Stand-alone counting number (when there's no bar to sync with). */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const { ref, shown } = useCountUp<HTMLSpanElement>(value);
  return (
    <span ref={ref} className="tabular-nums" aria-label={`${value}${suffix}`}>
      <span aria-hidden="true">
        {Math.round(shown)}
        {suffix}
      </span>
    </span>
  );
}

/** Live bar: width follows `shown` each frame (CSS keyframe off); a gloss sweeps once it lands. */
export function LiveBar({ shown, value, done, label, className = "ap-bar" }: { shown: number; value: number; done: boolean; label: string; className?: string }) {
  return (
    <div className={`${className} ap-bar-live ${done ? "is-done" : ""}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, shown))}%` }} />
    </div>
  );
}

/** "Profile completion 80%" + bar, counting and filling together (Overview hero, Profile). */
export function ProgressMeter({ title, value, label }: { title: string; value: number; label: string }) {
  const { ref, shown, done } = useCountUp<HTMLDivElement>(value);
  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between">
        <b className="text-[15px]">{title}</b>
        <span className="text-lg font-bold tracking-[-0.01em] tabular-nums" aria-hidden="true">
          {Math.round(shown)}%
        </span>
      </div>
      <div className="mt-3">
        <LiveBar shown={shown} value={value} done={done} label={label} />
      </div>
    </div>
  );
}

/** Draft row: thin bar + "45% complete", in sync (My Applications). */
export function DraftProgress({ value }: { value: number }) {
  const { ref, shown, done } = useCountUp<HTMLSpanElement>(value);
  return (
    <span ref={ref} className="inline-flex items-center gap-3.5">
      <LiveBar shown={shown} value={value} done={done} label="Application progress" className="block h-1.5 w-30 overflow-hidden rounded-full bg-(--ap-line-2) [&>i]:block [&>i]:h-full [&>i]:bg-(--ap-violet)" />
      <span className="text-[13px] text-(--ap-muted)">
        <span className="tabular-nums">{Math.round(shown)}%</span> complete
      </span>
    </span>
  );
}

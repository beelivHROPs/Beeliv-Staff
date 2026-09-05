"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value up to `target`, ease-out, once
 * per change — same treatment as ProgressRing/ApplicationJourney
 * (design-system.md §15: animate on load/change, ease-out, ~1-1.2s, not
 * repeatedly). Collapses to a single frame under prefers-reduced-motion
 * (duration 0) rather than skipping the rAF loop entirely, so the only
 * state write stays inside the rAF callback — matching the
 * react-hooks/set-state-in-effect rule's "setState from a callback
 * subscribed to an external system" pattern rather than a bare
 * synchronous setState in the effect body.
 */
export function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduceMotion ? 0 : duration;

    const from = fromRef.current ?? 0;
    if (from === target) {
      fromRef.current = target;
      return;
    }

    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress =
        effectiveDuration === 0 ? 1 : Math.min(1, (now - start) / effectiveDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

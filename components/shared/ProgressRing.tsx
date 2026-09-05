"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Circular progress indicator. Animates from 0 to `value` once on mount
 * (design-system.md §15: progress animates on first load, ease-out,
 * ~1-1.2s, runs once) — not on every re-render, and not repeatedly.
 */
export function ProgressRing({
  value,
  size = 60,
  label,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  label?: React.ReactNode;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const gradientId = `progress-ring-${useId().replace(/:/g, "")}`;
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const targetOffset = circumference - (clamped / 100) * circumference;

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start fully "empty" then animate to target on the next frame so the
    // CSS transition actually runs (a same-tick style write wouldn't).
    el.style.transition = "none";
    el.style.strokeDashoffset = String(circumference);
    el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1) 0.1s";
    el.style.strokeDashoffset = String(targetOffset);
  }, [clamped, circumference, targetOffset]);

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="motion-reduce:[&_circle.value]:!transition-none">
        <defs>
          {/* One emphasized element per screen (design-system.md §3 gold-restraint
              rule) — the single hero metric gets the brand's purple→gold duality,
              everything else stays solid var(--primary). */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={5}
        />
        <circle
          ref={circleRef}
          className="value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label}
    </div>
  );
}

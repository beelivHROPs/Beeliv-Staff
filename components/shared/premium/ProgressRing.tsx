"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TONE_ARC, type Tone } from "./tones";

/**
 * SVG arc with anything in the centre. `value` is 0 to 1.
 * `label` is REQUIRED for meaning: it becomes role="img" aria-label (e.g. "3 of 6 steps").
 * The arc fills once on mount; no motion under prefers-reduced-motion.
 */
export function PremiumRing({ value, size = 56, stroke = 5, tone = "lavender", arc, track = "var(--ap-tint-2,#ecdff4)", label, children }: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  /** Overrides the tone's arc colour (any CSS colour). */
  arc?: string;
  track?: string;
  label: string;
  children?: ReactNode;
}) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {v > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={arc ?? TONE_ARC[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={shown ? c * (1 - v) : c}
            className="transition-[stroke-dashoffset] duration-[900ms] ease-out motion-reduce:transition-none"
          />
        ) : null}
      </svg>
      <span className="relative flex items-center justify-center text-[length:inherit]" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}

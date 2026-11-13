"use client";

import { useId, useRef, useState } from "react";

/**
 * Star rating for scorecards (project lead, 2026-10-24): filled gold stars, outline empty stars, instead of numbers in circles.
 *
 *  - `scale` is the number of rating steps the data uses (1..scale). Up to 5 it shows one star per step. Above 5 it shows
 *    5 stars with HALF steps (a 10-point scale = 5 stars in half steps; other scales are mapped to the nearest half step,
 *    so keep `scale` 10 for that mode). The stored value is always the data scale (never a fraction).
 *  - Radio-group semantics: one tab stop, arrow keys move by one step, Home/End jump, Escape or the Clear button clears
 *    (when `allowClear`). Each step is announced as "3 out of 5".
 *  - Hover / press previews the rating before it is set. `readOnly` renders the same stars with no controls.
 *  - Touch targets: every star is 44px square (half steps are 22px wide halves of that star, full height).
 *  - Themed with the --ap-* variables so Admin, Client and Staff dark modes stay legible; gold falls back to #d4a72c.
 */
const STAR = "M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z";

function Star({ fill }: { fill: 0 | 0.5 | 1 }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none size-[30px]" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={fill === 0.5 ? 12 : 24} height="24" />
        </clipPath>
      </defs>
      <path d={STAR} fill="none" stroke="var(--ap-muted, #686672)" strokeOpacity={fill === 1 ? 0 : 0.75} strokeWidth="1.6" strokeLinejoin="round" />
      {fill > 0 ? <path d={STAR} clipPath={`url(#${id})`} fill="var(--star-on, #d4a72c)" stroke="var(--star-on, #d4a72c)" strokeWidth="1.2" strokeLinejoin="round" /> : null}
    </svg>
  );
}

export function StarRating({
  value,
  onChange,
  scale = 5,
  label,
  readOnly = false,
  allowClear = true,
  showValue = true,
  className = "",
}: {
  value: number | null | undefined;
  onChange?: (next: number | null) => void;
  scale?: number;
  label: string;
  readOnly?: boolean;
  allowClear?: boolean;
  showValue?: boolean;
  className?: string;
}) {
  const half = scale > 5;
  const stars = half ? 5 : scale;
  const per = scale / stars; // data steps per star (1, or 2 for a 10-point scale)
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = value ?? 0;
  const shown = hover ?? current;
  const steps = Array.from({ length: scale }, (_, k) => k + 1);
  // How much of star `s` (1-based) is filled for a data value `v`.
  const fillOf = (s: number, v: number): 0 | 0.5 | 1 => {
    const starsFilled = v / per;
    if (starsFilled >= s) return 1;
    if (half && starsFilled >= s - 0.5) return 0.5;
    return 0;
  };
  const focusStep = (n: number) => {
    const next = Math.min(scale, Math.max(1, n));
    onChange?.(next);
    refs.current[Math.ceil(next / per) - 1]?.focus();
  };
  const text = value ? `${value} of ${scale}` : "Not rated";

  if (readOnly) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} role="img" aria-label={`${label}: ${value ? `${value} out of ${scale}` : "not rated"}`}>
        <span className="inline-flex" aria-hidden="true">
          {Array.from({ length: stars }, (_, i) => (
            <span key={i} className="inline-flex size-7 items-center justify-center">
              <Star fill={fillOf(i + 1, current)} />
            </span>
          ))}
        </span>
        {showValue ? <span className="text-[14px] font-semibold text-(--ap-ink-2) tabular-nums">{text}</span> : null}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-x-1.5 min-[768px]:gap-x-2 ${className}`}>
      <div role="radiogroup" aria-label={label} className="inline-flex" onPointerLeave={() => setHover(null)}>
        {Array.from({ length: stars }, (_, i) => {
          const s = i + 1;
          return (
            <span key={s} className="relative inline-flex size-10 items-center justify-center min-[768px]:size-11">
              <Star fill={fillOf(s, shown)} />
              {[s * per].map((n) => {
                const step = Math.round(n);
                // Half mode: one 40px+ target per star. First tap = full star; tap the same star again = half star.
                const on = half ? value === step || value === step - 1 : value === step;
                return (
                  <button
                    key={step}
                    ref={(el) => {
                      refs.current[s - 1] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${value && on ? value : step} out of ${scale}`}
                    aria-description={half ? "Tap again for a half star" : undefined}
                    tabIndex={on || (!value && step === per) || (!value && !half && step === 1) ? 0 : -1}
                    onPointerEnter={() => setHover(step)}
                    onPointerDown={() => setHover(step)}
                    onFocus={() => setHover(null)}
                    onClick={() => onChange?.(half && value === step ? step - 1 : step)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                        e.preventDefault();
                        focusStep((value ?? 0) + 1);
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                        e.preventDefault();
                        focusStep((value ?? 2) - 1);
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        focusStep(1);
                      } else if (e.key === "End") {
                        e.preventDefault();
                        focusStep(scale);
                      } else if (e.key === "Escape" && allowClear && value) {
                        onChange?.(null);
                      }
                    }}
                    className={`absolute inset-y-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--ap-violet) inset-x-0`}
                  />
                );
              })}
            </span>
          );
        })}
      </div>
      {showValue ? (
        <span className="min-w-[3.4rem] text-[14px] font-semibold text-(--ap-ink-2) tabular-nums" aria-live="polite">
          {hover ? `${hover} of ${scale}` : text}
        </span>
      ) : null}
      {allowClear && value ? (
        <button type="button" onClick={() => onChange?.(null)} className="ap-hit inline-flex min-h-11 items-center rounded-full px-1.5 text-[13px] font-semibold text-(--ap-muted) hover:text-(--ap-ink) focus-visible:outline-2 focus-visible:outline-(--ap-violet)">
          Clear
        </button>
      ) : null}
    </div>
  );
}

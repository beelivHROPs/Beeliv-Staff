"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * Segmented two-to-four option switch (Active / Past, Week / Month). Controlled.
 * Radio-group semantics with arrow keys; 48px high targets. The selected pill uses the
 * app's violet fill. Use for switching a LIST between views, never for navigation.
 */
export function PillToggle<T extends string>({ options, value, onChange, label, className = "" }: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  /** Accessible name of the group, e.g. "Applications view". */
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  }
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex w-full rounded-full bg-(--ap-tint,#f6effa) p-1 ${className}`}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`min-h-12 flex-1 rounded-full px-4 text-[15px] font-bold transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-(--ap-violet,#5b087b) focus-visible:ring-offset-1 focus-visible:outline-none ${on ? "bg-(--ap-violet,#5b087b) text-white shadow-[0_6px_14px_-8px_rgba(0,0,0,.5)]" : "text-(--ap-ink-2,#3a3845) hover:text-(--ap-violet,#5b087b)"}`}
          >
            {o.label}
            {o.count !== undefined ? <span className={`ml-1.5 font-semibold ${on ? "text-white/80" : "text-(--ap-muted,#686672)"}`}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

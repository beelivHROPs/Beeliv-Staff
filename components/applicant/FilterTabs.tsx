"use client";

/**
 * Responsive filter control: the wireframe's pill tabs (.tabs) from 768px up,
 * and a single dropdown on phones so the options never wrap or scroll sideways.
 * Used for every "All / Active / Draft…" style filter in the dashboard.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "@/components/applicant/icons";
import { motion } from "motion/react";
import { SPRING } from "./motion";

export type FilterOption<K extends string> = { key: K; label: string; count?: number; icon?: ReactNode };

export function FilterTabs<K extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** Accessible name, e.g. "Filter applications". */
  label: string;
  options: FilterOption<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  const current = options.find((o) => o.key === value) ?? options[0];
  const pillId = useId();
  return (
    <div className={className}>
      {/* Tablet / desktop: pill tabs */}
      <div
        role="tablist"
        aria-label={label}
        className="ap-scrollbar-none hidden w-max max-w-full gap-1 overflow-x-auto rounded-xl border border-(--ap-line) bg-white/70 p-1 min-[768px]:flex"
      >
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(o.key)}
              className={`relative inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-bold whitespace-nowrap transition-colors duration-200 ${
                on ? "text-white" : "text-(--ap-muted) hover:text-(--ap-ink)"
              }`}
            >
              {/* The violet pill slides between tabs (Motion shared layout). */}
              {on ? <motion.span layoutId={`pill-${pillId}`} transition={SPRING} className="absolute inset-0 rounded-[9px] bg-(--ap-violet)" aria-hidden="true" /> : null}
              <span className="relative inline-flex items-center gap-1.5">
                {o.icon}
                {o.label}
                {o.count !== undefined ? <Count n={o.count} on={on} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Phones: dropdown */}
      <div className="min-[768px]:hidden">
        <FilterDropdown label={label} options={options} current={current} onChange={onChange} />
      </div>
    </div>
  );
}

function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      className={`inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-[5px] text-[13px] tabular-nums ${
        on ? "bg-white/22 text-white" : "bg-(--ap-line-2) text-(--ap-ink-2)"
      }`}
    >
      {n}
    </span>
  );
}

export function FilterDropdown<K extends string>({
  label,
  options,
  current,
  onChange,
  prefix = "Showing",
}: {
  label: string;
  /** Muted word before the selection, e.g. "Showing" or "Jump to". */
  prefix?: string;
  options: FilterOption<K>[];
  current: FilterOption<K>;
  onChange: (key: K) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full items-center gap-2.5 rounded-xl border bg-white px-4 text-left text-[15px] shadow-[0_1px_2px_rgba(37,0,68,.04)] transition-colors ${
          open ? "border-(--ap-violet) ring-3 ring-[rgba(138,10,163,.12)]" : "border-(--ap-line)"
        }`}
      >
        <span className="shrink-0 text-(--ap-muted)">{prefix}</span>
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 font-bold text-(--ap-ink)">
          {current.icon}
          <span className="truncate">{current.label}</span>
          {current.count !== undefined ? <Count n={current.count} on={false} /> : null}
        </span>
        <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="ap-pop-in absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-2xl border border-(--ap-line) bg-white p-1.5 shadow-[0_18px_40px_rgba(37,0,68,.14)]"
        >
          {options.map((o) => {
            const on = o.key === current.key;
            return (
              <li key={o.key} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  className={`flex h-12 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[15px] ${
                    on ? "bg-(--ap-tint) font-bold text-(--ap-violet)" : "font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)"
                  }`}
                >
                  {o.icon}
                  <span className="flex-1">{o.label}</span>
                  {o.count !== undefined ? <Count n={o.count} on={false} /> : null}
                  <Check className={`size-4 ${on ? "opacity-100" : "opacity-0"}`} strokeWidth={2.2} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

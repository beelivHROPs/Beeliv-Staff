"use client";

/**
 * Our own dropdown, used everywhere the dashboard would otherwise show the
 * browser's native <select> (which looks different on every phone/OS).
 * Keyboard: ↑/↓ move, Enter/Space pick, Home/End jump, Esc closes, typing a
 * letter jumps to the first matching option.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "@/components/applicant/icons";

export type SelectOption = string | { value: string; label: string };

const val = (o: SelectOption) => (typeof o === "string" ? o : o.value);
const lab = (o: SelectOption) => (typeof o === "string" ? o : o.label);

const VARIANT = {
  /** Same box as .ap-input form fields. */
  input: "ap-input flex items-center gap-2.5 text-left",
  /** No border — sits inside another bordered box (e.g. the jobs search bar). */
  bare: "flex h-full w-full items-center gap-2 bg-transparent text-left text-base text-(--ap-ink) outline-none",
  /** Small toolbar control (sort, prototype toggle on light backgrounds). */
  compact:
    "flex h-10 items-center gap-2 rounded-xl border border-[#d8cdb6] bg-transparent pr-2.5 pl-3 text-[14px] font-semibold text-(--ap-ink) outline-none focus-visible:border-(--ap-violet)",
  /** Small control on the dark sidebar. */
  dark: "flex h-8 items-center gap-1.5 rounded-lg bg-[#2a2833] pr-2 pl-2.5 text-[13px] font-semibold text-white outline-none",
} as const;

export function SelectMenu({
  id,
  value,
  options,
  onChange,
  placeholder = "Select",
  variant = "input",
  icon,
  label,
  placement = "bottom",
  align = "left",
  className = "",
  menuClassName = "",
  invalid = false,
  describedBy,
}: {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: keyof typeof VARIANT;
  /** Leading icon inside the button. */
  icon?: ReactNode;
  /** Accessible name when there is no visible <label htmlFor>. */
  label?: string;
  /** "top" opens upwards (for controls near the bottom of the screen). */
  placement?: "bottom" | "top";
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
  /** Marks the trigger aria-invalid (see form-feedback.tsx). */
  invalid?: boolean;
  describedBy?: string;
}) {
  // Keep an unknown saved value selectable instead of silently dropping it.
  const opts = value && !options.some((o) => val(o) === value) ? [value, ...options] : options;
  const current = opts.find((o) => val(o) === value);

  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the highlighted option visible in long lists (e.g. 37 states).
  useEffect(() => {
    if (open) list.current?.children[hi]?.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  function show() {
    setHi(Math.max(0, opts.findIndex((o) => val(o) === value)));
    // Open upwards when there is no room below (e.g. a field near the bottom of the screen).
    const r = wrap.current?.getBoundingClientRect();
    const need = Math.min(300, opts.length * 44 + 16);
    setUp(placement === "top" || (!!r && window.innerHeight - r.bottom < need && r.top > need));
    setOpen(true);
  }
  function pick(i: number) {
    onChange(val(opts[i]));
    setOpen(false);
    btn.current?.focus();
  }
  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(opts.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHi(opts.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(hi);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const i = opts.findIndex((o) => lab(o).toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setHi(i);
    }
  }

  const dark = variant === "dark";

  return (
    <div ref={wrap} className={`relative ${variant === "bare" ? "h-full w-full" : ""}`}>
      <button
        ref={btn}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        aria-activedescendant={open ? `${listId}-${hi}` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`${VARIANT[variant]} ${open && variant === "input" ? "border-(--ap-violet)! shadow-[0_0_0_3px_rgba(138,10,163,.14)]" : ""} ${className}`}
      >
        {icon}
        <span className={`min-w-0 flex-1 truncate ${current ? "" : dark ? "text-white/60" : "text-(--ap-muted)"}`}>{current ? lab(current) : placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${dark ? "text-white/70" : "text-(--ap-muted)"}`} aria-hidden="true" />
      </button>

      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label}
          className={`ap-pop-in ${up ? "ap-pop-up" : ""} absolute z-50 max-h-72 w-max max-w-[calc(100vw-32px)] min-w-full overflow-y-auto overscroll-contain rounded-2xl border border-(--ap-line) bg-white p-1.5 shadow-[0_18px_40px_rgba(37,0,68,.14)] ${
            up ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          } ${align === "right" ? "right-0" : "left-0"} ${menuClassName}`}
        >
          {opts.map((o, i) => {
            const on = val(o) === value;
            return (
              <li
                key={val(o)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={on}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-[15px] ${
                  i === hi ? "bg-(--ap-tint)" : ""
                } ${on ? "font-bold text-(--ap-violet)" : "font-semibold text-(--ap-ink-2)"}`}
              >
                <span className="flex-1">{lab(o)}</span>
                <Check className={`size-4 shrink-0 ${on ? "opacity-100" : "opacity-0"}`} strokeWidth={2.2} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

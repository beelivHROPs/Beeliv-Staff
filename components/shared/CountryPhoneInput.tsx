"use client";

/**
 * Shared country-code phone input (project lead, 2026-10-19: "for the mobile number, we
 * should start using the country codes dropdown"). ONE control, used wherever a phone /
 * mobile / WhatsApp number is collected.
 *
 *   [ NG +234 v ] [ 0801 234 5678          ]
 *
 *  - Left: a country button (ISO2 tag + dial code, no flag emoji: Windows does not render
 *    them) that opens a searchable list. Desktop = popover; phones = swipe-to-close bottom
 *    sheet. Search by country name, dial code or ISO2. Keyboard: arrows, Enter, Esc.
 *  - Right: the number. Digits only (anything else is stripped on type and paste), grouped as
 *    you type. Pasting a full "+233 20 123 4567" switches the country by itself.
 *  - Value API stays ONE string: canonical "+<dialcode><national digits>" (e.g.
 *    "+2348012345678"), with no spaces and no trunk 0. While a number is incomplete the value is
 *    still the digits typed so far; use isValidPhone() (lib/phone/phone.ts) to decide whether it
 *    can be saved. An older stored value ("+234 801 234 5678", "0801...") is read and shown correctly.
 *  - The server remains the authority: it validates, canonicalises and enforces uniqueness
 *    (docs/contracts/account-uniqueness.md). This control is a convenience only.
 *
 * Two looks, same behaviour: "app" (Applicant / Staff / Client / Admin, --ap-* tokens, so the
 * dark themes follow) and "public" (marketing-site forms, --soft-border / --beeliv-purple).
 */
import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Search, X } from "@/components/applicant/icons";
import { SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";
import { COUNTRY_GROUPS, DEFAULT_ISO, getCountry, matchesCountry, type Country } from "@/lib/phone/countries";
import { checkPhone, displayRaw, formatPhone, normalizeInput, parsePhone, phoneHint, toCanonical } from "@/lib/phone/phone";

export type CountryPhoneInputProps = {
  /** Goes on the number box, so a <label htmlFor={id}> works. The country button is `${id}-country`. */
  id: string;
  value: string;
  onChange: (v: string) => void;
  /** The parent says this number is not acceptable (e.g. Save was pressed with a half-typed number). */
  invalid?: boolean;
  disabled?: boolean;
  /** ISO2 of the country shown first when the value is empty. Default "NG". */
  defaultCountry?: string;
  describedBy?: string;
  autoComplete?: string;
  variant?: "app" | "public";
  /** No helper / error line under the field (the parent form shows its own message). */
  quiet?: boolean;
  /** "lg" = the taller 54px frame of the sign-up / invitation screens (public variant). */
  size?: "md" | "lg";
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
  placeholder?: string;
  /** Accessible name for the number box when there is no <label htmlFor>. */
  ariaLabel?: string;
};

type St = { iso: string; raw: string };

/* ------------------------------------------------------------------ look */

const LOOK = {
  app: {
    frame: (bad: boolean) =>
      `flex h-12 [.ax-root_&]:h-[52px] overflow-hidden rounded-xl border ${
        bad ? "border-(--ap-rose) bg-[var(--ax-err-bg,var(--ap-surface,#fff))]" : "border-(--ap-line) bg-[var(--ax-fill,var(--ap-surface,#fff))] [.ax-root_&]:border-transparent"
      } focus-within:border-(--ap-violet) focus-within:shadow-[0_0_0_3px_rgba(138,10,163,.14)] [.ax-root_&]:focus-within:shadow-none`,
    trigger: "border-r border-(--ap-line) bg-[#fbfafc] [.ax-root_&]:border-transparent [.ax-root_&]:bg-transparent text-(--ap-ink-2) hover:bg-(--ap-tint-soft,#fbf8fd)",
    flagRing: "ring-black/15 [html[data-client-theme=dark]_&]:ring-white/25 [html[data-admin-theme=dark]_&]:ring-white/25",
    input: "text-(--ap-ink) placeholder:text-(--ap-faint)",
    chevron: "text-(--ap-muted)",
    panel: "border border-(--ap-line) bg-(--ap-surface,#fff) text-(--ap-ink) shadow-[0_18px_40px_rgba(37,0,68,.16)]",
    search: "border border-(--ap-line) bg-(--ap-surface,#fff) text-(--ap-ink) placeholder:text-(--ap-faint) focus:border-(--ap-violet)",
    groupLabel: "text-(--ap-muted)",
    row: "text-(--ap-ink)",
    rowActive: "bg-(--ap-tint)",
    rowDial: "text-(--ap-muted)",
    check: "text-(--ap-violet)",
    empty: "text-(--ap-muted)",
    focus: "focus-visible:outline-(--ap-violet)",
  },
  public: {
    frame: (bad: boolean, lg = false) =>
      `flex overflow-hidden bg-white ${lg ? "h-[54px] rounded-[14px] border-[1.5px]" : "h-[52px] rounded-[12px] border"} ${
        bad ? "border-(--au-error,#b42318) focus-within:shadow-[0_0_0_3px_rgba(180,35,24,.16)]" : "border-(--soft-border,#e4e0ea) focus-within:border-(--beeliv-purple) focus-within:shadow-[0_0_0_3px_rgba(91,8,123,.14)]"
      }`,
    trigger: "border-r border-(--soft-border,#e4e0ea) bg-[#faf9fb] text-(--ink,#11111b) hover:bg-[#f4f1f7]",
    flagRing: "ring-black/15",
    input: "text-(--ink,#11111b) placeholder:text-[#757575]",
    chevron: "text-[#686672]",
    panel: "border border-(--soft-border,#e4e0ea) bg-white text-(--ink,#11111b) shadow-[0_18px_40px_rgba(37,0,68,.16)]",
    search: "border border-(--soft-border,#e4e0ea) bg-white text-(--ink,#11111b) placeholder:text-[#757575] focus:border-(--beeliv-purple)",
    groupLabel: "text-[#686672]",
    row: "text-(--ink,#11111b)",
    rowActive: "bg-[#f6effa]",
    rowDial: "text-[#686672]",
    check: "text-(--beeliv-purple)",
    empty: "text-[#686672]",
    focus: "focus-visible:outline-(--beeliv-purple)",
  },
} as const;

/** Public pages have no --ap-* tokens; the shared SwipeSheet handle reads --ap-line. */
const PUBLIC_SHEET_VARS = { "--ap-line": "#e4e0ea" } as React.CSSProperties;

/* ----------------------------------------------------------- the control */

export function CountryPhoneInput({
  id,
  value,
  onChange,
  invalid = false,
  disabled = false,
  defaultCountry = DEFAULT_ISO,
  describedBy,
  autoComplete = "tel-national",
  variant = "app",
  quiet = false,
  size = "md",
  inputRef,
  onBlur,
  placeholder,
  ariaLabel,
}: CountryPhoneInputProps) {
  const look = LOOK[variant];
  const hintId = `${id}-hint`;
  const [st, setSt] = useState<St>(() => {
    const p = parsePhone(value, defaultCountry);
    return { iso: p.country.iso, raw: p.unknownCode ? `+${p.national}` : p.national };
  });
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);

  const country = getCountry(st.iso);
  const own = toCanonical(country, st.raw);

  // The parent changed the value from outside (a form reset, saved data arriving): read it again.
  if (value !== own) {
    const p = parsePhone(value, st.iso);
    if (!p.unknownCode && toCanonical(p.country, p.national) !== own) setSt({ iso: p.country.iso, raw: p.national });
  }

  const shown = displayRaw(country, st.raw);

  // Keep the caret after the same digit when the box re-groups the number as you type.
  useLayoutEffect(() => {
    const el = input.current;
    const want = caret.current;
    caret.current = null;
    if (!el || want === null || document.activeElement !== el) return;
    let seen = 0;
    let pos = 0;
    while (pos < shown.length && seen < want) {
      if (/\d/.test(shown[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  }, [shown]);

  const emit = useCallback(
    (next: St) => {
      const v = toCanonical(getCountry(next.iso), next.raw);
      if (v !== value) onChange(v);
    },
    [onChange, value],
  );

  function apply(next: St, keepCaretDigits: number | null) {
    caret.current = next.iso === st.iso ? keepCaretDigits : null;
    setSt(next);
    emit(next);
  }

  function onType(text: string, caretPos: number | null) {
    const digitsBefore = caretPos === null ? null : text.slice(0, caretPos).replace(/\D/g, "").length;
    apply(normalizeInput(text, st.iso), digitsBefore);
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const t = text.trim();
    // A full international number replaces the field and picks its country.
    if (t.startsWith("+") || (t.startsWith("00") && t.replace(/\D/g, "").length > 6)) {
      e.preventDefault();
      apply(normalizeInput(t, st.iso), null);
    }
  }

  function pick(c: Country) {
    setOpen(false);
    const raw = st.raw.startsWith("+") ? "" : normalizeInput(st.raw, c.iso).raw;
    apply({ iso: c.iso, raw }, null);
    requestAnimationFrame(() => input.current?.focus());
  }

  // ---- status shown to the person
  const digits = st.raw.replace(/\D/g, "");
  const check = st.raw.startsWith("+") ? null : checkPhone(own, st.iso);
  const status = check?.status ?? (digits ? "partial" : "empty");
  const bad = invalid || status === "invalid" || (status === "partial" && touched);
  const message = check?.error ?? (st.raw.startsWith("+") ? "Pick the country from the list, then type the number." : phoneHint(country));
  const nat = digits.replace(/^0+/, "").length;
  const remaining = country.min === country.max && nat > 0 ? country.min - nat : 0;
  const hintText =
    status === "valid" && !bad
      ? `Saved as ${formatPhone(own, st.iso)}`
      : bad
        ? message
        : remaining > 0
          ? `${remaining} more digit${remaining === 1 ? "" : "s"}`
          : `Example: ${country.example}`;
  const hintTone = status === "valid" && !bad ? "text-(--ap-ok)" : bad ? "ap-shake font-semibold text-(--ap-rose)" : "text-(--ap-muted)";

  useImperativeHandle(inputRef, () => input.current as HTMLInputElement, []);

  return (
    <div className="min-w-0">
      <div className="relative">
        <div ref={frameRef} data-phone-value={own} className={`${look.frame(bad, size === "lg")} ${disabled ? "opacity-60" : ""}`}>
          <button
            ref={trigger}
            id={`${id}-country`}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${country.name}, +${country.dial}. Change country code`}
            onClick={() => setOpen((o) => !o)}
            className={`flex shrink-0 items-center gap-1.5 px-3 text-[15px] font-bold outline-offset-[-2px] focus-visible:outline-2 ${look.trigger} ${look.focus}`}
          >
            <Flag key={country.iso} iso={country.iso} look={look} />
            <span className="tabular-nums">+{country.dial}</span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${look.chevron}`} aria-hidden="true" />
          </button>
          <input
            ref={input}
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            disabled={disabled}
            placeholder={placeholder ?? country.example}
            aria-label={ariaLabel}
            aria-describedby={[describedBy, quiet ? null : hintId].filter(Boolean).join(" ") || undefined}
            aria-invalid={bad ? true : undefined}
            className={`min-w-0 flex-1 bg-transparent px-3 text-[15px] tracking-[.02em] tabular-nums outline-none ${look.input}`}
            value={shown}
            onChange={(e) => onType(e.target.value, e.target.selectionStart)}
            onPaste={onPaste}
            onBlur={() => {
              setTouched(true);
              onBlur?.();
            }}
          />
        </div>
        {open ? <CountryList variant={variant} selectedIso={st.iso} anchor={trigger} frame={frameRef} onPick={pick} onClose={() => (setOpen(false), trigger.current?.focus())} /> : null}
      </div>
      {variant === "app" && !quiet ? (
        <p id={hintId} aria-live="polite" className={`mt-1.5 flex items-center gap-1.5 text-[13px] ${hintTone}`}>
          {status === "valid" && !bad ? <Check className="ap-bump size-3.5" strokeWidth={2.2} aria-hidden="true" /> : null}
          {hintText}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ flag */

/** Self-hosted SVG flag (public/flags, flag-icons 7.2.3, MIT; see docs/THIRD-PARTY-NOTICES.md). No emoji: Windows does not draw them. */
function Flag({ iso, look }: { iso: string; look: (typeof LOOK)["app"] | (typeof LOOK)["public"] }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className={`relative flex h-[18px] w-6 shrink-0 items-center justify-center overflow-hidden rounded-[4px] ring-1 ring-inset ${look.flagRing}`} aria-hidden="true">
      {missing ? (
        <svg viewBox="0 0 24 24" className={`size-3.5 ${look.chevron}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/flags/${iso.toLowerCase()}.svg`} alt="" width={24} height={18} loading="lazy" decoding="async" className="h-[18px] w-6 object-cover" onError={() => setMissing(true)} />
      )}
    </span>
  );
}

/* --------------------------------------------------------- country list */

function CountryList({
  variant,
  selectedIso,
  anchor,
  frame,
  onPick,
  onClose,
}: {
  variant: "app" | "public";
  selectedIso: string;
  anchor: React.RefObject<HTMLButtonElement | null>;
  frame: React.RefObject<HTMLDivElement | null>;
  onPick: (c: Country) => void;
  onClose: () => void;
}) {
  const look = LOOK[variant];
  const isPhone = useIsPhone();
  const isClient = useIsClient();
  const listId = useId();
  const [q, setQ] = useState("");
  const searching = q.trim() !== "";
  const flat = COUNTRY_GROUPS.flatMap((g) => g.countries).filter((c) => matchesCountry(c, q));
  const [active, setActive] = useState(() => Math.max(0, COUNTRY_GROUPS.flatMap((g) => g.countries).findIndex((c) => c.iso === selectedIso)));
  const activeIso = flat[Math.min(active, flat.length - 1)]?.iso;
  const panel = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  // Desktop: the search box takes focus when the list opens (on phones it would pop the keyboard).
  useEffect(() => {
    if (!isPhone && pos) searchRef.current?.focus({ preventScroll: true });
  }, [isPhone, pos]);

  // Desktop: place the popover under (or above) the field, inside the screen.
  useLayoutEffect(() => {
    if (isPhone) return;
    const place = () => {
      const f = frame.current;
      if (!f) return;
      const r = f.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const width = Math.min(Math.max(r.width, 340), vw - 24);
      const left = Math.max(12, Math.min(r.left, vw - 12 - width));
      const below = vh - r.bottom - 14;
      const above = r.top - 14;
      const up = below < 300 && above > below;
      setPos(up ? { left, width, bottom: vh - r.top + 6, maxH: Math.min(380, above) } : { left, width, top: r.bottom + 6, maxH: Math.min(380, below) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isPhone, frame]);

  // Outside click and Esc (desktop popover; the phone sheet has its own backdrop and close button).
  useEffect(() => {
    if (isPhone) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    const onEsc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isPhone, anchor, onClose]);

  useEffect(() => {
    if (!isPhone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isPhone]);

  // Keep the active row in view while using the arrow keys.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIso, pos]);

  function onKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(Math.min(a, flat.length - 1) + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(Math.min(a, flat.length - 1) - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = flat[Math.min(active, flat.length - 1)];
      if (c) onPick(c);
    }
  }

  const body = (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-60" aria-hidden="true" />
        <input
          type="search"
          ref={searchRef}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Search country or code"
          aria-label="Search countries"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeIso ? `${listId}-${activeIso}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          className={`h-11 w-full rounded-xl pr-3 pl-9 text-[15px] outline-none ${look.search}`}
        />
      </div>
      <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className={`mt-2 overflow-y-auto overscroll-contain ${isPhone ? "max-h-[52dvh]" : ""}`} style={!isPhone && pos ? { maxHeight: Math.max(160, pos.maxH - 70) } : undefined}>
        {flat.length === 0 ? (
          <li role="presentation" className={`px-3 py-6 text-center text-[14px] ${look.empty}`}>
            No country found. Try its name or code.
          </li>
        ) : searching ? (
          flat.map((c) => <Row key={c.iso} c={c} look={look} listId={listId} selected={c.iso === selectedIso} active={c.iso === activeIso} onPick={onPick} onHover={() => setActive(flat.indexOf(c))} />)
        ) : (
          COUNTRY_GROUPS.map((g) => (
            <li key={g.id} role="presentation">
              {g.label ? <p className={`px-3 pt-3 pb-1 text-[11px] font-bold tracking-[.08em] uppercase ${look.groupLabel}`}>{g.label}</p> : null}
              <ul role="presentation" className="m-0 list-none p-0">
                {g.countries.map((c) => (
                  <Row key={c.iso} c={c} look={look} listId={listId} selected={c.iso === selectedIso} active={c.iso === activeIso} onPick={onPick} onHover={() => setActive(flat.indexOf(c))} />
                ))}
              </ul>
            </li>
          ))
        )}
      </ul>
    </>
  );

  if (!isClient) return null;

  // The theme wrapper hands the app's colour tokens (incl. dark mode) to content portalled to <body>.
  const themed = (children: React.ReactNode) => (variant === "app" ? <div className="applicant-shell" style={{ display: "contents" }}>{children}</div> : <>{children}</>);

  if (isPhone) {
    return createPortal(
      themed(
        <AnimatePresence>
          <motion.div
            key="country-sheet"
            className="fixed inset-0 z-[150] flex items-end"
            style={{ background: "rgba(17,17,27,.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) onClose();
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <SwipeSheet
              role="dialog"
              aria-modal="true"
              aria-label="Choose a country code"
              onClose={onClose}
              className="px-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
              header={
                <div className="mt-3 mb-3 flex items-center justify-between gap-3">
                  <b className="text-[18px] font-bold text-(--ap-ink,#11111b)">Country code</b>
                  <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-(--ap-line-2,#f3f0f6) text-(--ap-ink-2,#3a3845)">
                    <X className="size-[18px]" aria-hidden="true" />
                  </button>
                </div>
              }
            >
              <div style={variant === "public" ? PUBLIC_SHEET_VARS : undefined} className={look.row}>
                {body}
              </div>
            </SwipeSheet>
          </motion.div>
        </AnimatePresence>,
      ),
      document.body,
    );
  }

  return createPortal(
    themed(
      <div
        ref={panel}
        role="dialog"
        aria-label="Choose a country code"
        onKeyDown={onKey}
        style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom } : { visibility: "hidden" }}
        className={`ap-pop-in fixed z-[150] rounded-2xl p-2.5 ${look.panel}`}
      >
        {body}
      </div>,
    ),
    document.body,
  );
}

function Row({
  c,
  look,
  listId,
  selected,
  active,
  onPick,
  onHover,
}: {
  c: Country;
  look: (typeof LOOK)["app"] | (typeof LOOK)["public"];
  listId: string;
  selected: boolean;
  active: boolean;
  onPick: (c: Country) => void;
  onHover: () => void;
}) {
  return (
    <li
      id={`${listId}-${c.iso}`}
      role="option"
      aria-selected={selected}
      data-active={active || undefined}
      onClick={() => onPick(c)}
      onMouseMove={onHover}
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[15px] ${look.row} ${active ? look.rowActive : ""}`}
    >
      <Flag iso={c.iso} look={look} />
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      <span className={`shrink-0 text-[14px] tabular-nums ${look.rowDial}`}>+{c.dial}</span>
      <span className="w-4 shrink-0">{selected ? <Check className={`size-4 ${look.check}`} strokeWidth={2.4} aria-label="Selected" /> : null}</span>
    </li>
  );
}

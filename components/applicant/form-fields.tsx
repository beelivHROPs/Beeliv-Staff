"use client";

/**
 * Brand-matched form controls shared by Apply and Profile:
 *  - PhoneInput   — country-code dropdown + number (Nigeria first); see below
 *  - AddressInput — live address suggestions (lib/applicant/places.ts)
 *  - DatePicker   — our own calendar (day / month / year views) instead of
 *                   the browser's native picker, so it looks the same on every
 *                   device. `mode="month"` picks a month only.
 *  - TimePicker   — 30-minute slot list in the same popover style.
 * Values stay plain strings (ISO "YYYY-MM-DD" / "YYYY-MM" / "HH:mm"), so
 * the typed service layer is unchanged.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invalidAttrs } from "@/components/applicant/form-feedback";
import { Calendar, ChevronLeft, ChevronRight, Clock3, X } from "@/components/applicant/icons";
import { newsreader } from "@/components/applicant/fonts";
import { SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";
import { AnimatePresence, motion } from "motion/react";
import { LocationPicker } from "@/components/shared/LocationPicker";
import { CountryPhoneInput } from "@/components/shared/CountryPhoneInput";
import { isIntlPhone } from "@/lib/phone/phone";

/* ------------------------------------------------------------ popover */

function usePopover() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
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
  return { open, setOpen, wrap };
}

const PANEL =
  "absolute left-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-(--ap-line) bg-white p-3 shadow-[0_18px_40px_rgba(37,0,68,.14)]";

/* -------------------------------------------------------------- phone */

/**
 * PhoneInput is now a thin wrapper around the shared country-code control
 * (components/shared/CountryPhoneInput.tsx; helpers in lib/phone). Every existing import keeps
 * working. The value is canonical "+<dialcode><digits>" (e.g. "+2348012345678"); older stored
 * values such as "+234 803 555 0142" are read and shown correctly. Use isValidPhone() from
 * "@/lib/phone/phone" to decide whether a value may be saved.
 */
type PhoneProps = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  /** Parent says the number is not acceptable yet (e.g. a partly typed number on Save). */
  invalid?: boolean;
  /** Deprecated and ignored: every phone field now has a country dropdown (Nigeria first). */
  international?: boolean;
  /** The parent shows its own error text, so don't repeat it under the field. */
  quiet?: boolean;
  disabled?: boolean;
  defaultCountry?: string;
  describedBy?: string;
  onBlur?: () => void;
};

export function PhoneInput({ international: _international, ...rest }: PhoneProps) {
  void _international;
  return <CountryPhoneInput variant="app" {...rest} />;
}

/** Kept for existing callers: "+" then 8 to 15 digits. Prefer isValidPhone() (also checks the country's length). */
export { isIntlPhone };

/* ------------------------------------------------------------ address */

/**
 * Address = house number and street, then State -> Local Government ->
 * nearest junction (our replacement for a Google Maps address search; see
 * components/shared/LocationPicker.tsx). Still one string, so every caller and
 * the saved data are unchanged.
 */
export function AddressInput({
  id,
  value,
  onChange,
  placeholder = "e.g. 12 Aminu Kano Crescent",
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  /** No longer used: State and LGA are chosen in the picker itself. */
  onPick?: unknown;
}) {
  return (
    <LocationPicker
      idPrefix={id}
      value={value}
      onChange={onChange}
      street={{ placeholder }}
      invalid={invalid}
      fieldClass="flex flex-col gap-1.5 text-[13px] font-semibold text-(--ap-ink-2)"
      noteClass="font-normal text-(--ap-muted)"
    />
  );
}

/* --------------------------------------------------------------- date */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  return r ? { y: +r[1], m: +r[2] - 1, d: r[3] ? +r[3] : 1 } : null;
}
function fmt(value: string, mode: "date" | "month"): string {
  const p = parse(value);
  if (!p) return "";
  return mode === "month" ? `${MONTHS[p.m].slice(0, 3)} ${p.y}` : `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}`;
}
function todayParts() {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

type View = "days" | "months" | "years";

export function DatePicker({
  id,
  value,
  onChange,
  mode = "date",
  min,
  max,
  placeholder,
  initialView,
  title,
  invalid = false,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  mode?: "date" | "month";
  /** Heading of the phone sheet, e.g. "Date of birth". */
  title?: string;
  /** ISO bounds, same format as value. */
  min?: string;
  max?: string;
  placeholder?: string;
  /** e.g. "years" for date of birth, so nobody pages back month by month. */
  initialView?: View;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { open, setOpen, wrap } = usePopover();
  const sel = parse(value);
  const t = todayParts();
  const [cursor, setCursor] = useState(() => sel ?? t);
  const [view, setView] = useState<View>(mode === "month" ? "months" : "days");
  const panelId = useId();
  const isPhone = useIsPhone();
  const isClient = useIsClient();
  const [up, setUp] = useState(false);
  // Desktop panel: after it opens, measure it and slide it back inside the
  // screen if it runs past either edge (12px margin). Works wherever the
  // field sits (e.g. a right-hand column).
  const panelRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);
  useLayoutEffect(() => {
    if (!open || isPhone) return;
    const el = panelRef.current;
    if (!el) return;
    const fit = () => {
      el.style.marginLeft = "0px";
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const dx = r.right > vw - 12 ? vw - 12 - r.right : r.left < 12 ? 12 - r.left : 0;
      el.style.marginLeft = "";
      setShiftX(dx);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open, isPhone]);
  const sheetTitle = title ?? (mode === "month" ? "Choose a month" : "Choose a date");

  // Lock page scroll behind the phone sheet.
  useEffect(() => {
    if (!open || !isPhone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isPhone]);

  const key = (y: number, m: number, d?: number) => (mode === "month" || d === undefined ? `${y}-${pad(m + 1)}` : `${y}-${pad(m + 1)}-${pad(d)}`);
  const minK = min?.slice(0, mode === "month" ? 7 : 10);
  const maxK = max?.slice(0, mode === "month" ? 7 : 10);
  const out = (k: string) => (!!minK && k < minK.slice(0, k.length)) || (!!maxK && k > maxK.slice(0, k.length));

  function toggle() {
    if (!open) {
      setCursor(sel ?? t);
      setView(initialView ?? (mode === "month" ? "months" : "days"));
      const r = wrap.current?.getBoundingClientRect();
      setUp(!!r && window.innerHeight - r.bottom < 440 && r.top > 440);
      // Place it inside the screen straight away (the layout effect below
      // re-checks once it's drawn).
      if (r) {
        const vw = document.documentElement.clientWidth;
        setShiftX(r.left + 320 > vw - 12 ? vw - 12 - (r.left + 320) : 0);
      }
    }
    setOpen(!open);
  }
  function choose(k: string) {
    onChange(k);
    setOpen(false);
  }

  const yearStart = cursor.y - (cursor.y % 12);
  const heading =
    view === "days" ? `${MONTHS[cursor.m]} ${cursor.y}` : view === "months" ? String(cursor.y) : `${yearStart} – ${yearStart + 11}`;
  function step(dir: 1 | -1) {
    if (view === "days") {
      const m = cursor.m + dir;
      setCursor({ ...cursor, y: cursor.y + Math.floor(m / 12), m: (m + 12) % 12 });
    } else setCursor({ ...cursor, y: cursor.y + dir * (view === "months" ? 1 : 12) });
  }

  // Monday-first grid for the cursor month
  const first = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const cellBase = "flex items-center justify-center rounded-[10px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div ref={wrap} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        {...invalidAttrs(invalid)}
        aria-describedby={describedBy}
        onClick={toggle}
        className={`ap-input flex items-center gap-2.5 text-left ${open ? "border-(--ap-violet)! shadow-[0_0_0_3px_rgba(138,10,163,.14)]" : ""}`}
      >
        <span className={`flex-1 truncate ${value ? "" : "text-(--ap-muted)"}`}>{fmt(value, mode) || placeholder || (mode === "month" ? "Select month" : "Select date")}</span>
        <Calendar className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
      </button>

      {isClient && isPhone
        ? createPortal(
            // Phones: modal bottom sheet over a dimmed page (portal, so no
            // transformed ancestor can trap the fixed positioning). Swipe the
            // handle/title down to close; it slides in and out (Motion).
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="date-sheet"
                  className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[150] flex items-end`}
                  style={{ background: "rgba(17,17,27,.45)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (e.target === e.currentTarget) setOpen(false);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <SwipeSheet
                    id={panelId}
                    role="dialog"
                    aria-modal="true"
                    aria-label={sheetTitle}
                    onClose={() => setOpen(false)}
                    className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
                    header={
                      <div className="mt-3 mb-3 flex items-center justify-between gap-3">
                        <b className="ap-serif text-[22px]">{sheetTitle}</b>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-ink-2)">
                          <X className="size-[18px]" aria-hidden="true" />
                        </button>
                      </div>
                    }
                  >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className="flex size-9 items-center justify-center rounded-[10px] text-(--ap-ink-2) hover:bg-(--ap-line-2)">
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "days" ? "months" : "years")}
              disabled={view === "years"}
              className="ap-serif h-9 rounded-[10px] px-3 text-[19px] text-(--ap-ink) hover:bg-(--ap-line-2) disabled:hover:bg-transparent"
            >
              {heading}
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className="flex size-9 items-center justify-center rounded-[10px] text-(--ap-ink-2) hover:bg-(--ap-line-2)">
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className="grid grid-cols-7 gap-1 pb-1">
                {WEEK.map((w) => (
                  <span key={w} className="text-center text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (d === null) return <span key={`e${i}`} />;
                  const k = key(cursor.y, cursor.m, d);
                  const on = value === k;
                  const today = t.y === cursor.y && t.m === cursor.m && t.d === d;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={out(k)}
                      onClick={() => choose(k)}
                      aria-pressed={on}
                      aria-label={`${d} ${MONTHS[cursor.m]} ${cursor.y}`}
                      className={`${cellBase} aspect-square max-[767px]:text-[15px] ${
                        on ? "bg-(--ap-violet) text-white" : today ? "text-(--ap-violet) ring-1 ring-(--ap-violet) ring-inset" : "text-(--ap-ink) hover:bg-(--ap-tint)"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : view === "months" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, m) => {
                const k = key(cursor.y, m);
                const on = sel?.y === cursor.y && sel.m === m;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={out(k)}
                    onClick={() => (mode === "month" ? choose(k) : (setCursor({ ...cursor, m }), setView("days")))}
                    className={`${cellBase} h-11 max-[767px]:h-13 ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink) hover:bg-(--ap-tint)"}`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => {
                const on = sel?.y === y;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={out(String(y))}
                    onClick={() => (setCursor({ ...cursor, y }), setView("months"))}
                    className={`${cellBase} h-11 max-[767px]:h-13 ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink) hover:bg-(--ap-tint)"}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between border-t border-(--ap-line-2) pt-2.5">
            <button type="button" onClick={() => choose("")} className="h-8 rounded-lg px-2.5 text-[13px] font-bold text-(--ap-muted) max-[767px]:h-11 max-[767px]:text-[15px] hover:text-(--ap-ink)">
              Clear
            </button>
            {!out(key(t.y, t.m, t.d)) ? (
              <button type="button" onClick={() => choose(key(t.y, t.m, t.d))} className="h-8 rounded-lg px-2.5 text-[13px] font-bold text-(--ap-violet) max-[767px]:h-11 max-[767px]:text-[15px] hover:bg-(--ap-tint)">
                {mode === "month" ? "This month" : "Today"}
              </button>
            ) : null}
          </div>
                  </SwipeSheet>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
      {open && !isPhone ? (
        // Desktop/tablet: anchored popover; flips above the field when there isn't room below.
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={sheetTitle}
          style={{ marginLeft: shiftX }}
          className={`ap-pop-in ${up ? "ap-pop-up" : ""} ${PANEL} w-[320px] ${up ? "top-auto! bottom-[calc(100%+6px)]" : ""}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => step(-1)} aria-label="Previous" className="flex size-9 items-center justify-center rounded-[10px] text-(--ap-ink-2) hover:bg-(--ap-line-2)">
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "days" ? "months" : "years")}
              disabled={view === "years"}
              className="ap-serif h-9 rounded-[10px] px-3 text-[19px] text-(--ap-ink) hover:bg-(--ap-line-2) disabled:hover:bg-transparent"
            >
              {heading}
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next" className="flex size-9 items-center justify-center rounded-[10px] text-(--ap-ink-2) hover:bg-(--ap-line-2)">
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className="grid grid-cols-7 gap-1 pb-1">
                {WEEK.map((w) => (
                  <span key={w} className="text-center text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (d === null) return <span key={`e${i}`} />;
                  const k = key(cursor.y, cursor.m, d);
                  const on = value === k;
                  const today = t.y === cursor.y && t.m === cursor.m && t.d === d;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={out(k)}
                      onClick={() => choose(k)}
                      aria-pressed={on}
                      aria-label={`${d} ${MONTHS[cursor.m]} ${cursor.y}`}
                      className={`${cellBase} aspect-square max-[767px]:text-[15px] ${
                        on ? "bg-(--ap-violet) text-white" : today ? "text-(--ap-violet) ring-1 ring-(--ap-violet) ring-inset" : "text-(--ap-ink) hover:bg-(--ap-tint)"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : view === "months" ? (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, m) => {
                const k = key(cursor.y, m);
                const on = sel?.y === cursor.y && sel.m === m;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={out(k)}
                    onClick={() => (mode === "month" ? choose(k) : (setCursor({ ...cursor, m }), setView("days")))}
                    className={`${cellBase} h-11 max-[767px]:h-13 ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink) hover:bg-(--ap-tint)"}`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => {
                const on = sel?.y === y;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={out(String(y))}
                    onClick={() => (setCursor({ ...cursor, y }), setView("months"))}
                    className={`${cellBase} h-11 max-[767px]:h-13 ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink) hover:bg-(--ap-tint)"}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between border-t border-(--ap-line-2) pt-2.5">
            <button type="button" onClick={() => choose("")} className="h-8 rounded-lg px-2.5 text-[13px] font-bold text-(--ap-muted) max-[767px]:h-11 max-[767px]:text-[15px] hover:text-(--ap-ink)">
              Clear
            </button>
            {!out(key(t.y, t.m, t.d)) ? (
              <button type="button" onClick={() => choose(key(t.y, t.m, t.d))} className="h-8 rounded-lg px-2.5 text-[13px] font-bold text-(--ap-violet) max-[767px]:h-11 max-[767px]:text-[15px] hover:bg-(--ap-tint)">
                {mode === "month" ? "This month" : "Today"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- time */

function label12(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "am" : "pm"}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  from = "07:00",
  to = "22:00",
  stepMinutes = 30,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  from?: string;
  to?: string;
  stepMinutes?: number;
}) {
  const { open, setOpen, wrap } = usePopover();
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const slots: string[] = [];
  for (let x = fh * 60 + fm; x <= th * 60 + tm; x += stepMinutes) slots.push(`${pad(Math.floor(x / 60))}:${pad(x % 60)}`);

  return (
    <div ref={wrap} className="relative">
      <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="ap-input flex items-center gap-2.5 text-left">
        <span className={`flex-1 ${value ? "" : "text-(--ap-muted)"}`}>{value ? label12(value) : "Select time"}</span>
        <Clock3 className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
      </button>
      {open ? (
        <ul role="listbox" className={`ap-pop-in ${PANEL} grid max-h-64 w-full grid-cols-3 gap-1.5 overflow-y-auto`}>
          {slots.map((s) => (
            <li key={s} role="option" aria-selected={s === value}>
              <button
                type="button"
                onClick={() => (onChange(s), setOpen(false))}
                className={`h-10 w-full rounded-[10px] text-sm font-semibold ${s === value ? "bg-(--ap-violet) text-white" : "text-(--ap-ink) hover:bg-(--ap-tint)"}`}
              >
                {label12(s)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ contact */

/**
 * "Phone or email" (reference contacts): a Phone / Email switch, defaulting
 * to phone, with the same country-code field as everywhere else.
 */
export function ContactInput({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; /** Shown, and the field marked invalid, while set. */ error?: string }) {
  const [mode, setMode] = useState<"phone" | "email">(() => (value.includes("@") ? "email" : "phone"));
  return (
    <div data-ap-field className="flex min-w-0 flex-col gap-2.5">
      {/* Stacked, one thing per line: "Contact by", the Phone | Email switch, the field, a hint. Nothing wraps. */}
      <label htmlFor={id} className="text-sm font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="ap-seg grid w-full grid-cols-2" role="radiogroup" aria-label={`${label}: contact type`}>
          {(["phone", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                if (m === mode) return;
                setMode(m);
                onChange("");
              }}
              className="h-11! px-3! text-[15px]! aria-checked:bg-white aria-checked:text-(--ap-violet) aria-checked:shadow-[0_1px_3px_rgba(37,0,68,0.1)]"
            >
              {m === "phone" ? "Phone" : "Email"}
            </button>
          ))}
        </div>
      </div>
      {mode === "phone" ? (
        <PhoneInput id={id} autoComplete="off" value={value} onChange={onChange} invalid={!!error} />
      ) : (
        <input id={id} type="email" inputMode="email" autoComplete="off" className="ap-input" placeholder="name@example.com" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} />
      )}
      {error ? <p id={`${id}-err`} className="text-[13px] font-semibold text-(--ap-rose)">{error}</p> : <p className="text-[13px] text-(--ap-muted)">{mode === "phone" ? "Beeliv will call or message this number." : "Beeliv will email this address."}</p>}
    </div>
  );
}

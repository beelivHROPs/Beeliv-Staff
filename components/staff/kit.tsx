"use client";

/**
 * Small visual kit for the Staff phone screens (Home, SOPs): the purple hero
 * surface, icon discs, pastel card tints and one ring. Presentation only.
 * Colours come from existing tokens so dark mode follows; the lavender-to-purple
 * gradient is the Beeliv identity, gold is only an accent.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, ShieldCheck, Trash2 } from "@/components/applicant/icons";
import { SPRING, SwipeSheet, useIsClient, useIsPhone } from "@/components/applicant/motion";
import type { ConfirmOptions } from "@/components/applicant/ConfirmDialog";
import { GlassIcon, glassForIcon, type GlassName } from "@/components/shared/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

/** Tactile card: soft two-layer shadow. */
export const LIFT = "shadow-[0_1px_2px_rgba(41,32,82,.05),0_14px_28px_-14px_rgba(41,32,82,.22)]";

/** Pastel card fills that carry meaning: lavender = new/general, sand = waiting for you, sage = done/good, gold = learning. */
export const PASTEL = {
  lavender: "bg-[color-mix(in_srgb,var(--ap-lilac)_85%,var(--ap-tint-soft))] text-(--ap-violet)",
  sand: "bg-[color-mix(in_srgb,var(--ap-warn-bg)_70%,transparent)] text-(--ap-warn)",
  sage: "bg-[color-mix(in_srgb,var(--ap-ok-bg)_80%,transparent)] text-(--ap-ok)",
  gold: "bg-[color-mix(in_srgb,#ecd9a0_65%,transparent)] text-(--ap-ink)",
} as const;
export type PastelTone = keyof typeof PASTEL;

/** The one strong block on a screen: brand purple easing into lavender. */
export const HERO_SURFACE = "relative isolate overflow-hidden rounded-[26px] bg-[linear-gradient(150deg,#2f2166_0%,#4f3aa8_46%,#8f7de6_100%)] text-white shadow-[0_18px_36px_-16px_rgba(41,32,82,.6)]";

/** Quiet concentric rings and a dot grid for the hero. Decorative only. */
export function HeroDeco() {
  return (
    <svg className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 360 240" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
      <defs>
        <pattern id="kit-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#fff" fillOpacity=".16" />
        </pattern>
      </defs>
      <rect x="0" y="120" width="190" height="120" fill="url(#kit-dots)" />
      <circle cx="310" cy="40" r="120" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="84" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="48" fill="#fff" fillOpacity=".06" />
      <circle cx="40" cy="250" r="90" fill="#c1ac75" fillOpacity=".14" />
    </svg>
  );
}

/** Round icon holder, white so it pops on any pastel. */
export function Disc({ icon: I, size = 44, className = "" }: { icon: Icon; size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-(--ap-surface,#fff) shadow-[0_2px_6px_rgba(41,32,82,.12)] ${className}`} style={{ width: size, height: size }}>
      <I className="size-[46%]" aria-hidden="true" />
    </span>
  );
}

/**
 * Stage colour for a progress ring: gold early, purple in the middle, green late or complete,
 * rose only for a problem. Same logic as the other apps' stage tone; copied here on purpose (no cross-app import).
 */
export function stageTone(value: number, problem = false): string {
  // Project lead (2026-10-25): red for the lowest stages, purple in the middle, green for the highest.
  if (problem) return "var(--ap-muted)";
  // Two colours only: purple below half, green from half.
  return value >= 0.5 ? "var(--ap-ok)" : "var(--ap-violet)";
}

/** A ring with anything in the middle. `value` is 0 to 1. The arc fills once on load (off under reduced motion). */
export function Ring({ value, size = 56, stroke = 5, track = "var(--ap-tint-2)", arc = "var(--ap-violet)", label, children }: { value: number; size?: number; stroke?: number; track?: string; arc?: string; label?: string; children?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {v > 0 ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={arc} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className="sop-ring-arc" style={{ ["--sop-c" as string]: c }} /> : null}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/* ---------- Action pill: the one button style for the Staff phone screens ---------- */

type PillVariant = "dark" | "purple" | "outline" | "ghost" | "rose";
/*
 * Pill colours read two tokens so dark mode can lift them (staff.css):
 * --staff-deep = the deep navy-purple of the dark pill, --staff-fill = the purple pill.
 */
const PILL_TONE: Record<PillVariant, { box: string; lead: string; tail: string }> = {
  dark: { box: "bg-(--staff-deep,#1b1340) text-white shadow-[0_10px_20px_-8px_rgba(0,0,0,.55)] hover:brightness-125", lead: "bg-[#c1ac75] text-[#1b1340]", tail: "bg-white/12" },
  purple: { box: "bg-(--staff-fill,#5b45bf) text-white shadow-[0_10px_20px_-10px_rgba(79,58,168,.7)] hover:brightness-110", lead: "bg-white/22 text-white", tail: "bg-white/16" },
  outline: { box: "bg-(--ap-surface,#fff) text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)] hover:shadow-[inset_0_0_0_1.5px_var(--ap-violet)]", lead: "bg-(--ap-tint-2) text-(--ap-violet)", tail: "bg-(--ap-tint-2) text-(--ap-violet)" },
  ghost: { box: "bg-transparent text-(--ap-violet) hover:bg-(--ap-tint)", lead: "bg-(--ap-tint-2) text-(--ap-violet)", tail: "" },
  /** Destructive confirmations only (delete, cancel a request). */
  rose: { box: "bg-[#c9304a] text-white shadow-[0_10px_20px_-10px_rgba(201,48,74,.7)] hover:brightness-110", lead: "bg-white/22 text-white", tail: "bg-white/16" },
};

function PillSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 animate-spin motion-reduce:animate-none" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The staff action button: icon disc on the left, bold label, round arrow on the right.
 * Renders a link when `href` is given, otherwise a button. Min height 48px, visible focus ring.
 * `compact` is the card-level size (inline width, no top margin). `arrow={false}` drops the right disc.
 */
export function ActionPill({ icon: I, children, href, onClick, variant = "dark", compact = false, fit = false, external = false, disabled = false, loading = false, arrow = true, type = "button", className = "", ariaLabel, form }: {
  icon?: Icon;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: PillVariant;
  compact?: boolean;
  /** Content width (desktop headers, hero cards, footers) instead of stretching to the container. */
  fit?: boolean;
  /** Opens `href` in a new tab (https links to places outside the app). */
  external?: boolean;
  disabled?: boolean;
  loading?: boolean;
  arrow?: boolean;
  type?: "button" | "submit";
  className?: string;
  ariaLabel?: string;
  form?: string;
}) {
  const t = PILL_TONE[variant];
  const off = disabled || loading;
  const disc = compact ? "size-9" : "size-11";
  const cls = `inline-flex ${compact ? "min-h-12 gap-2.5 py-1.5 pr-1.5 pl-1.5 text-[15px]" : `min-h-14 ${fit ? "w-auto" : "w-full"} gap-3 py-1.5 pr-1.5 pl-2 text-[17px]`} items-center rounded-full text-left font-bold transition-transform active:scale-[.985] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-2 focus-visible:outline-none ${t.box} ${arrow && variant !== "ghost" ? "" : "pr-5!"} ${off ? "opacity-60" : ""} ${className}`;
  const inner = (
    <>
      {I || loading ? (
        <span className={`flex ${disc} shrink-0 items-center justify-center rounded-full ${t.lead}`}>{loading ? <PillSpinner /> : I ? <I className="size-5" aria-hidden="true" /> : null}</span>
      ) : (
        <span className="w-3 shrink-0" aria-hidden="true" />
      )}
      <span className={compact ? "flex-1 px-0.5" : "flex-1"}>{children}</span>
      {arrow && variant !== "ghost" ? (
        <span className={`flex ${disc} shrink-0 items-center justify-center rounded-full ${t.tail}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      ) : null}
    </>
  );
  if (href && !off && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={ariaLabel} className={cls}>
        {inner}
      </a>
    );
  }
  if (href && !off) {
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} form={form} onClick={onClick} disabled={off} aria-busy={loading || undefined} aria-label={ariaLabel} className={cls}>
      {inner}
    </button>
  );
}

/* ---------- Phone states: empty and error cards, skeleton block ---------- */

/** Soft card for an empty or error state: icon disc, a plain line, an optional action pill. */
export function StateCard({ icon, title, text, action, tone = "lavender", glass }: { icon: Icon; title: string; text?: string; action?: ReactNode; tone?: PastelTone; /** Large empty states only: the glass hero icon instead of the round disc. */ glass?: GlassName }) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-[22px] px-6 py-9 text-center ${PASTEL[tone]} ${LIFT}`} role="status">
      {(glass ?? glassForIcon(icon, title)) ? <GlassIcon name={(glass ?? glassForIcon(icon, title))!} size={96} /> : <Disc icon={icon} size={56} />}
      <p className="text-[18px] leading-snug font-bold text-(--ap-ink)">{title}</p>
      {text ? <p className="max-w-[300px] text-[15px] leading-snug text-(--ap-ink-2)">{text}</p> : null}
      {action ? <div className="mt-1 w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

/* ---------- Calm containers: one white card with hairline, facts in rows ---------- */

/** The quiet card: surface fill, hairline, 22px radius. Use for lists and facts; the hero is the only loud block. */
export const PANEL = "rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff)";

/** A titled card. `aside` is a small right-hand slot (a count or a quiet link). */
export function Panel({ title, aside, children, className = "", id }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={title ? `${id ?? title.replace(/\W+/g, "-").toLowerCase()}-h` : undefined} className={`${PANEL} p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={`${id ?? title.replace(/\W+/g, "-").toLowerCase()}-h`} className="text-[18px] font-bold text-(--ap-ink)">
            {title}
          </h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Key facts as rows with hairline dividers: label left, value right. Reads like a statement, not a form. */
export function Facts({ rows, className = "" }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={`divide-y divide-(--ap-line-2) ${className}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-[14px] text-(--ap-muted)">{k}</dt>
          <dd className="min-w-0 text-right text-[16px] font-semibold break-words text-(--ap-ink)">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Two-or-three-way switch (All / Unread, Week / Month). 44px tall targets, pill shape, active = deep pill. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-(--ap-surface,#fff) p-1 shadow-[inset_0_0_0_1px_var(--ap-line)]">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`h-11 min-w-[84px] rounded-full px-4 text-[15px] font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${value === o.key ? "bg-(--staff-deep,#1b1340) text-white" : "text-(--ap-ink-2) hover:bg-(--ap-tint)"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small dot plus a word: the quiet way to show status. */
export function Dot({ tone, children }: { tone: "ok" | "warn" | "info" | "mute" | "rose"; children: ReactNode }) {
  const c = { ok: "bg-(--ap-ok)", warn: "bg-(--ap-warn)", info: "bg-(--ap-info)", mute: "bg-(--ap-faint)", rose: "bg-(--ap-rose)" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-(--ap-ink-2)">
      <span className={`size-2 rounded-full ${c}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Shimmering placeholder block that matches the 22px card radius. */
export function Sk({ className = "" }: { className?: string }) {
  return <div className={`ap-shimmer rounded-[22px] ${className}`} aria-hidden="true" />;
}

/* ---------- Confirmations: one premium sheet for every "are you sure" in Staff ---------- */

/**
 * Same call as the shared confirmAction (title, description, confirmLabel, ...), plus:
 *  - tone "success": a calm check disc and one "Done" pill (no cancel).
 *  - tone "danger": rose pill with the verb you pass in confirmLabel.
 *  - hideCancel: single-button message.
 * Resolves true when confirmed, false when cancelled (Esc, backdrop, swipe, cancel pill).
 */
export type StaffConfirmOptions = Omit<ConfirmOptions, "tone"> & { tone?: "neutral" | "caution" | "danger" | "success"; hideCancel?: boolean };
type StaffRequest = StaffConfirmOptions & { resolve: (ok: boolean) => void };

let staffCurrent: StaffRequest | null = null;
const staffListeners = new Set<() => void>();
const staffEmit = () => staffListeners.forEach((l) => l());

export function confirmAction(opts: StaffConfirmOptions): Promise<boolean> {
  staffCurrent?.resolve(false);
  return new Promise((resolve) => {
    staffCurrent = { ...opts, resolve };
    staffEmit();
  });
}

function staffClose(ok: boolean) {
  const r = staffCurrent;
  staffCurrent = null;
  staffEmit();
  r?.resolve(ok);
}

/** Disc tint = meaning: lavender info, sand needs care, rose destructive, sage success. */
const CONFIRM_TONE = {
  neutral: { disc: "bg-(--ap-tint) text-(--ap-violet)", dot: "bg-(--ap-violet)", icon: ShieldCheck, pill: "dark" as const },
  caution: { disc: PASTEL.sand, dot: "bg-(--ap-warn)", icon: CircleAlert, pill: "dark" as const },
  danger: { disc: "bg-(--ap-rose-bg) text-(--ap-rose)", dot: "bg-(--ap-rose)", icon: Trash2, pill: "rose" as const },
  success: { disc: PASTEL.sage, dot: "bg-(--ap-ok)", icon: Check, pill: "dark" as const },
};

/** Mount once in StaffShell. */
export function StaffConfirmHost() {
  const req = useSyncExternalStore(
    (cb) => {
      staffListeners.add(cb);
      return () => staffListeners.delete(cb);
    },
    () => staffCurrent,
    () => null,
  );
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<AnimatePresence>{req ? <ConfirmSheet key={req.title + req.confirmLabel} req={req} /> : null}</AnimatePresence>, document.body);
}

function ConfirmSheet({ req }: { req: StaffRequest }) {
  const tone = CONFIRM_TONE[req.tone ?? "neutral"];
  const Icon = req.icon ?? tone.icon;
  const isPhone = useIsPhone();
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const firstFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const single = req.hideCancel || req.tone === "success";
  const ready = (!req.typeToConfirm || typed.trim() === req.typeToConfirm) && (!req.acknowledge || ack) && !busy;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Safe action first: the field the person must complete, else the cancel pill (or the only pill).
    (firstFocus.current ?? actions.current?.querySelector<HTMLElement>("button"))?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !busy) {
      e.preventDefault();
      staffClose(false);
    }
    if (e.key !== "Tab" || !panel.current) return;
    const f = [...panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function confirm() {
    if (!ready) return;
    const out = req.onConfirm?.();
    if (out && typeof (out as Promise<void>).then === "function") {
      setBusy(true);
      (out as Promise<void>).then(
        () => staffClose(true),
        () => setBusy(false),
      );
    } else staffClose(true);
  }


  const content = (
    <div ref={panel} className="flex flex-col items-center text-center min-[768px]:items-start min-[768px]:text-left">
      <span className={`mb-4 flex size-14 items-center justify-center rounded-full ${tone.disc}`}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 id={titleId} className="text-[22px] leading-tight font-bold text-(--ap-ink)">
        {req.title}
      </h2>
      {req.description ? (
        <p id={descId} className="mt-2 text-[16px] leading-snug text-(--ap-ink-2)">
          {req.description}
        </p>
      ) : null}

      {req.points?.length ? (
        <ul className="mt-4 flex w-full flex-col gap-2 rounded-[16px] bg-(--ap-tint-soft) px-4 py-3.5 text-left">
          {req.points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[15px] leading-snug text-(--ap-ink-2)">
              <span className={`mt-[8px] size-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      ) : null}

      {req.acknowledge ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={ack}
          onClick={() => setAck((v) => !v)}
          ref={req.typeToConfirm ? undefined : (el) => void (firstFocus.current = el)}
          className="mt-4 flex min-h-12 w-full items-start gap-3 rounded-[16px] bg-(--ap-tint-soft) px-4 py-3 text-left text-[15px] leading-snug text-(--ap-ink-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none"
        >
          <span
            className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${ack ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-faint) bg-(--ap-surface,#fff)"}`}
            aria-hidden="true"
          >
            {ack ? <Check className="size-4" strokeWidth={3} /> : null}
          </span>
          {req.acknowledge}
        </button>
      ) : null}

      {req.typeToConfirm ? (
        <div className="mt-4 flex w-full flex-col gap-1.5 text-left">
          <label htmlFor={inputId} className="text-[14px] font-semibold text-(--ap-ink-2)">
            Type <b className="font-bold tracking-[.04em] text-(--ap-rose)">{req.typeToConfirm}</b> to confirm
          </label>
          <input
            id={inputId}
            ref={(el) => void (firstFocus.current = el)}
            className="ap-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
          />
        </div>
      ) : null}

      <div ref={actions} className={`mt-6 flex w-full flex-col-reverse gap-2.5 min-[768px]:flex-row ${single ? "min-[768px]:justify-start" : "min-[768px]:justify-end"}`}>
        {single ? null : (
          <ActionPill variant="outline" compact arrow={false} disabled={busy} onClick={() => staffClose(false)} className="w-full justify-center text-center! min-[768px]:w-auto">
            {req.cancelLabel && req.cancelLabel !== "Cancel" ? req.cancelLabel : req.tone === "danger" ? "Keep it" : "Go back"}
          </ActionPill>
        )}
        <ActionPill variant={tone.pill} compact arrow={false} icon={single ? Check : undefined} disabled={!ready} loading={busy} onClick={confirm} className="w-full justify-center text-center! min-[768px]:w-auto">
          {busy ? "Working..." : single && req.confirmLabel === "OK" ? "Done" : req.confirmLabel}
        </ActionPill>
      </div>
    </div>
  );

  return (
    // `applicant-shell` on the portalled backdrop: the sheet lives on <body>, outside the Staff layout, and
    // without it the Staff tokens (--ap-violet, dark mode) never reach it, so the ticked box had no fill
    // and its white tick vanished on the white sheet.
    <motion.div
      className="applicant-shell fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6"
      style={{ background: "rgba(17,13,40,.55)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) staffClose(false);
      }}
      onKeyDown={onKeyDown}
    >
      {isPhone ? (
        <SwipeSheet
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={req.description ? descId : undefined}
          onClose={() => !busy && staffClose(false)}
          className="bg-(--ap-surface,#fff)! px-5 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))]"
        >
          <div className="pt-4">{content}</div>
        </SwipeSheet>
      ) : (
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={req.description ? descId : undefined}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={SPRING}
          className="w-[440px] max-w-full rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff) p-7 shadow-[0_30px_80px_rgba(17,13,40,.3)]"
        >
          {content}
        </motion.div>
      )}
    </motion.div>
  );
}

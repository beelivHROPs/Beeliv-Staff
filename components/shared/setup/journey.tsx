"use client";

/**
 * Shared pieces of the ONE guided onboarding (docs/ONBOARDING-FLOW-MERGED-2026-11-12.md).
 * The setup page (components/shared/setup/AccountSetup.tsx) uses the hero surface, ring and step rail;
 * the "Getting started" card on Home (GettingStarted.tsx) uses the ring and the StepCard accordion.
 * Presentation only: colours come from each app's own --ap-* tokens, nothing new is introduced.
 */
import type { ReactNode } from "react";
import { Check, ChevronDown, FileText, LockKeyhole, ShieldCheck, UserRound, type IconComponent } from "@/components/applicant/icons";
import type { GlyphName } from "@/components/shared/icons/BoldTile";

// Setup steps use the app's own THIN line icons (1.5 stroke) on a soft tile: lead asked for lighter icons,
// no thick/filled glyphs and no Lucide (2026-11-13). In-repo SVGs, no new dependency.
const LINE: Partial<Record<GlyphName, IconComponent>> = { profile: UserRound, shield: ShieldCheck, clipboard: FileText, key: LockKeyhole };
function LineTile({ glyph, current }: { glyph: GlyphName; current: boolean }) {
  const Icon = LINE[glyph] ?? FileText;
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={current
        ? { background: "var(--staff-fill, var(--client-fill, var(--admin-fill, var(--ap-violet, #5b087b))))", color: "#fff" }
        : { background: "color-mix(in srgb, var(--ap-lilac, #efe6f7) 85%, var(--ap-tint-soft, #fff))", color: "var(--ap-violet, #5b087b)" }}
    >
      <Icon size={20} strokeWidth={1.5} />
    </span>
  );
}

export const JOURNEY_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";

/** First name for a greeting; "" when unknown. Skips a leading title such as "Mrs". */
export function firstName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
}

/** Progress ring: value 0 to 1, anything in the middle. Same look as the Staff kit ring, kept local so Client and Admin do not import Staff code. */
export function JourneyRing({ value, size = 76, stroke = 8, label, track = "var(--ap-tint-2)", arc, children }: { value: number; size?: number; stroke?: number; label: string; track?: string; arc?: string; children?: ReactNode }) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {v > 0 ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={arc ?? (v >= 0.5 ? "var(--ap-ok)" : "var(--ap-violet)")} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.22, 1, 0.36, 1)" }} /> : null}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/**
 * The one strong block on the setup page: the approved Staff onboarding hero surface (gradient, quiet rings and dot
 * grid, white type), in each app's own colours. Gradient stops are each app's own brand tokens (Staff: the kit
 * HERO_SURFACE exactly; Client: plum-black, wine, wine-2; Admin HR: deep, mulberry, support), so nothing new is introduced.
 */
const HERO_BG = {
  staff: "bg-[linear-gradient(150deg,#2f2166_0%,#4f3aa8_46%,#8f7de6_100%)] shadow-[0_18px_36px_-16px_rgba(41,32,82,.6)]",
  client: "bg-[linear-gradient(150deg,#1c171a_0%,#6f294f_55%,#8a3d68_100%)] shadow-[0_18px_36px_-16px_rgba(28,23,26,.55)]",
  admin: "bg-[linear-gradient(150deg,#49152f_0%,#8b2252_52%,#a8386a_100%)] shadow-[0_18px_36px_-16px_rgba(73,21,47,.55)]",
} as const;
export type JourneyApp = keyof typeof HERO_BG;
export const heroSurface = (app: JourneyApp) => `relative isolate overflow-hidden rounded-[26px] text-white ${HERO_BG[app]}`;

/** Quiet concentric rings and a dot grid (same drawing as the Staff kit HeroDeco, kept local: no cross-app import). Decorative only. */
export function JourneyHeroDeco() {
  return (
    <svg className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 360 240" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
      <defs>
        <pattern id="su-hero-dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#fff" fillOpacity=".16" />
        </pattern>
      </defs>
      <rect x="0" y="120" width="190" height="120" fill="url(#su-hero-dots)" />
      <circle cx="310" cy="40" r="120" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="84" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="48" fill="#fff" fillOpacity=".06" />
      <circle cx="40" cy="250" r="90" fill="#c1ac75" fillOpacity=".14" />
    </svg>
  );
}

/** Status word with a dot (the approved checklist "Done / Required / Optional" pill). */
export function JourneyDot({ tone, children }: { tone: "ok" | "warn" | "mute" | "info"; children: ReactNode }) {
  const c = { ok: "bg-(--ap-ok)", warn: "bg-(--ap-warn)", mute: "bg-(--ap-faint)", info: "bg-(--ap-violet)" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--ap-ink-2)">
      <span className={`size-2 rounded-full ${c}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export type RailState = "done" | "current" | "todo" | "later";
export type RailRow = { id: string; title: string; summary?: string; state: RailState; glyph: GlyphName; tag: { tone: "ok" | "warn" | "mute" | "info"; word: string } };

/**
 * The ordered step list (approved onboarding checklist rows): a tick disc when done, a bold tile otherwise (filled
 * for the current step), the title, one quiet line and a status dot. Done rows offer Edit; "later" rows are greyed and
 * cannot be opened. `onOpen` is called for done rows and the current row only.
 */
export function StepRail({ rows, onOpen, label }: { rows: RailRow[]; onOpen: (id: string) => void; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {rows.map((r) => {
        const open = r.state === "done" || r.state === "current";
        const body = (
          <>
            {r.state === "done" ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-ok-bg) text-(--ap-ok)" aria-hidden="true">
                <Check className="size-5" strokeWidth={1.8} />
              </span>
            ) : (
              <LineTile glyph={r.glyph} current={r.state === "current"} />
            )}
            <span className="min-w-0 flex-1 leading-snug">
              <b className={`block text-[15px] ${r.state === "later" ? "text-(--ap-muted)" : "text-(--ap-ink)"}`}>{r.title}</b>
              {r.summary ? <span className="block truncate text-[13px] text-(--ap-muted)">{r.summary}</span> : null}
              <span className="mt-1 block">
                <JourneyDot tone={r.tag.tone}>{r.tag.word}</JourneyDot>
              </span>
            </span>
            {r.state === "done" ? <span className="shrink-0 text-[14px] font-semibold text-(--ap-violet) underline-offset-2 group-hover:underline">Edit</span> : null}
          </>
        );
        return (
          <li key={r.id} aria-current={r.state === "current" ? "step" : undefined} className={r.state === "later" ? "opacity-70" : ""}>
            {open ? (
              <button type="button" onClick={() => onOpen(r.id)} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-(--ap-tint-soft) ${r.state === "current" ? "bg-(--ap-tint-soft) shadow-[inset_0_0_0_1.5px_var(--ap-line)]" : ""} ${JOURNEY_FOCUS}`}>
                {r.state === "done" ? <span className="sr-only">Edit: </span> : null}
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A group of steps in one card. Steps are <li> StepCards, numbered across groups by the caller. */
export function StepGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ol aria-label={label} className="overflow-hidden rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff)">
      {children}
    </ol>
  );
}

export type StepState = "done" | "current" | "todo" | "later";

/**
 * One step. Header is a button (accordion): tick or number, title, one short line, chevron.
 * Open it to see the single task. Done steps collapse with a tick and can be reopened.
 */
export function StepCard({ id, number, state, title, summary, open, onToggle, why, children }: { id: string; number: number; state: StepState; title: string; summary?: string; open: boolean; onToggle: () => void; why?: string; children?: ReactNode }) {
  const done = state === "done";
  const disc = done ? "bg-(--ap-ok-bg) text-(--ap-ok)" : state === "current" ? "bg-(--ap-violet) text-white" : "bg-(--ap-surface,#fff) text-(--ap-muted) shadow-[inset_0_0_0_1.5px_var(--ap-line)]";
  return (
    <li className={`border-t border-(--ap-line-2) first:border-t-0 ${open ? "bg-(--ap-tint-soft)" : ""}`} aria-current={state === "current" ? "step" : undefined}>
      <h3>
        <button type="button" id={`${id}-h`} aria-expanded={open} aria-controls={`${id}-p`} onClick={onToggle} className={`flex min-h-16 w-full items-center gap-3.5 px-4 py-3.5 text-left min-[640px]:px-5 ${JOURNEY_FOCUS} focus-visible:-outline-offset-2`}>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold tabular-nums ${disc}`} aria-hidden="true">
            {done ? <Check className="size-5" strokeWidth={1.8} /> : number}
          </span>
          <span className="min-w-0 flex-1 leading-snug">
            <b className="block text-[16px] text-(--ap-ink)">{title}</b>
            {summary ? <span className={`block truncate text-[14px] ${done ? "text-(--ap-ok)" : "text-(--ap-muted)"}`}>{done ? <span className="sr-only">Done. </span> : null}{summary}</span> : null}
          </span>
          <ChevronDown className={`size-5 shrink-0 text-(--ap-muted) transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-p`} role="region" aria-labelledby={`${id}-h`} hidden={!open} className="px-4 pb-5 min-[640px]:px-5">
        {open ? (
          <div className="ap-step-fwd flex flex-col gap-4 min-[640px]:pl-[54px]">
            {why ? <p className="text-[15px] leading-snug text-(--ap-ink-2)">{why}</p> : null}
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

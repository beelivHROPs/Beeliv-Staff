"use client";

/**
 * Phone-only Admin detail design (approved mid-ground, docs/design-references/admin-midground-2026-10-26.html,
 * third phone). Every piece renders below 768px only (or folds only there), so desktop is untouched.
 * Colours and shapes live in app/admin/admin.css (.pd-*), so light mode matches the spec exactly and dark mode uses tokens.
 *
 *   <PhoneDetailHead>   pink-to-lavender cover, round back button, big plum initials/icon, white panel overlapping the cover:
 *                       name + ONE status pill, one muted line, TWO outline actions.
 *   <PhoneFacts>        a short counted section: label on the left, value on the right.
 *   <PhoneMore>         wraps the rest of the page behind ONE tappable row (closed on phones, always open on desktop).
 *   <PhoneStickyAction> the single most important next action, a floating plum pill at the bottom.
 *
 * It also drops the phone top bar and tab bar for the page (the cover carries its own back button), through the existing
 * [data-admin-nonav] marker (rule in app/admin/admin.css).
 */
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "@/components/applicant/icons";

export type DetailVisual = { kind: "initials"; text: string } | { kind: "icon"; icon: ReactNode };

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? "")).toUpperCase();
}

/** Round white 42px control used on the cover (back, menu). */
export const COVER_ROUND = "flex size-[42px] items-center justify-center rounded-full bg-white text-[#1d1726] shadow-[0_4px_12px_rgba(60,30,80,0.12)] active:scale-95 [html[data-admin-theme=dark]_&]:bg-(--ap-surface) [html[data-admin-theme=dark]_&]:text-(--ap-ink)";

/** Class for the one sticky primary button / link. */
export const PD_CTA = "pd-cta";

/** The ONE status pill: mint (ok), sand (waiting) or rose (bad). */
export function PhonePill({ tone, children }: { tone: "ok" | "wt" | "bad"; children: ReactNode }) {
  return (
    <span className="pd-pill" data-tone={tone}>
      {children}
    </span>
  );
}

/** Maps the Admin chip tones (ok / warn / info / mute / bad) onto the three spec pill colours. */
export const pillTone = (t: string): "ok" | "wt" | "bad" => (t === "ok" ? "ok" : t === "bad" ? "bad" : "wt");

export function PhoneDetailHead({
  backHref,
  backLabel,
  visual,
  title,
  status,
  line,
  actions,
  menu,
}: {
  backHref: string;
  backLabel: string;
  visual: DetailVisual;
  title: string;
  /** ONE status pill (<PhonePill>). */
  status?: ReactNode;
  /** ONE muted line. */
  line?: ReactNode;
  /** The page's two most important actions (outline buttons). Use <PhoneAction>. */
  actions?: ReactNode;
  /** Optional round control at the cover's top right (e.g. a More menu). */
  menu?: ReactNode;
}) {
  return (
    <div className="-mx-[18px] -mt-3 min-[768px]:hidden max-[380px]:-mx-3.5">
      <span data-admin-nonav="" hidden />
      <div className="pd-cover relative h-[240px]">
        <Link href={backHref} aria-label={`Back to ${backLabel}`} className={`${COVER_ROUND} absolute top-[22px] left-4`}>
          <ChevronLeft className="size-[18px]" aria-hidden="true" />
        </Link>
        {menu ? <div className="absolute top-[22px] right-4 z-30">{menu}</div> : null}
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          {visual.kind === "initials" ? (
            <span aria-hidden="true" className="pd-pic flex h-[186px] w-[150px] items-center justify-center rounded-t-[90px] text-[46px] leading-none font-extrabold text-white">
              {visual.text}
            </span>
          ) : (
            <span aria-hidden="true" className="pd-pic mb-[52px] flex size-[104px] items-center justify-center self-end rounded-[32px] text-white shadow-[0_10px_24px_rgba(60,30,80,0.2)] [&_svg]:size-12">
              {visual.icon}
            </span>
          )}
        </div>
      </div>
      <div className="pd-panel relative z-10 -mt-[22px] px-[18px] pt-[18px] max-[380px]:px-3.5">
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 flex-1 text-[21px] leading-tight font-extrabold break-words text-(--ap-ink)">{title}</h1>
          {status ? <div className="shrink-0">{status}</div> : null}
        </div>
        {line ? <p className="mt-1 text-[13px] leading-snug break-words text-(--ap-muted)">{line}</p> : null}
        {actions ? <div className="mt-3.5 grid grid-cols-2 gap-2.5 [&>*:only-child]:col-span-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** One outline action for the panel: a link (tel:, mailto:, route) or a button. */
export function PhoneAction({ icon, label, href, onClick, disabled }: { icon?: ReactNode; label: string; href?: string; onClick?: () => void; disabled?: boolean }) {
  const cls = "pd-act";
  const inner = (
    <>
      {icon}
      {label}
    </>
  );
  if (href) {
    return href.startsWith("/") ? (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    ) : (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Counted label / value section: "Application (4)". Rows with no value are skipped. Phones only. Continues the white panel. */
export function PhoneFacts({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (shown.length === 0) return null;
  return (
    <section aria-label={title} className="-mx-[18px] mb-3 bg-(--ap-surface) px-[18px] pt-3 pb-3 min-[768px]:hidden max-[380px]:-mx-3.5 max-[380px]:px-3.5">
      <h2 className="mb-1 flex items-baseline gap-1.5 text-[17px] leading-tight font-extrabold text-(--ap-ink)">
        {title} <small className="text-[13px] font-bold text-(--ap-muted)">({shown.length})</small>
      </h2>
      <dl className="m-0">
        {shown.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 border-t border-(--ap-line-2) py-[13px] text-[14.5px] first:border-t-0">
            <dt className="shrink-0 text-(--ap-muted)">{r.label}</dt>
            <dd className="m-0 min-w-0 text-right font-bold break-words text-(--ap-ink)">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The rest of a record behind ONE tappable row. Closed on phones, always open from 768px up (the
 * desktop layout is unchanged). Tapping the row opens everything below it.
 */
export function PhoneMore({ title = "More details", children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex min-h-14 w-full items-center gap-2 rounded-3xl bg-(--ap-surface) px-4 text-left text-[15px] font-extrabold text-(--ap-ink) shadow-[0_8px_24px_rgba(60,30,80,0.07)] min-[768px]:hidden"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown className={`size-[18px] shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div id={id} className={open ? "" : "max-[767px]:hidden"}>
        {children}
      </div>
    </div>
  );
}

/** The ONE primary action: a floating plum pill at the bottom on phones. Put a <button className={PD_CTA}> or <Link className={PD_CTA}> inside. */
export function PhoneStickyAction({ children }: { children: ReactNode }) {
  return <div className="fixed inset-x-4 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-40 flex min-[768px]:hidden">{children}</div>;
}

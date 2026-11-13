"use client";

/**
 * Phone bottom navigation shared by the Applicant and Staff apps (project
 * lead's reference, 2026-10-03): a flat floating pill with a round NOTCH
 * cut out around the centre button (the cut ends above the label); the
 * active tab sits in a chip with a short underline. Light mode: brand-colour bar, white accents
 * (pill + centre button). Dark mode: deep bar, violet accents + rim glow. Colours come from the app tokens.
 * Styles: `.ap-bnav*` (applicant.css), dark overrides in staff.css.
 */
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { motion } from "motion/react";
import { SPRING } from "./motion";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

/**
 * Flat floating pill (84px total: 62px bar below a 22px strip the centre button rises into) with a
 * round NOTCH cut out of the top edge around the centre button. The cut ends above the label.
 * Notch: circle r=31 centred at (75,24) in a 150x84 box; it meets the top edge (y=22) at x=44.1 / 105.9.
 */
const NOTCH_FILL = "M0 22H44.1A31 31 0 0 0 105.9 22H150V84H0Z";
const NOTCH_EDGE = "M0 22.5H44.1A31 31 0 0 0 105.9 22.5H150";

export function BottomNavBar({ label, children, hidden = false }: { label: string; children: ReactNode; hidden?: boolean }) {
  return (
    <nav
      className={`ap-bnav fixed inset-x-2.5 max-[360px]:inset-x-1.5 bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-30 h-[84px] transition-transform duration-300 ease-out min-[768px]:hidden ${hidden ? "translate-y-[calc(100%+24px)]" : ""}`}
      aria-label={label}
      aria-hidden={hidden ? true : undefined}
    >
      {/* One continuous shape: left side + notched centre + right side; the glow follows the outline. */}
      <div className="pointer-events-none absolute inset-0 flex" aria-hidden="true">
        <span className="ap-bnav-side mt-[22px] flex-1 rounded-l-[31px] border border-r-0" />
        <svg className="relative z-[1] -mx-px h-[84px] w-[152px] shrink-0" viewBox="0 0 150 84" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ap-bnav-grad" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="84">
              <stop offset="0" className="ap-bnav-stop-top" />
              <stop offset="1" className="ap-bnav-stop-bottom" />
            </linearGradient>
          </defs>
          <path d={NOTCH_FILL} fill="url(#ap-bnav-grad)" />
          <path d={NOTCH_EDGE} className="ap-bnav-edge" fill="none" strokeWidth="1" />
          <path d="M0 83.5H150" className="ap-bnav-edge" fill="none" strokeWidth="1" />
        </svg>
        <span className="ap-bnav-side mt-[22px] flex-1 rounded-r-[31px] border border-l-0" />
      </div>
      <div className="relative z-[2] grid h-full grid-cols-5 items-end px-1.5 pb-1.5 max-[360px]:px-0.5">{children}</div>
    </nav>
  );
}

function Inner({ icon: Icon, label, active, center, quiet, dot, count, pillId }: { icon: Icon; label: string; active: boolean; center?: boolean; quiet?: boolean; dot?: boolean; count?: number; pillId: string }) {
  if (center) {
    return (
      <>
        {/* Positioned against the bar (the centre item is `static`). */}
        <span className={`ap-bnav-center absolute top-0 left-1/2 flex size-[48px] -translate-x-1/2 items-center justify-center rounded-full text-(--bnav-center-fg) ${active ? "ap-bnav-center-on" : ""} ${quiet ? "ap-bnav-center-quiet" : ""}`}>
          <Icon className="size-[22px]" aria-hidden="true" />
          {count ? (
            <span aria-hidden="true" className="bv-badge absolute -top-1 -right-1 [--bv-badge-ring:var(--bnav-bg)]">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </span>
        <span className="relative max-w-full truncate px-px">{label}</span>
        <span className="h-[2px] w-4 rounded-full bg-transparent" aria-hidden="true" />
      </>
    );
  }
  return (
    <>
      <span className="relative flex h-[34px] w-[54px] items-center justify-center rounded-[14px] max-[380px]:h-[32px] max-[380px]:w-[46px]">
        {active ? <motion.span layoutId={pillId} transition={SPRING} className="ap-bnav-pill absolute inset-0 rounded-[14px]" /> : null}
        <Icon className={`relative size-5 ${active ? "text-(--bnav-pill-fg)" : ""}`} aria-hidden="true" />
        {count ? (
          <span aria-hidden="true" className="bv-badge absolute top-[-4px] left-1/2 ml-[3px] [--bv-badge-ring:var(--bnav-bg)]">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate px-px">{label}</span>
      <span className={`h-[2px] w-4 rounded-full ${active ? "ap-bnav-line" : "bg-transparent"}`} aria-hidden="true" />
    </>
  );
}

const ITEM = "ap-bnav-item flex min-w-0 flex-col items-center justify-end gap-[2px] text-[clamp(9.5px,3vw,11px)] leading-none font-medium tracking-[.005em] max-[360px]:tracking-[-.01em]";

/** `quiet` (centre only): no call to action right now, so the button drops its glow. */
export function BottomNavLink({ href, active, center, ariaLabel, onClick, ...rest }: { href: string; icon: Icon; label: string; active: boolean; center?: boolean; quiet?: boolean; dot?: boolean; count?: number; ariaLabel?: string; onClick?: React.MouseEventHandler<HTMLAnchorElement>; pillId: string }) {
  return (
    <Link href={href} onClick={onClick} aria-label={ariaLabel} aria-current={active ? "page" : undefined} className={`${ITEM} ${center ? "static" : "relative"} ${active ? "font-bold text-(--bnav-fg-on)" : "text-(--bnav-fg)"}`}>
      <Inner active={active} center={center} {...rest} />
    </Link>
  );
}

export function BottomNavButton({ onClick, active, ...rest }: { onClick: () => void; icon: Icon; label: string; active: boolean; dot?: boolean; count?: number; pillId: string }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`${ITEM} relative ${active ? "font-bold text-(--bnav-fg-on)" : "text-(--bnav-fg)"}`}>
      <Inner active={active} {...rest} />
    </button>
  );
}


import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Phone sticky bottom action: one full-width pill button above the safe area (home indicator),
 * on a cream bar with a hairline on top. Pairs with BackHeader.
 *
 * Reusable across apps; colours come from CSS variables with neutral fallbacks:
 *   --mob-bar-bg     bar background          (default #FAF6EE)
 *   --mob-line       top hairline            (default #E6DDCB)
 *   --mob-brand      button fill             (default #2A0B47)
 *   --mob-on-brand   button text             (default #ffffff)
 *   --mob-disabled   disabled button fill    (default #D9D2C3)
 *   --mob-on-disabled disabled button text   (default #7d7566)
 *
 * Give it `href` (link) or `onClick` (button). `disabled` renders a clearly grey, non-pressable pill;
 * set `softDisabled` to keep the click live (so the handler can explain what is missing) while still
 * looking disabled and announcing aria-disabled. `hint` is one short line above the button
 * (e.g. "Add your CV to continue"). Phone only by default; the page renders its own desktop button.
 * It also renders an in-flow spacer so the last content is never hidden behind the bar.
 */
export function StickyActionBar({
  label,
  icon,
  href,
  onClick,
  disabled = false,
  softDisabled = false,
  hint,
  secondary,
  className = "",
}: {
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  softDisabled?: boolean;
  hint?: string;
  /** Optional small text button beside the main one (e.g. an icon-only Save). Keep it to one. */
  secondary?: ReactNode;
  className?: string;
}) {
  const off = disabled || softDisabled;
  const pill =
    "flex h-[52px] min-w-0 flex-1 items-center justify-between gap-3 rounded-full py-1.5 pr-1.5 text-left text-[16px] font-bold transition-[transform,background-color] active:scale-[.985] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mob-brand,#2A0B47)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mob-bar-bg,#FAF6EE)] " +
    (icon ? "pl-1.5 " : "pl-6 ") +
    (off
      ? "bg-[var(--mob-disabled,#D9D2C3)] text-[var(--mob-on-disabled,#7d7566)]"
      : "bg-[var(--mob-brand,#2A0B47)] text-[var(--mob-on-brand,#fff)]");
  // One button language: hero pill = icon disc + label + circular arrow (matches the Staff ActionPill).
  const disc = off ? "bg-black/8" : "bg-white/20";
  const content = (
    <>
      {icon ? <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${disc}`}>{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!off ? (
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${disc}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      ) : (
        <span className="w-4 shrink-0" aria-hidden="true" />
      )}
    </>
  );
  return (
    <>
      <div aria-hidden="true" className={`h-[calc(88px+env(safe-area-inset-bottom,0px))] min-[768px]:hidden`} />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--mob-line,#E6DDCB)] bg-[var(--mob-bar-bg,#FAF6EE)]/96 px-4 pt-3 backdrop-blur-md min-[768px]:hidden ${className}`}
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
      >
        {hint ? <p className="mb-2 text-center text-[13px] leading-snug text-[var(--mob-on-disabled,#7d7566)]">{hint}</p> : null}
        <div className="flex items-center gap-2.5">
          {secondary}
          {href && !disabled ? (
            <Link href={href} className={`${pill} text-[var(--mob-on-brand,#fff)]!`}>
              {content}
            </Link>
          ) : (
            <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} aria-disabled={off || undefined} className={pill}>
              {content}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

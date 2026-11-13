import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Phone inner-screen top bar: back arrow + short title (+ optional right-hand actions).
 *
 * Reusable across Applicant / Staff / Client / Admin. It has no brand colours of its own: it reads
 * CSS variables and falls back to neutral cream/ink, so each app can set them on its own wrapper
 *   --mob-bar-bg   bar background        (default #FAF6EE)
 *   --mob-ink      title / arrow colour  (default #1d1a16)
 *   --mob-line     bottom hairline       (default #E6DDCB)
 *
 * Phone only by default (hidden from 768px up, where the desktop shell has its own header).
 * Pass `href` for a link back, or `onBack` for a button (e.g. previous step of a form).
 * Put a progress bar or tabs under it through `children`.
 */
export function BackHeader({
  title,
  href,
  onBack,
  backLabel = "Back",
  titleAs = "p",
  right,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Use "h1" when this title is the page heading (the page has no other visible h1 on phones). */
  titleAs?: "h1" | "p";
  right?: ReactNode;
  /** Rendered directly under the bar inside the sticky area (progress bar, tabs). */
  children?: ReactNode;
  className?: string;
}) {
  const Title = titleAs;
  const arrow = (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
  const btn = "-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--mob-ink,#1d1a16)] active:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current";
  return (
    <header
      className={`sticky top-0 z-30 border-b border-[var(--mob-line,#E6DDCB)] bg-[var(--mob-bar-bg,#FAF6EE)] min-[768px]:hidden ${className}`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-14 items-center gap-1 px-4">
        {href ? (
          <Link href={href} aria-label={backLabel} className={btn}>
            {arrow}
          </Link>
        ) : (
          <button type="button" onClick={onBack} aria-label={backLabel} className={btn}>
            {arrow}
          </button>
        )}
        <Title className="m-0 min-w-0 flex-1 text-[17px] leading-tight font-semibold text-[var(--mob-ink,#1d1a16)] [text-wrap:balance]">{title}</Title>
        {right ? <div className="-mr-2 flex shrink-0 items-center">{right}</div> : null}
      </div>
      {children}
    </header>
  );
}

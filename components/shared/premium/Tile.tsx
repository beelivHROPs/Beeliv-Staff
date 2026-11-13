import Link from "next/link";
import type { ReactNode } from "react";
import { LIFT, SURFACE } from "./tones";

/**
 * A fixed-width tile for a horizontal row: optional ring (or any visual) on top, a title,
 * and ONE status word. Becomes a link when `href` is set (min 48px target).
 */
export function Tile({ title, status, visual, href, className = "" }: { title: string; status?: string; visual?: ReactNode; href?: string; className?: string }) {
  const cls = `flex min-h-28 w-36 shrink-0 snap-start flex-col items-start gap-2 rounded-[22px] p-4 text-left ${SURFACE} ${LIFT} ${href ? "focus-visible:ring-2 focus-visible:ring-(--ap-violet,#5b087b) focus-visible:outline-none" : ""} ${className}`;
  const body = (
    <>
      {visual}
      <span className="text-[15px] leading-snug font-bold text-(--ap-ink,#11111b)">{title}</span>
      {status ? <span className="text-[13px] font-semibold text-(--ap-muted,#686672)">{status}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Horizontal scrolling row of Tiles (snap, no visible scrollbar). */
export function TileRow({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden ${className}`}>
      {children}
    </div>
  );
}

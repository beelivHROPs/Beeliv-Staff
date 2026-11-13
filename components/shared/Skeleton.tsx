import type { ReactNode } from "react";

/**
 * Shared loading-skeleton primitives (all apps). ONE shimmer: the `.bv-sk` class in app/globals.css (solid
 * low-contrast tile + slow 1.6s sweep, tokens --sk-base / --sk-hi per app and theme, static under
 * prefers-reduced-motion). Blocks never carry real text; they only hold the size of what will replace them,
 * so nothing jumps when content arrives.
 *
 *   <SkeletonBusy label="jobs">   container: role=status, aria-busy, visually hidden "Loading jobs"
 *   <Skeleton className="h-4 w-1/2" />   one block (size + radius via className)
 *   <SkeletonText lines={3} />            paragraph lines
 *   <SkeletonAvatar size={40} />          round avatar
 *   <SkeletonCard className="h-[120px]" />  a whole card as ONE solid box of its real size
 *   <SkeletonJobCard />                   the shared JobCard (components/applicant/jobs/JobCard)
 */

export function Skeleton({ className = "", inverse = false }: { className?: string; inverse?: boolean }) {
  return <div aria-hidden="true" className={`bv-sk rounded-md ${inverse ? "animate-shimmer-inverse" : ""} ${className}`} />;
}

export function SkeletonBusy({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading {label}</span>
      {children}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "", lineClassName = "h-4" }: { lines?: number; className?: string; lineClassName?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`${lineClassName} ${i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <div aria-hidden="true" style={{ width: size, height: size }} className={`bv-sk shrink-0 rounded-full ${className}`} />;
}

/** A card-sized solid box. Give it the real card's height / padding via className; children (if any) only size it. */
export function SkeletonCard({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div aria-hidden="true" className={`bv-sk rounded-[18px] ${className}`}>
      {children ? <div className="invisible">{children}</div> : null}
    </div>
  );
}

/**
 * The shared JobCard as one solid box at its real size. Mirrors components/applicant/jobs/JobCard.tsx: 116 / 84 /
 * 68px image column, 19 / 17px title, company, location, chips row (inside the text column from 768px, full width
 * below), posted line, footer with border-top. The hidden placeholder children only provide the height.
 */
export function SkeletonJobCard() {
  return (
    <article aria-hidden="true" className="bv-sk rounded-[18px] p-5 max-[767px]:p-3.5">
      <div className="invisible grid grid-cols-[116px_minmax(0,1fr)] gap-x-5 max-[767px]:grid-cols-[84px_minmax(0,1fr)] max-[767px]:gap-x-3.5 max-[380px]:grid-cols-[68px_minmax(0,1fr)]">
        <div className="size-[116px] max-[767px]:size-[84px] max-[380px]:size-[68px]" />
        <div className="flex min-w-0 flex-col gap-[5px]">
          <div className="h-[23.75px] max-[767px]:h-[21.25px]" />
          <div className="h-[21px]" />
          <div className="h-[21px]" />
          <div className="mt-2 h-[30px] max-[767px]:hidden" />
        </div>
        <div className="col-span-full mt-3 h-7 min-[768px]:hidden" />
      </div>
      <div className="invisible mt-3 h-[19.5px]" />
      <div className="invisible mt-3 h-[42.5px] border-t" />
    </article>
  );
}

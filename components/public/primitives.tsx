import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Text wrapper that the loading skeleton turns into a soft placeholder block
 * (`.skel .ps-sk` in app/(public)/public-site.css). It has no styling on the
 * real page. Mirrors the `<span class="sk-t">` wrappers in the Skel-*.dc.html
 * boards.
 */
export function T({ children }: { children: ReactNode }) {
  return <span className="ps-sk">{children}</span>;
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ps-eb", className)}>
      <T>{children}</T>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="ps-chip">
      <T>{children}</T>
    </span>
  );
}

/** Wireframe-accurate scale helper: N px at 1440, scaled down to the 1024 breakpoint. */
export const u = (n: number) => `calc(${n}*var(--u))`;

/** Stagger delay (s) for the i-th sibling: 80ms steps. Server-safe. */
export const stagger = (i: number, base = 0) => base + i * 0.08;

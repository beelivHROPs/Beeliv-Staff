import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/applicant/icons";

/**
 * Calm section chrome for the redesigned Admin Home (sample). Used only by
 * components/admin/overview/*, so nothing else in Admin changes.
 *  - Desktop (768+): a thin-bordered 10px surface, no shadow.
 *  - Phone: no box at all; a hairline above, content on the page background.
 */
export const FLAT_BOX = "min-w-0 min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) min-[768px]:p-4";

export function Flat({ title, href, hrefLabel = "View all", action, className = "", children }: { title: string; href?: string; hrefLabel?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  const id = `ad-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`${FLAT_BOX} max-[767px]:border-t max-[767px]:border-(--ap-line) max-[767px]:pt-3.5 max-[767px]:pb-1 ${className}`}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3 min-[768px]:mb-2.5">
        <h2 id={id} className="truncate text-[14px] leading-tight font-semibold text-(--ap-ink)">
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
          {action}
          {href ? (
            <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-violet-2) max-[767px]:-my-3 max-[767px]:min-h-11 max-[767px]:items-center">
              {hrefLabel}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** One quiet line for "nothing here" (no illustration). */
export function FlatEmpty({ title, description }: { title: string; description: string }) {
  return (
    <p className="py-3 text-[13px] leading-[1.5] text-(--ap-muted)">
      <b className="font-semibold text-(--ap-ink-2)">{title}.</b> {description}
    </p>
  );
}

/** Hairline between list rows. */
export const rowLine = (i: number) => (i > 0 ? "border-t border-(--ap-line-2)" : "");

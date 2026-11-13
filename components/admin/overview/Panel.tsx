import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { EmptyArt, artFor } from "@/components/applicant/EmptyArt";

/** The one card every Overview section sits in, so panels share the same chrome. `action` sits beside the title (selector, count badge). */
export function Panel({ title, href, hrefLabel = "View all", action, className = "", children }: { title: string; href?: string; hrefLabel?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  const id = `ad-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`ap-card min-w-0 rounded-[18px] p-4.5 min-[768px]:p-5 ${className}`}>
      <div className="mb-3.5 flex min-w-0 items-center justify-between gap-3">
        <h2 id={id} className="flex min-w-0 items-center gap-2 text-[17px] leading-tight font-bold text-(--ap-ink)">
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
          {action}
          {href ? (
            <Link href={href} className="ap-hit inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-violet-2)">
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

/** Calm "nothing here" inside a panel (picture follows the icon, like the shared EmptyState). */
export function PanelEmpty({ icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
      <EmptyArt kind={artFor(icon)} className="h-[80px] w-[100px]" />
      <b className="text-[17px] text-(--ap-ink)">{title}</b>
      <p className="max-w-[36ch] text-[14px] leading-[1.5] text-(--ap-muted)">{description}</p>
    </div>
  );
}

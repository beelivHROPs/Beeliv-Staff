"use client";

import Link from "next/link";
import { JumpToAnchor } from "../JumpToAnchor";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/applicant/icons";
import { Reveal } from "@/components/applicant/motion";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * Header row shared by every analytics card: bold Karla title (operational
 * heading), optional muted subtitle, an optional "View ..." link and an
 * optional control (e.g. DateRangeSelector) on the right.
 */
export function ChartHeader({ id, title, subtitle, href, hrefLabel, right }: { id?: string; title: string; subtitle?: string; href?: string; hrefLabel?: string; right?: ReactNode }) {
  // Pilot menu: a "View ..." link to a later-stage screen is left out.
  const hidden = usePilotHidden();
  return (
    <div className="mb-3.5 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] leading-tight font-bold text-(--ap-ink)">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-(--ap-muted) max-[767px]:hidden">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {right}
        {href && !hidden(href) ? (
          <Link href={href} className="ap-hit inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-violet-2)">
            {hrefLabel ?? "View all"}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The one card every Client analytics section sits in, so pages never invent
 * their own chart chrome. Restrained: hairline border, subtle warm shadow on
 * hover only, scroll Reveal from the shared motion set.
 */
export function AnalyticsPanel({
  title,
  subtitle,
  href,
  hrefLabel,
  right,
  className = "",
  anchor,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  right?: ReactNode;
  className?: string;
  /** id for deep links: a link ending in #<anchor> scrolls straight to this card instead of the page top. */
  anchor?: string;
  children: ReactNode;
}) {
  const id = `ap-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Reveal as="section" id={anchor} aria-labelledby={id} className={`ap-card min-w-0 rounded-[18px] p-4.5 min-[768px]:p-5 ${anchor ? "scroll-mt-20" : ""} ${className}`}>
      {anchor ? <JumpToAnchor id={anchor} /> : null}
      <ChartHeader id={id} title={title} subtitle={subtitle} href={href} hrefLabel={hrefLabel} right={right} />
      {children}
    </Reveal>
  );
}

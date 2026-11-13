import Link from "next/link";
import { Check, ChevronRight } from "@/components/applicant/icons";
import type { AttentionItem } from "@/lib/client/types";
import { AnalyticsPanel, ChartEmptyState } from "../charts";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * "Requires your attention" (brief section 14): only things THIS client can
 * act on (feedback on candidates, documents, request updates, absences), each
 * one a link to where the action happens. Beeliv-internal HR tasks never
 * appear here. Items arrive from the backend's ClientOverview.attention.
 */
export function AttentionCard({ items: all, className = "" }: { items: AttentionItem[]; className?: string }) {
  // Pilot menu: items whose only target is a later-stage screen (absences, documents) are left out.
  const hidden = usePilotHidden();
  const items = all.filter((i) => !hidden(i.href));
  return (
    <AnalyticsPanel title="Requires your attention" className={className}>
      {items.length === 0 ? (
        <ChartEmptyState icon={Check} title="You're all caught up" description="Nothing needs your attention right now. We'll show it here the moment it does." height={150} />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.slice(0, 5).map((it, i) => {
            const urgent = it.kind === "absence" || it.kind === "documents";
            return (
              <li key={it.id} className={i > 0 ? "border-t border-(--ap-line-2)" : ""}>
                <Link href={it.href} className="flex min-h-14 items-center gap-3 py-2 min-[768px]:min-h-12">
                  <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${urgent ? "bg-(--ap-rose)" : "bg-(--ap-faint)"}`} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block text-[13.5px] font-semibold text-(--ap-ink)">{it.title}</b>
                    {it.detail ? <span className="mt-0.5 block truncate text-[12.5px] text-(--ap-muted)">{it.detail}</span> : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AnalyticsPanel>
  );
}

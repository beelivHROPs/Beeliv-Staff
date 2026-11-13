"use client";
/**
 * "Needs you today": a plain list, one row per thing waiting (count, label,
 * one link to the exact filtered list). Counts come from existing adapters
 * (Overview, offers, leave, client requests); rows with nothing waiting are
 * hidden. The only colour is a small dot on the row that is overdue/urgent.
 */
import Link from "next/link";
import { ChevronRight } from "@/components/applicant/icons";
import { useClientRequests } from "@/lib/admin/client-requests/hooks";
import { useLeave } from "@/lib/admin/workforce/hooks";
import { useOffers } from "@/lib/admin/offers/hooks";
import { docQueueHref, PEOPLE_APPLICANTS } from "@/lib/admin/links";
import type { HrOverview } from "@/lib/admin/types";
import { Flat, FlatEmpty, rowLine } from "./Flat";
import { usePilotHidden } from "@/lib/pilot/context";

export interface Need {
  key: string;
  label: string;
  count: number;
  href: string;
  action: string;
  urgent?: boolean;
}

export function useNeeds(ov: HrOverview): Need[] {
  const hidden = usePilotHidden();
  const offers = useOffers({ search: "", tab: "all", clientId: "", vacancyId: "" }).data;
  const leave = useLeave({ search: "", tab: "pending", clientId: "", outletId: "", type: "", pageSize: 1 }).data;
  const requests = useClientRequests({ search: "", tab: "new", clientId: "", limit: 1 }).data;
  const all: Need[] = [
    { key: "docs", label: "Documents to check", count: ov.metrics.documentationPending, href: docQueueHref("pending"), action: "Review", urgent: true },
    { key: "interviews", label: "Interviews today", count: ov.interviewsToday.length, href: "/admin/recruitment/interviews?status=pending", action: "See interviews" },
    { key: "apps", label: "Applications to review", count: ov.attention.filter((a) => a.kind === "applications").length, href: `${PEOPLE_APPLICANTS}&stage=application`, action: "Review" },
    { key: "offers", label: "Offers waiting", count: offers ? offers.tabCounts.draft + offers.tabCounts["pending-approval"] : 0, href: "/admin/recruitment/offers?tab=draft", action: "Open offers" },
    { key: "leave", label: "Leave requests", count: leave?.tabCounts.pending ?? 0, href: "/admin/workforce/leave?tab=pending", action: "Open leave" },
    { key: "requests", label: "Client requests", count: requests?.tabCounts.new ?? 0, href: "/admin/clients/requests?tab=new", action: "Open requests" },
  ];
  // Pilot menu: a row whose only target is a later-stage screen (Leave) is left out.
  return all.filter((n) => n.count > 0 && !hidden(n.href));
}

export function NeedsToday({ needs, className = "" }: { needs: Need[]; className?: string }) {
  return (
    <Flat title="Needs you today" className={className}>
      {needs.length === 0 ? (
        <FlatEmpty title="You are all caught up" description="Nothing is waiting for you right now." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {needs.map((n, i) => (
            <li key={n.key} className={rowLine(i)}>
              <Link href={n.href} className="group flex min-h-14 items-center gap-3 min-[768px]:min-h-11">
                <b className="w-8 shrink-0 text-right text-[20px] leading-none font-semibold text-(--ap-ink) tabular-nums min-[768px]:text-[18px]">{n.count}</b>
                <span className="min-w-0 flex-1 truncate text-[14px] text-(--ap-ink)">
                  {n.label}
                  {n.urgent ? <span aria-hidden="true" className="ml-2 inline-block size-1.5 rounded-full bg-(--ap-rose) align-middle" /> : null}
                </span>
                <span className="text-[12.5px] text-(--ap-muted) group-hover:text-(--ap-violet) max-[480px]:hidden">{n.action}</span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

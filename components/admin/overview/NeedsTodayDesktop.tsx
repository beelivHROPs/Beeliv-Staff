"use client";
/**
 * DESKTOP/TABLET (>=768px) Home: the OLD needs hook, kept as it was before the phone work
 * (no pilot-menu filter). The list component itself (NeedsToday) is unchanged and shared.
 */
import { useClientRequests } from "@/lib/admin/client-requests/hooks";
import { useLeave } from "@/lib/admin/workforce/hooks";
import { useOffers } from "@/lib/admin/offers/hooks";
import { docQueueHref, PEOPLE_APPLICANTS } from "@/lib/admin/links";
import type { HrOverview } from "@/lib/admin/types";
import type { Need } from "./NeedsToday";

export function useNeedsDesktop(ov: HrOverview): Need[] {
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
  return all.filter((n) => n.count > 0);
}

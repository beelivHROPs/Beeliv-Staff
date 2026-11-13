import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { StatusChip } from "@/components/client/StatusChip";
import type { OrgStatus } from "@/lib/admin/clients/types";

export const CLIENTS_HREF = "/admin/clients";
export const clientHref = (id: string) => `${CLIENTS_HREF}/${id}`;
export const clientTabHref = (id: string, tab: string) => `${CLIENTS_HREF}/${id}?tab=${tab}`;
export const outletHref = (clientId: string, outletId: string, tab?: string) => `${CLIENTS_HREF}/${clientId}/outlets/${outletId}${tab ? `?tab=${tab}` : ""}`;
export const clientRequestsHref = (clientId: string) => `/admin/clients/requests?client=${encodeURIComponent(clientId)}`;
export const outletSchedulingHref = (outletId: string) => `/admin/workforce/scheduling?outlet=${encodeURIComponent(outletId)}`;
/** Open vacancies list for a client. The Vacancies step owns the page; link only. */
export const clientVacanciesHref = (clientId: string) => `/admin/recruitment/vacancies?client=${encodeURIComponent(clientId)}&tab=open`;
export const vacancyHref = (id: string) => `/admin/recruitment/vacancies/${id}`;
export const createVacancyForHref = (clientId: string, outlet?: { id: string; name: string }) =>
  `/admin/recruitment/vacancies/new?client=${encodeURIComponent(clientId)}${outlet ? `&outlet=${encodeURIComponent(outlet.id)}&outletName=${encodeURIComponent(outlet.name)}` : ""}`;

const LABEL: Record<OrgStatus, string> = { invited: "Invited / onboarding", active: "Active", onboarding: "Onboarding", inactive: "Inactive" };
export const ORG_STATUS_OPTIONS: { key: "" | OrgStatus; label: string }[] = [
  { key: "", label: "All" },
  { key: "invited", label: "Invited" },
  { key: "active", label: LABEL.active },
  { key: "onboarding", label: LABEL.onboarding },
  { key: "inactive", label: LABEL.inactive },
];

/** Provisional status wording (needs Beeliv confirmation). Onboarding = pending (yellow). */
export function OrgStatusChip({ status }: { status: OrgStatus }) {
  return <StatusChip tone={status === "active" ? "ok" : status === "onboarding" || status === "invited" ? "warn" : "mute"}>{LABEL[status]}</StatusChip>;
}

/* ---------- assigned HR ---------- */

export const NO_HR_LINE = "Requests go to the Operations queue until an HR officer is assigned.";

/** Red attention chip for a client or outlet with no primary HR. */
export function NoHrChip() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-(--ap-rose-bg) pr-2.5 pl-1 text-[12px] font-bold whitespace-nowrap text-(--ap-rose)">
      <AttentionBadge className="size-4" halo={false} />
      No HR assigned
    </span>
  );
}

/** "Funke Sample (primary), Kelechi Sample" - names, not just a +N. Nothing assigned = the red flag. */
export function HrNames({ names, primary }: { names: string[]; primary: string | null }) {
  if (!primary) return <NoHrChip />;
  const text = names.map((n, i) => (i === 0 ? `${n} (primary)` : n)).join(", ");
  return (
    <span className="block min-w-0 truncate" title={text}>
      {text}
    </span>
  );
}

/** Phone detail pill (spec colours). Same statuses as OrgStatusChip. */
export function OrgStatusPill({ status }: { status: OrgStatus }) {
  return <PhonePill tone={pillTone(status === "active" ? "ok" : "warn")}>{LABEL[status]}</PhonePill>;
}

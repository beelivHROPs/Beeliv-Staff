import { PhonePill } from "@/components/admin/PhoneDetail";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { STATUS_LABEL, type RequestStatus } from "@/lib/admin/client-requests/types";

export const LIST_HREF = "/admin/clients/requests";
export const requestHref = (id: string) => `${LIST_HREF}/${id}`;
/** Links only: creating the vacancy is built by the Vacancies screens (reads ?requestId). */
export const createVacancyHref = (requestId: string) => `/admin/recruitment/vacancies/new?requestId=${requestId}`;
export const vacancyHref = (id: string) => `/admin/recruitment/vacancies/${id}`;

const TONE: Record<RequestStatus, ChipTone> = { new: "warn", "under-review": "info", "in-recruitment": "info", "candidates-submitted": "plum", fulfilled: "ok", declined: "mute" };

export function RequestStatusChip({ status }: { status: RequestStatus }) {
  return <StatusChip tone={TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
/** "2026-10-21" -> "21 Oct 2026" (date-only strings are read as local days). */
export const ymdText = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return fmt(new Date(y, m - 1, d));
};
export const sentText = (iso: string) => fmt(new Date(iso));
export const dateTime = (iso: string) => `${fmt(new Date(iso))}, ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
export const clientText = (r: { client: string; outlet: string | null }) => (r.outlet && r.outlet !== r.client ? `${r.client}, ${r.outlet}` : r.client);

/** Phone detail pill (spec colours): fulfilled mint, declined rose, the rest sand. */
export function RequestStatusPill({ status }: { status: RequestStatus }) {
  return <PhonePill tone={status === "fulfilled" ? "ok" : status === "declined" ? "bad" : "wt"}>{STATUS_LABEL[status]}</PhonePill>;
}

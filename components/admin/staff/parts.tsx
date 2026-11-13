"use client";

/**
 * Small shared pieces for the Staff and Clients & Outlets screens. Built on the
 * Client app's StatusChip / ClientAvatar / states / SearchField; only what the
 * Client app does not already have lives here (URL-param filters, Card + Facts,
 * the "needs Beeliv confirmation" note, an Admin-safe restricted state).
 */
import { useCallback, type ReactNode } from "react";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { useSearchParams } from "next/navigation";
import { LockKeyhole } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { StatusChip } from "@/components/client/StatusChip";
import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";
import { ClientPageError, ClientPageSkeleton } from "@/components/client/states";
import type { LoadStatus } from "@/lib/admin/types";
import type { DocState, StaffStatus } from "@/lib/admin/staff/types";

/** Filters live in the URL (replaceState: no refetch of the page, no back-button spam). */
export function useUrlParams() {
  const sp = useSearchParams();
  const get = useCallback((key: string) => sp.get(key) ?? "", [sp]);
  const set = useCallback((patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, []);
  return { get, set };
}

export function Card({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${CARD} min-w-0 ${className}`}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="ap-serif text-[18px] leading-tight">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Label / value pairs that reflow 1 -> 2 columns by container width and never clip. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 @min-[520px]:grid-cols-2">
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">{f.label}</dt>
          <dd className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink)">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Marks a rule the spec does not state. A small muted note, not a warning: it is pending information, not a problem. */
export function NeedsConfirmation({ children }: { children: ReactNode }) {
  if (!SHOW_PROTOTYPE_CONTROLS) return null;
  return <p className="text-[12px] leading-snug text-(--ap-muted)">{children}</p>;
}

const STATUS_LABEL: Record<StaffStatus, string> = { active: "Active", "on-leave": "On leave", suspended: "Suspended" };
export const STAFF_STATUS_OPTIONS: { key: "" | StaffStatus; label: string }[] = [
  { key: "", label: "All" },
  { key: "active", label: STATUS_LABEL.active },
  { key: "on-leave", label: STATUS_LABEL["on-leave"] },
  { key: "suspended", label: STATUS_LABEL.suspended },
];
export function StaffStatusChip({ status }: { status: StaffStatus }) {
  return <StatusChip tone={status === "active" ? "ok" : status === "on-leave" ? "info" : "bad"}>{STATUS_LABEL[status]}</StatusChip>;
}

export const DOC_STATE: Record<DocState, { label: string; tone: "ok" | "warn" | "bad" | "info" | "mute" }> = {
  missing: { label: "Missing", tone: "warn" },
  uploaded: { label: "Uploaded", tone: "info" },
  "needs-review": { label: "Needs review", tone: "warn" },
  resubmitted: { label: "Resubmitted", tone: "warn" },
  verified: { label: "Verified", tone: "ok" },
  rejected: { label: "Rejected", tone: "bad" },
};
export function DocStateChip({ state }: { state: DocState }) {
  const d = DOC_STATE[state];
  return <StatusChip tone={d.tone}>{d.label}</StatusChip>;
}

/** Restricted (403 / RLS) state that does not point at the Client support page. */
export function RestrictedPanel({ what }: { what: string }) {
  return (
    <div className={`${CARD} p-6 min-[768px]:p-8`}>
      <EmptyState icon={LockKeyhole} title="Not available for this account" description={`${what} is outside your access. Ask Beeliv Operations if you think this is wrong.`} />
    </div>
  );
}

/** loading / error / restricted for an Admin page. Renders children for ready / empty (the caller handles empty). */
export function AdminState({ status, title, what, retry, children }: { status: LoadStatus; title: string; what: string; retry: () => void; children: ReactNode }) {
  if (status === "loading") return <ClientPageSkeleton title={title} layout="list" />;
  if (status === "error") return <ClientPageError title={title} what={what} retry={retry} />;
  if (status === "restricted") return <RestrictedPanel what={what} />;
  return <>{children}</>;
}

export const ANY = "__any";
export const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];

/* ---------- links (route contract) ---------- */
export const STAFF_DIRECTORY_HREF = "/admin/staff/directory";
export const staffHref = (id: string) => `${STAFF_DIRECTORY_HREF}/${id}`;
export const outletStaffHref = (outletId: string) => `${STAFF_DIRECTORY_HREF}?outlet=${encodeURIComponent(outletId)}`;
export const clientStaffHref = (clientId: string) => `${STAFF_DIRECTORY_HREF}?client=${encodeURIComponent(clientId)}`;
export const reassignHref = (staffId: string) => `/admin/staff/assignments?reassign=${encodeURIComponent(staffId)}`;
/** The shared document viewer (built by the Documentation step). Link only. */
export const documentViewerHref = (docId: string) => `/admin/recruitment/documentation/${docId}`;

/** Phone detail pill (spec colours). Same statuses as StaffStatusChip. */
export function StaffStatusPill({ status }: { status: StaffStatus }) {
  return <PhonePill tone={pillTone(status === "active" ? "ok" : status === "on-leave" ? "info" : "bad")}>{STATUS_LABEL[status]}</PhonePill>;
}

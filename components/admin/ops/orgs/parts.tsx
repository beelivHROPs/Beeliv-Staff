"use client";

/**
 * Small shared pieces for the Operations "Clients & Outlets" and "Staff
 * Assignments" screens: route helpers, one grouped container with a small
 * heading, label / value rows, a staff row and the invitation chip. Built on
 * the Operations kit (one container style, hairline dividers, no nested cards).
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { ChevronRight } from "@/components/applicant/icons";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { GROUP, GROUP_HEAD, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import type { InviteState, OpsStaffOnSite } from "@/lib/admin/ops/opsclients-types";
import type { StaffStatus } from "@/lib/admin/staff/types";
import "./orgs.css";

export const OPS_CLIENTS_HREF = "/admin/ops/clients";
export const opsClientHref = (id: string) => `${OPS_CLIENTS_HREF}/${id}`;
export const opsOutletHref = (clientId: string, outletId: string) => `${OPS_CLIENTS_HREF}/${clientId}/outlets/${outletId}`;
export const OPS_STAFF_HREF = "/admin/ops/staff";
export const opsStaffHref = (id: string) => `${OPS_STAFF_HREF}/${id}`;
export const opsStaffOfClientHref = (clientId: string) => `${OPS_STAFF_HREF}?client=${encodeURIComponent(clientId)}`;

/** The one container, with its small heading above (and an optional quiet action at the right of the heading). */
export function Block({ title, right, note, children }: { title: string; right?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <h2 className={`${GROUP_HEAD} mb-0`}>{title}</h2>
        {right}
      </div>
      <div className={GROUP}>{children}</div>
      {note ? <p className={`mt-2 px-1 ${MUTED_NOTE}`}>{note}</p> : null}
    </section>
  );
}

/** One label / value row inside a Block (56px, wraps instead of cutting text). */
export function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 px-4 py-2 ${ROW_LINE}`}>
      <dt className="text-[14px] text-(--ap-muted)">{label}</dt>
      <dd className="m-0 min-w-0 text-right text-[14.5px] leading-snug break-words text-(--ap-ink)">{children}</dd>
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-4 py-4 text-[14px] leading-snug text-(--ap-muted)">{children}</p>;
}

const INVITE: Record<InviteState, { label: string; tone: ChipTone }> = {
  accepted: { label: "Accepted", tone: "ok" },
  sent: { label: "Invitation sent", tone: "warn" },
  expired: { label: "Expired", tone: "bad" },
  "not-sent": { label: "Not sent yet", tone: "mute" },
};
export const InviteChip = ({ state }: { state: InviteState }) => <StatusChip tone={INVITE[state].tone}>{INVITE[state].label}</StatusChip>;

const STAFF_STATUS: Record<StaffStatus, { label: string; tone: ChipTone }> = { active: { label: "Active", tone: "ok" }, "on-leave": { label: "On leave", tone: "info" }, suspended: { label: "Suspended", tone: "bad" } };
export const StaffStateChip = ({ status }: { status: StaffStatus }) => <StatusChip tone={STAFF_STATUS[status].tone}>{STAFF_STATUS[status].label}</StatusChip>;

/** A staff member on a client / outlet page: opens the Operations staff page (not the HR directory). */
export function SiteStaffRow({ s, showOutlet = false }: { s: OpsStaffOnSite; showOutlet?: boolean }) {
  return (
    <li className={`ad-clickrow flex min-h-14 items-center gap-3 px-3.5 py-2 hover:bg-(--ap-tint-soft) ${ROW_LINE}`}>
      <AdminAvatar name={s.name} size={36} />
      <div className="min-w-0 flex-1">
        <Link href={opsStaffHref(s.id)} className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">
          {s.name}
        </Link>
        <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">{showOutlet ? `${s.role} · ${s.outlet}` : s.role}</span>
      </div>
      {s.status !== "active" ? <StaffStateChip status={s.status} /> : null}
      <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
    </li>
  );
}

/** Staff of one outlet, five at a time. */
export function SiteStaffList({ staff, showOutlet }: { staff: OpsStaffOnSite[]; showOutlet?: boolean }) {
  const [n, setN] = useState(5);
  return (
    <>
      <ul className="m-0 list-none p-0">
        {staff.slice(0, n).map((s) => (
          <SiteStaffRow key={s.id} s={s} showOutlet={showOutlet} />
        ))}
      </ul>
      {staff.length > n ? (
        <button type="button" onClick={() => setN((v) => v + 5)} className="ap-hit flex min-h-12 w-full items-center justify-center border-t border-(--ap-line-2) text-[14px] font-semibold text-(--ap-violet) hover:bg-(--ap-tint-soft)">
          Show {Math.min(5, staff.length - n)} more
        </button>
      ) : null}
    </>
  );
}

export function PageSkeleton({ label, blocks = 3 }: { label: string; blocks?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex max-w-[980px] flex-col gap-4 pt-4">
      <div className="ap-shimmer h-9 w-64 rounded-[14px]" />
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="ap-shimmer h-28 rounded-[14px]" />
      ))}
    </div>
  );
}

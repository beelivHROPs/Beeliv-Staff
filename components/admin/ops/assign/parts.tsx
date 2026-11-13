"use client";

/** Small pieces shared by the Clients & HR list and detail. */
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import type { AssignmentRow, HrOfficer } from "@/lib/admin/ops/assignments-types";

export const ASSIGNMENTS_HREF = "/admin/ops/assignments";
export const assignmentHref = (clientId: string) => `${ASSIGNMENTS_HREF}/${clientId}`;
export const clientRecordHref = (clientId: string) => `/admin/clients/${clientId}`;

export function NoHrChip() {
  return <StatusChip tone="bad">No HR assigned</StatusChip>;
}

export function ClientStatusChip({ row }: { row: Pick<AssignmentRow, "statusLabel" | "statusTone"> }) {
  return <StatusChip tone={row.statusTone as ChipTone}>{row.statusLabel}</StatusChip>;
}

/** The HR officer's avatar, or a dashed empty circle when nobody is assigned. */
export function HrAvatar({ hr, size = 40 }: { hr: HrOfficer | null; size?: number }) {
  if (hr) return <AdminAvatar name={hr.name} photoUrl={hr.photoUrl} size={size} />;
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-(--ap-rose) text-[15px] text-(--ap-rose)" style={{ width: size, height: size }}>
      ?
    </span>
  );
}

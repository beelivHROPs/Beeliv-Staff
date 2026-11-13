import type { ReactNode } from "react";
import { dayMonth, longDate } from "@/lib/staff/format";
import type { LeaveRequest, LeaveStatus } from "@/lib/staff/types";
import { Dot } from "../kit";

/** Status is a small dot plus a word everywhere (same words as the Leave list). */
const CHIPS: Record<LeaveStatus, ReactNode> = {
  approved: <Dot tone="ok">Approved</Dot>,
  pending: <Dot tone="warn">Waiting</Dot>,
  rejected: <Dot tone="rose">Not approved</Dot>,
  cancelled: <Dot tone="mute">Cancelled</Dot>,
};
export const LeaveStatusChip = ({ status }: { status: LeaveStatus }) => <>{CHIPS[status]}</>;

export function rangeLabel(l: Pick<LeaveRequest, "startDate" | "endDate">): string {
  return l.startDate === l.endDate ? longDate(l.startDate) : `${dayMonth(l.startDate)} - ${dayMonth(l.endDate)}`;
}

/**
 * DEV FIXTURE - leave types must come from backend configuration after Beeliv
 * confirms them (brief section 9: "do not hard-code ... leave entitlement").
 * These labels only let the form work now; replace with a service call
 * (e.g. getLeaveTypes()) when the backend adapter exists.
 */
export const LEAVE_TYPE_OPTIONS: string[] = ["Annual leave", "Personal leave", "Sick leave", "Other"];

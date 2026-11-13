"use client";

/** Small pieces shared by the Staff Assignments list, detail and sheet. */
import { StatusChip } from "@/components/client/StatusChip";
import { formatDate } from "@/lib/applicant/time";
import type { StaffPlacement } from "@/lib/admin/ops/staffassign-types";

export const UnassignedChip = () => <StatusChip tone="warn">Unassigned</StatusChip>;

/** "12 Mar 2026 to 3 Aug 2026", or "since 12 Mar 2026" for the current one. */
export const rangeText = (p: Pick<StaffPlacement, "start" | "end">) => (p.end ? `${formatDate(p.start)} to ${formatDate(p.end)}` : `Since ${formatDate(p.start)}`);

/** The wording for rules the spec does not state. Small and muted: it is pending information, not a problem. */
export const RULES_NOTE = "Whether a reassignment needs approval, which dates are allowed and who is told needs Beeliv confirmation. For now it takes effect as soon as you confirm.";

import type { WorkforceRequestStatus } from "@/lib/client/types";
import { StatusChip, type ChipTone } from "../StatusChip";

/** Client-facing names for the request's own status (a Workforce Request, never a published vacancy). */
export const REQUEST_STATUS_LABEL: Record<WorkforceRequestStatus, string> = {
  submitted: "Submitted",
  "under-review": "Under review",
  "in-recruitment": "Recruitment in progress",
  "candidates-submitted": "Candidates ready for review",
  closed: "Closed",
};
const TONE: Record<WorkforceRequestStatus, ChipTone> = { submitted: "info", "under-review": "info", "in-recruitment": "mute", "candidates-submitted": "plum", closed: "mute" };

export const REQUEST_STEPS: WorkforceRequestStatus[] = ["submitted", "under-review", "in-recruitment", "candidates-submitted"];

/** Phone: ONE word per status. */
export const REQUEST_STATUS_WORD: Record<WorkforceRequestStatus, string> = {
  submitted: "Submitted",
  "under-review": "Review",
  "in-recruitment": "Recruiting",
  "candidates-submitted": "Ready",
  closed: "Closed",
};

export function RequestStatusChip({ status }: { status: WorkforceRequestStatus }) {
  return <StatusChip tone={TONE[status]}>{REQUEST_STATUS_LABEL[status]}</StatusChip>;
}

/** Phone variant: one word. */
export function RequestStatusWord({ status }: { status: WorkforceRequestStatus }) {
  return <StatusChip tone={TONE[status]}>{REQUEST_STATUS_WORD[status]}</StatusChip>;
}

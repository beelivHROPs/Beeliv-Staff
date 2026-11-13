import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { DECISION_LABEL, STATUS_LABEL, type ClientDecision, type SubmissionStatus } from "@/lib/admin/client-review/types";

export const clientReviewHref = (id: string) => `/admin/recruitment/client-review/${id}`;
export const LIST_HREF = "/admin/recruitment/client-review";

/** Tones match the Client app's FeedbackChip (components/client/recruitment/meta.tsx): awaiting = plum, interested = ok, interview = info, not suitable = mute. */
const DECISION_TONE: Record<ClientDecision, ChipTone> = { awaiting: "plum", interested: "ok", "interview-requested": "info", "not-suitable": "mute" };
const STATUS_TONE: Record<SubmissionStatus, ChipTone> = { ready: "warn", submitted: "info", withdrawn: "mute", returned: "mute" };

/** The chip a row shows: the client's decision while the submission is live, otherwise the closed state. */
export function ReviewChip({ status, decision }: { status: SubmissionStatus; decision: ClientDecision }) {
  if (status === "submitted") return <StatusChip tone={DECISION_TONE[decision]}>{DECISION_LABEL[decision]}</StatusChip>;
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

export const submittedOn = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not submitted");
export const dateTime = (iso: string) => `${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
export const daysText = (n: number) => (n === 0 ? "Today" : n === 1 ? "1 day" : `${n} days`);

import type { CandidateFeedback, PositionState } from "@/lib/client/types";
import { StatusChip, type ChipTone } from "../StatusChip";

export const FEEDBACK_LABEL: Record<CandidateFeedback, string> = {
  interested: "Interested",
  "not-suitable": "Not suitable",
  "interview-requested": "Interview requested",
};
const FEEDBACK_TONE: Record<CandidateFeedback, ChipTone> = { interested: "ok", "not-suitable": "mute", "interview-requested": "info" };

/** null feedback = Beeliv is waiting for the Client. */
export function FeedbackChip({ feedback }: { feedback: CandidateFeedback | null }) {
  return feedback ? <StatusChip tone={FEEDBACK_TONE[feedback]}>{FEEDBACK_LABEL[feedback]}</StatusChip> : <StatusChip tone="plum">Awaiting your feedback</StatusChip>;
}

export const POSITION_STATE_TONE: Record<PositionState, ChipTone> = { "candidates-ready": "plum", screening: "info", "in-progress": "mute" };

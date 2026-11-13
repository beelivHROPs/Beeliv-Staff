/**
 * Plain-words copy for every upload state. Pure so the wording rules can be tested:
 *  - "checking" is never called clean, verified, approved or reviewed;
 *  - nothing blames the person for a service problem;
 *  - nothing says "uploaded" or "done" before the server has accepted the bytes.
 */
import { rejectText } from "./policy";
import type { RejectReason, UploadSlot, UploadState } from "./types";

export type Tone = "mute" | "info" | "ok" | "warn" | "error";
export type ActionKind = "retry" | "choose-file" | "choose-again" | "cancel" | "dismiss";

export interface StateCopy {
  /** Short status chip. */
  chip: string;
  tone: Tone;
  /** One or two plain sentences under the file name. */
  detail: string;
  /** Spoken to screen readers when the state kind changes. No percentages, so it is not chatty. */
  live: string;
  /** Show a progress bar: a number (0..1) is determinate. */
  progress?: number;
  actions: { kind: ActionKind; label: string; primary?: boolean }[];
}

export const SLOT_LABEL: Readonly<Record<UploadSlot, string>> = {
  cv: "CV",
  "passport-photo": "passport photo",
  "valid-id": "valid ID",
};

function waitText(seconds?: number): string {
  if (!seconds || seconds <= 0) return "a little while";
  if (seconds < 90) return "a minute";
  return `${Math.ceil(seconds / 60)} minutes`;
}

export function describeState(slot: UploadSlot, state: UploadState): StateCopy | null {
  const label = SLOT_LABEL[slot];
  switch (state.kind) {
    case "idle":
      return null;
    case "validating":
      return { chip: "Reading", tone: "mute", detail: "Looking at your file.", live: `Reading your ${label}.`, actions: [] };
    case "requesting":
      return { chip: "Starting", tone: "mute", detail: "Getting ready to send your file.", live: `Getting ready to send your ${label}.`, actions: [{ kind: "cancel", label: "Cancel" }] };
    case "uploading":
      return {
        chip: `${Math.round(state.progress * 100)}%`,
        tone: "info",
        detail: "Sending your file. Keep this page open.",
        live: `Sending your ${label}.`,
        progress: state.progress,
        actions: [{ kind: "cancel", label: "Cancel" }],
      };
    case "finishing":
      return { chip: "Sent", tone: "info", detail: "Your file arrived. Handing it over for checking.", live: `Your ${label} arrived. Handing it over for checking.`, progress: 1, actions: [] };
    case "checking":
      return {
        chip: "Checking",
        tone: "info",
        detail: "We're checking your file. Beeliv hasn't reviewed it yet.",
        live: `Your ${label} was sent and is being checked.`,
        actions: [{ kind: "choose-file", label: "Replace" }],
      };
    case "in-review":
      return {
        chip: "Under review",
        tone: "ok",
        detail: "Your file has been submitted for review.",
        live: `Your ${label} has been submitted for review.`,
        actions: [{ kind: "choose-file", label: "Replace" }],
      };
    case "interrupted": {
      const offline = state.cause === "offline";
      return {
        chip: "Stopped",
        tone: "warn",
        detail: offline ? "You're offline. Try again when you're back online." : "The upload stopped before it finished. Nothing was lost on your side.",
        live: offline ? `You're offline. Your ${label} did not finish sending.` : `The upload of your ${label} stopped.`,
        actions: [{ kind: "retry", label: state.needsFile ? "Choose the same file" : "Try again", primary: true }, { kind: "choose-again", label: "Start again" }],
      };
    }
    case "rejected":
      return {
        chip: "Not accepted",
        tone: "error",
        detail: rejectText(slot, state.reason),
        live: `Your ${label} was not accepted. ${rejectText(slot, state.reason)}`,
        actions: state.previous
          ? [{ kind: "dismiss", label: "Keep my current file", primary: true }, { kind: "choose-file", label: "Choose another file" }]
          : [{ kind: "choose-file", label: "Choose another file", primary: true }],
      };
    case "expired":
      return {
        chip: "Timed out",
        tone: "warn",
        detail: "This upload took too long and timed out. Choose your file again to start fresh.",
        live: `The upload of your ${label} timed out.`,
        actions: [{ kind: "choose-again", label: "Choose file again", primary: true }],
      };
    case "unavailable": {
      const detail =
        state.reason === "rate-limited"
          ? `Too many uploads. Try again in ${waitText(state.retryAfterSeconds)}.`
          : state.reason === "signed-out"
            ? "Your session ended. Sign in again to continue. Nothing else you entered is lost."
            : "Uploads aren't available right now. Nothing else you entered is lost. Try again in a little while.";
      return {
        chip: "Not available",
        tone: "warn",
        detail,
        live: `Your ${label} could not be sent. ${detail}`,
        actions: state.attempt ? [{ kind: "retry", label: "Try again", primary: true }, { kind: "choose-again", label: "Start again" }] : [],
      };
    }
    case "unknown-outcome":
      return {
        chip: "Not confirmed",
        tone: "warn",
        detail: "We couldn't confirm this upload. It may have gone through. Check again and we'll use the same upload, so nothing is duplicated.",
        live: `We could not confirm the upload of your ${label}.`,
        actions: [{ kind: "retry", label: state.needsFile ? "Choose the same file" : "Check again", primary: true }, { kind: "choose-again", label: "Start again" }],
      };
  }
}

/** Extra line shown when the last pick did not change the slot. */
export function noticeText(slot: UploadSlot, notice: RejectReason): string {
  return rejectText(slot, notice);
}

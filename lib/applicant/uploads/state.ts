/**
 * Pure state machine for one upload slot. No React, no network, no clock, no storage:
 * give it a state and an event, get the next state. Events that make no sense for the
 * current state (a late reply after Cancel, a double click) return the same state object.
 */
import type { RejectReason, SentState, UploadAttempt, UploadEvent, UploadFailure, UploadStage, UploadState } from "./types";
import { BUSY_KINDS } from "./types";

export const IDLE: UploadState = Object.freeze({ kind: "idle" }) as UploadState;

/** The attempt (ids and file facts) a state carries, if any. */
export function attemptOf(state: UploadState): UploadAttempt | undefined {
  return "attempt" in state ? state.attempt : undefined;
}

export function isBusy(state: UploadState): boolean {
  return BUSY_KINDS.includes(state.kind);
}

function sentOf(state: UploadState): SentState | undefined {
  return state.kind === "checking" || state.kind === "in-review" ? state : undefined;
}

function fromFailure(state: UploadState, stage: UploadStage, failure: UploadFailure): UploadState {
  const attempt = attemptOf(state);
  if (!attempt) return state;
  const fileName = attempt.fileName;
  const reject = (reason: RejectReason): UploadState => ({ kind: "rejected", reason, fileName, attempt, local: false });
  switch (failure.code) {
    case "outcome_unknown":
      // Keep the ORIGINAL ids. Whatever the server did, a retry asks it again with the same command.
      return { kind: "unknown-outcome", attempt, stage: stage === "complete" ? "complete" : "request", needsFile: false };
    case "rate_limited":
      return { kind: "unavailable", reason: "rate-limited", stage, attempt, needsFile: false, retryAfterSeconds: failure.retryAfterSeconds };
    case "unauthenticated":
      return { kind: "unavailable", reason: "signed-out", stage, attempt, needsFile: false };
    case "expired":
      return { kind: "expired", attempt };
    case "invalid_request": {
      const f = failure.fields ?? {};
      if ("size" in f) return reject("size");
      if ("fileName" in f || "contentType" in f) return reject("type");
      return reject("server-invalid");
    }
    case "no_access":
      return reject("denied");
    case "limit_reached":
      return reject("limit");
    case "conflict":
      return reject("conflict");
    case "unavailable":
    default:
      return { kind: "unavailable", reason: "unavailable", stage, attempt, needsFile: false };
  }
}

export function transition(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case "reset":
      // Dismissing a refused replacement falls back to the file that was already with the server.
      if (state.kind === "rejected" && state.previous) return state.previous;
      return IDLE;

    case "validate-start":
      if (isBusy(state)) return state;
      return { kind: "validating", fileName: event.fileName, size: event.size, previous: sentOf(state) ?? (state.kind === "rejected" ? state.previous : undefined) };

    case "validate-failed": {
      if (isBusy(state) && state.kind !== "validating") return state;
      const previous = state.kind === "validating" ? state.previous : sentOf(state) ?? (state.kind === "rejected" ? state.previous : undefined);
      return { kind: "rejected", reason: event.reason, fileName: event.fileName, local: true, previous };
    }

    case "request-start":
      if (state.kind === "requesting" || state.kind === "uploading" || state.kind === "finishing") return state;
      return { kind: "requesting", attempt: event.attempt };

    case "request-ok":
      if (state.kind !== "requesting") return state;
      return { kind: "uploading", attempt: { ...state.attempt, uploadId: event.uploadId }, progress: 0 };

    case "progress":
      if (state.kind !== "uploading") return state;
      return { ...state, progress: Math.min(1, Math.max(0, event.fraction)) };

    case "bytes-sent":
      if (state.kind !== "uploading") return state;
      return { kind: "finishing", attempt: state.attempt };

    case "complete-retry":
      if ((state.kind === "unknown-outcome" && state.stage === "complete") || (state.kind === "unavailable" && state.stage === "complete" && state.attempt?.uploadId)) {
        return { kind: "finishing", attempt: state.attempt! };
      }
      return state;

    case "complete-ok":
      if (state.kind !== "finishing") return state;
      return { kind: "checking", attempt: state.attempt };

    case "failure": {
      const expected = event.stage === "request" ? state.kind === "requesting" : state.kind === "finishing";
      return expected ? fromFailure(state, event.stage, event.failure) : state;
    }

    case "lost-reply": {
      const expected = event.stage === "request" ? state.kind === "requesting" : state.kind === "finishing";
      if (!expected) return state;
      return { kind: "unknown-outcome", attempt: attemptOf(state)!, stage: event.stage, needsFile: false };
    }

    case "put-failed": {
      if (state.kind !== "uploading") return state;
      const { attempt } = state;
      if (event.cause === "expired") return { kind: "expired", attempt };
      if (event.cause === "denied") return { kind: "unavailable", reason: "unavailable", stage: "request", attempt, needsFile: false };
      return { kind: "interrupted", attempt, cause: event.cause, needsFile: false };
    }

    case "status": {
      const sent = sentOf(state);
      if (!sent) return state;
      if (event.status === "rejected") return { kind: "rejected", reason: "scan-failed", fileName: sent.attempt.fileName, attempt: sent.attempt, local: false };
      if (event.status === "accepted") return state.kind === "in-review" ? state : { kind: "in-review", attempt: sent.attempt };
      return state;
    }

    case "hydrate": {
      if (state.kind !== "idle") return state;
      const { attempt, stage } = event;
      if (stage === "checking") return { kind: "checking", attempt };
      if (stage === "in-review") return { kind: "in-review", attempt };
      // A refresh lost the bytes (and the signed URL, which is never saved). The answer to the
      // last command is unknown, so keep the ids and wait for the person to retry.
      if (stage === "complete") return { kind: "unknown-outcome", attempt, stage: "complete", needsFile: false };
      return { kind: "unknown-outcome", attempt, stage: "request", needsFile: true };
    }
  }
}

/** Stage a state should be remembered at (for resume), or null when nothing should be kept. */
export function persistStage(state: UploadState): "request" | "bytes" | "complete" | "checking" | "in-review" | null {
  switch (state.kind) {
    case "requesting":
      return "request";
    case "uploading":
      return "bytes";
    case "finishing":
      return "complete";
    case "checking":
      return "checking";
    case "in-review":
      return "in-review";
    case "interrupted":
      return "bytes";
    case "unknown-outcome":
      return state.stage === "complete" ? "complete" : "request";
    case "unavailable":
      if (!state.attempt) return null;
      return state.stage === "complete" ? "complete" : "request";
    default:
      return null;
  }
}

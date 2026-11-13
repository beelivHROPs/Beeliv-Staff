"use client";

/**
 * MOCK BRIDGE between the Applicant and Admin mocks for "Can't make this time"
 * (docs/contracts/interviews-and-application-journeys.md, decision 2). Same idea
 * as the resubmission bridge: both apps run in one browser and share this one
 * localStorage key. The real backend replaces it with a server-side request on
 * the interview, an Inbox case for the assigned HR, and a notification row.
 *
 * Flow:
 *   1. Applicant sends the sheet           -> addRequest()          (status "open")
 *   2. Admin Inbox shows the case          -> readRequests()
 *   3. HR reschedules or cancels in Admin  -> resolveRequest()      (status "rescheduled" / "cancelled")
 *   4. Applicant mock absorbs the outcome  -> markApplied()         (new time + notification)
 *   (or) the candidate withdraws           -> withdrawRequest()     (status "withdrawn"; HR's case closes)
 *
 * It never changes an interview by itself: only HR's reschedule or cancel does.
 * Only the reason, note, the time asked about and the outcome cross over.
 * Every storage call is wrapped; when storage is unavailable the bridge simply does nothing.
 */
import { useMemo, useSyncExternalStore } from "react";

const KEY = "beeliv-interview-requests-v1";
const EVENT = "bv-interview-requests-change";

export interface InterviewOutcome {
  /** ISO time of the new slot (rescheduled only). */
  scheduledAt?: string;
  durationMinutes?: number;
  mode?: string;
  withWhom?: string;
  meetingLink?: string;
  /** HR's reason for the change, as kept in the interview history (INTERNAL: never shown to the candidate). */
  reason: string | null;
  /**
   * A reason HR chose to share with the candidate (plain text). Shown on a cancelled card.
   * The Admin cancel dialog has no such field yet, so this stays empty until the backend adds one.
   */
  publicReason?: string | null;
  decidedAt: string;
}

export interface InterviewTimeRequest {
  id: string;
  /** Id of the interview in the Applicant mock. */
  interviewRef: string;
  title: string;
  applicationLabel: string;
  applicantName: string;
  /** For the HR reply by email. Optional. */
  applicantEmail?: string;
  /** The time the candidate was asked to attend and cannot make. */
  scheduledAt: string;
  durationMinutes?: number;
  mode?: string;
  withWhom?: string;
  meetingLink?: string;
  reason: string;
  note: string;
  requestedAt: string;
  status: "open" | "rescheduled" | "cancelled" | "withdrawn";
  /** ISO time the candidate withdrew the request (status "withdrawn"). */
  withdrawnAt?: string;
  outcome?: InterviewOutcome;
  /** true once the Applicant mock has taken the outcome in (new time, notification). */
  applied: boolean;
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): InterviewTimeRequest[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as InterviewTimeRequest[]) : [];
  } catch {
    return [];
  }
}

export function readRequests(): InterviewTimeRequest[] {
  if (typeof window === "undefined") return [];
  return parse(readRaw());
}

function write(list: InterviewTimeRequest[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: the bridge is skipped.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addRequest(r: Omit<InterviewTimeRequest, "id" | "status" | "applied" | "requestedAt">): InterviewTimeRequest {
  const req: InterviewTimeRequest = { ...r, id: `itr-${Date.now().toString(36)}`, requestedAt: new Date().toISOString(), status: "open", applied: false };
  write([...readRequests(), req]);
  return req;
}

export function resolveRequest(id: string, status: "rescheduled" | "cancelled", outcome: Omit<InterviewOutcome, "decidedAt">) {
  const list = readRequests();
  if (!list.some((r) => r.id === id)) return;
  // A later change by HR on the same interview is sent to the candidate again (applied goes back to false).
  write(list.map((r) => (r.id === id ? { ...r, status, applied: false, outcome: { ...outcome, decidedAt: new Date().toISOString() } } : r)));
}

/** The candidate takes the request back. The interview was never changed, so nothing else moves; HR's case closes. */
export function withdrawRequest(id: string) {
  const list = readRequests();
  if (!list.some((r) => r.id === id && r.status === "open")) return;
  write(list.map((r) => (r.id === id ? { ...r, status: "withdrawn" as const, withdrawnAt: new Date().toISOString(), applied: true } : r)));
}

export function markApplied(id: string) {
  write(readRequests().map((r) => (r.id === id ? { ...r, applied: true } : r)));
}

/** Subscribes to changes made in this tab and in other tabs of the same browser. */
export function subscribeRequests(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY = "[]";

/** Live list of requests (empty on the server and on first paint, so hydration matches). */
export function useInterviewRequests(): InterviewTimeRequest[] {
  const raw = useSyncExternalStore(subscribeRequests, readRaw, () => EMPTY);
  return useMemo(() => parse(raw), [raw]);
}

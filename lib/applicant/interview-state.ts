/**
 * What the applicant should SEE for an interview, derived (never stored) from the interview and the
 * "Can't make this time" request(s) on it (lib/bridge/interview-requests.ts).
 *
 *   scheduled    nothing special
 *   waiting      the applicant sent a request and HR has not answered ("New time requested")
 *   rescheduled  HR moved it after a request ("New time", with "Moved from ...")
 *   cancelled    HR cancelled it ("Cancelled by Beeliv")
 *
 * The real backend returns the same facts on the interview itself (see
 * docs/contracts/interviews-and-application-journeys.md, "Applicant interview states").
 */
import type { Interview } from "@/lib/applicant/types";
import type { InterviewTimeRequest } from "@/lib/bridge/interview-requests";

export type InterviewView =
  | { kind: "scheduled" }
  | { kind: "waiting"; request: InterviewTimeRequest }
  | { kind: "rescheduled"; request: InterviewTimeRequest }
  | { kind: "cancelled"; request: InterviewTimeRequest | null };

const newestFirst = (a: InterviewTimeRequest, b: InterviewTimeRequest) => (a.requestedAt < b.requestedAt ? 1 : -1);

export function interviewView(v: Interview, requests: InterviewTimeRequest[]): InterviewView {
  const mine = requests.filter((r) => r.interviewRef === v.id).sort(newestFirst);
  const open = mine.find((r) => r.status === "open");
  if (open && v.status === "scheduled") return { kind: "waiting", request: open };
  if (v.status === "cancelled") return { kind: "cancelled", request: mine.find((r) => r.status === "cancelled") ?? null };
  const latest = mine[0];
  if (v.status === "scheduled" && latest?.status === "rescheduled" && latest.outcome?.scheduledAt) return { kind: "rescheduled", request: latest };
  return { kind: "scheduled" };
}

/** Why a new request cannot be sent right now, or null when it can. */
export function requestBlock(v: Interview, requests: InterviewTimeRequest[], now = Date.now()): { kind: "duplicate"; request: InterviewTimeRequest } | { kind: "passed" } | null {
  const open = requests.find((r) => r.interviewRef === v.id && r.status === "open");
  if (open) return { kind: "duplicate", request: open };
  if (v.scheduledAt && new Date(v.scheduledAt).getTime() <= now) return { kind: "passed" };
  return null;
}

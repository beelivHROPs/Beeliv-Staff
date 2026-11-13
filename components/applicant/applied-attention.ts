/**
 * How many things on "Applied" need the applicant? Drives the count badge on the phone bottom-nav tab.
 * Derived only (never stored), from the same facts PhoneHome and the application cards already use:
 * a document HR is waiting on, an offer waiting for an answer, an interview HR moved to a new time,
 * or a scheduled interview in the next 3 days.
 */
import type { Application, ApplicantDocument, Interview } from "@/lib/applicant/types";
import type { InterviewTimeRequest } from "@/lib/bridge/interview-requests";
import { interviewView } from "@/lib/applicant/interview-state";

const SOON_MS = 3 * 24 * 60 * 60 * 1000;

export function appliedAttentionCount(applications: Application[], interviews: Interview[], documents: ApplicantDocument[], requests: InterviewTimeRequest[], now = Date.now()): number {
  const live = applications.filter((a) => a.lifecycle === "submitted");
  const liveIds = new Set(live.map((a) => a.id));
  const offers = live.filter((a) => a.offer?.status === "pending").length;
  const docs = documents.filter((d) => d.status === "action-required" && d.forApplicationId && liveIds.has(d.forApplicationId)).length;
  const ivs = interviews.filter((v) => {
    if (!liveIds.has(v.applicationId) || v.status !== "scheduled") return false;
    if (interviewView(v, requests).kind === "rescheduled") return true;
    const t = v.scheduledAt ? new Date(v.scheduledAt).getTime() : NaN;
    return t > now && t - now <= SOON_MS;
  }).length;
  return offers + docs + ivs;
}

/**
 * SAMPLE journeys (DEV FIXTURE, fictional). Different kinds of job get different
 * journeys, so the Admin vacancy form, the applicant job page and the applicant
 * application page can all show per-job data before the backend exists. Both the
 * Admin vacancy mock (by title) and the applicant job pages (by role) read this
 * file; the real version reads each vacancy's own journey copy.
 *
 * Interview step ids deliberately equal the stage ids the Interviews mock already
 * uses ("hr-screening", "beeliv-interview", "client-interview", "practical",
 * "final-review"), so a seeded interview finds its step by id. A step created in
 * the form gets a random id instead.
 */
import type { InterviewStepConfig, Journey, JourneyMethod, JourneyStep, ScorecardCriterion, ScorerRole } from "./types";

const ALL: ScorerRole[] = ["hr_officer", "hr_manager", "operations"];
const crit = (prefix: string, rows: [string, number?][]): ScorecardCriterion[] => rows.map(([label, weight], i) => ({ id: `${prefix}-c${i + 1}`, label, scale: 5, weight: weight ?? 1 }));

const GENERAL = (p: string) => crit(p, [["Communication"], ["Service attitude"], ["Relevant experience"], ["Presentation and grooming"], ["Teamwork and reliability"]]);
const PRACTICAL = (p: string) => crit(p, [["Technical skill", 2], ["Speed and organisation"], ["Hygiene and safety"], ["Guest handling"]]);

const iv = (id: string, stageName: string, method: JourneyMethod, minutes: number, criteria: ScorecardCriterion[], who: ScorerRole[] = ALL): JourneyStep => {
  const interview: InterviewStepConfig = { stageName, defaultMethod: method, defaultMinutes: minutes, criteria, whoMayScore: who };
  return { id, kind: "interview", interview };
};
const st = (kind: JourneyStep["kind"], id: string): JourneyStep => ({ id, kind });

export type SampleArchetype = "waiter" | "kitchen" | "bar" | "front" | "manager" | "support";

/** Server-safe (no crypto, fixed ids). */
export const SAMPLE_JOURNEYS: Record<SampleArchetype, () => Journey> = {
  // Waiter: application, screening, one practical, decision, offer.
  waiter: () => [
    st("application", "w-app"),
    st("documents-at-application", "w-docs"),
    st("screening-questions", "w-screen"),
    iv("practical", "Practical Assessment", "in-person", 45, PRACTICAL("w-p"), ALL),
    st("operations-decision", "w-decision"),
    st("offer", "w-offer"),
  ],
  // Kitchen: phone screen, interview, kitchen practical, documents, decision, offer, onboarding.
  kitchen: () => [
    st("application", "k-app"),
    st("documents-at-application", "k-docs"),
    st("screening-questions", "k-screen"),
    iv("hr-screening", "HR Screening", "phone", 30, GENERAL("k-h"), ["hr_officer", "hr_manager"]),
    iv("beeliv-interview", "Beeliv Interview", "in-person", 45, GENERAL("k-b"), ALL),
    iv("practical", "Practical Assessment", "in-person", 60, PRACTICAL("k-p"), ["hr_manager", "operations"]),
    st("documents-after-selection", "k-docs2"),
    st("operations-decision", "k-decision"),
    st("offer", "k-offer"),
    st("onboarding", "k-onb"),
  ],
  // Bar: test, interview, practical, decision, offer.
  bar: () => [
    st("application", "b-app"),
    st("documents-at-application", "b-docs"),
    st("screening-questions", "b-screen"),
    st("test-or-form", "b-test"),
    iv("beeliv-interview", "Beeliv Interview", "video", 30, GENERAL("b-b"), ALL),
    iv("practical", "Practical Assessment", "in-person", 45, PRACTICAL("b-p"), ALL),
    st("operations-decision", "b-decision"),
    st("offer", "b-offer"),
  ],
  // Front of house: test, phone screen, video interview, decision, offer, onboarding.
  front: () => [
    st("application", "f-app"),
    st("documents-at-application", "f-docs"),
    st("screening-questions", "f-screen"),
    st("test-or-form", "f-test"),
    iv("hr-screening", "HR Screening", "phone", 30, GENERAL("f-h"), ["hr_officer", "hr_manager"]),
    iv("beeliv-interview", "Beeliv Interview", "video", 45, GENERAL("f-b"), ALL),
    st("operations-decision", "f-decision"),
    st("offer", "f-offer"),
    st("onboarding", "f-onb"),
  ],
  // Manager: screening, test, two interviews, documents, decision, offer, onboarding.
  manager: () => [
    st("application", "m-app"),
    st("documents-at-application", "m-docs"),
    st("screening-questions", "m-screen"),
    st("test-or-form", "m-test"),
    iv("beeliv-interview", "Beeliv Interview", "in-person", 60, GENERAL("m-b"), ["hr_manager", "operations"]),
    iv("client-interview", "Client Interview", "in-person", 45, GENERAL("m-c"), ["hr_officer", "hr_manager", "operations"]),
    st("documents-after-selection", "m-docs2"),
    st("operations-decision", "m-decision"),
    st("offer", "m-offer"),
    st("onboarding", "m-onb"),
  ],
  // Support and back office: one interview, documents, decision, offer.
  support: () => [
    st("application", "s-app"),
    st("documents-at-application", "s-docs"),
    st("screening-questions", "s-screen"),
    iv("beeliv-interview", "Beeliv Interview", "in-person", 30, GENERAL("s-b"), ALL),
    st("documents-after-selection", "s-docs2"),
    st("operations-decision", "s-decision"),
    st("offer", "s-offer"),
  ],
};

/** Which sample journey a job gets, from its title (and department as a fallback). Illustrative only. */
export function archetypeFor(title: string, department?: string | null): SampleArchetype {
  const t = title.toLowerCase();
  if (/\b(bar|bartender|barista|mixolog)/.test(t)) return "bar";
  if (/\b(waiter|waitress|server)\b/.test(t)) return "waiter";
  if (/\b(housekeep|steward|security|cleaner|driver|admin|operations)/.test(t)) return "support";
  if (/\b(chef|cook|kitchen)/.test(t)) return "kitchen";
  if (/\b(guest relations|front desk|host|hostess|reception)/.test(t)) return "front";
  if (/\b(manager|supervisor|captain)/.test(t)) return "manager";
  switch (department) {
    case "Kitchen":
      return "kitchen";
    case "Bar":
      return "bar";
    case "Management":
      return "manager";
    case "Admin & operations":
    case "Support":
      return "support";
    default:
      return "front";
  }
}

export const sampleJourneyFor = (title: string, department?: string | null): Journey => SAMPLE_JOURNEYS[archetypeFor(title, department)]();

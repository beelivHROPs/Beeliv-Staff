/**
 * Application journey (docs/contracts/interviews-and-application-journeys.md section 2).
 * A journey is the ORDERED list of steps an applicant goes through for one job.
 * Beeliv writes templates; a vacancy keeps its OWN COPY. Pure data and pure
 * rules: no React, no storage, so Admin, the applicant pages and the mocks can
 * all import it. The ordering rules here are the prototype of rules the BACKEND
 * must enforce (the UI only avoids offering moves that break them).
 *
 * Fixed rules (project lead, 2026-10-17):
 *  - "application" is always first and cannot be removed.
 *  - "operations-decision" is always present, cannot be removed, and always comes before "offer".
 *  - "offer" comes before "onboarding"; "onboarding" is last.
 *  - Everything else is optional; Beeliv chooses which exist and their order inside those limits.
 */
import type { ApplicationStage } from "@/lib/applicant/types";

export type JourneyStepKind =
  | "application"
  | "screening-questions"
  | "documents-at-application"
  | "test-or-form"
  | "interview"
  | "documents-after-selection"
  | "operations-decision"
  | "offer"
  | "onboarding";

/** Who may score an interview stage. Matches the Admin access roles (lib/admin/role-access.ts). */
export type ScorerRole = "hr_officer" | "hr_manager" | "operations";
export const SCORER_ROLES: ScorerRole[] = ["hr_officer", "hr_manager", "operations"];
export const SCORER_LABEL: Record<ScorerRole, string> = { hr_officer: "HR officer", hr_manager: "HR Manager", operations: "Operations" };

export type JourneyMethod = "in-person" | "video" | "phone";
export const JOURNEY_METHOD_LABEL: Record<JourneyMethod, string> = { "in-person": "In person", video: "Video call", phone: "Phone call" };

/** Lengths the scheduling dialog offers. */
export const INTERVIEW_MINUTES = [30, 45, 60, 90] as const;

export interface ScorecardCriterion {
  id: string;
  label: string;
  /** Highest rating. 5 or 10. */
  scale: 5 | 10;
  /** Whole number 1-5. Only changes how the guide total is weighed. */
  weight: number;
}

export interface InterviewStepConfig {
  stageName: string;
  defaultMethod: JourneyMethod;
  defaultMinutes: number;
  criteria: ScorecardCriterion[];
  whoMayScore: ScorerRole[];
}

export interface JourneyStep {
  id: string;
  kind: JourneyStepKind;
  /** Present exactly when kind === "interview". */
  interview?: InterviewStepConfig;
}

export type Journey = JourneyStep[];

export const STEP_META: Record<JourneyStepKind, { label: string; help: string; single: boolean; removable: boolean }> = {
  application: { label: "Application", help: "The applicant fills in the form and sends it. Always first.", single: true, removable: false },
  "screening-questions": { label: "Screening questions", help: "Short questions the applicant answers with the application.", single: true, removable: true },
  "documents-at-application": { label: "Documents to apply", help: "Documents the applicant uploads with the application.", single: true, removable: true },
  "test-or-form": { label: "Test or form", help: "A published test the applicant takes as part of the application.", single: true, removable: true },
  interview: { label: "Interview", help: "A stage with its own default method, length and scorecard.", single: false, removable: true },
  "documents-after-selection": { label: "Documents after selection", help: "Documents asked for only once the applicant is selected.", single: true, removable: true },
  "operations-decision": { label: "Operations decision", help: "Operations decides who is selected. It cannot be removed or skipped, and it always comes before the offer.", single: true, removable: false },
  offer: { label: "Offer", help: "Operations sends the offer.", single: true, removable: true },
  onboarding: { label: "Onboarding", help: "Always last.", single: true, removable: true },
};

export const STEP_KINDS = Object.keys(STEP_META) as JourneyStepKind[];

/* ---------- construction ---------- */

let seq = 0;
export const stepId = (): string => {
  seq += 1;
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `st-${Date.now().toString(36)}-${seq}`;
};

export function defaultCriteria(): ScorecardCriterion[] {
  return [
    { id: stepId(), label: "Communication", scale: 5, weight: 1 },
    { id: stepId(), label: "Service attitude", scale: 5, weight: 1 },
    { id: stepId(), label: "Relevant experience", scale: 5, weight: 1 },
  ];
}

export function newStep(kind: JourneyStepKind, stageName = "New interview"): JourneyStep {
  if (kind !== "interview") return { id: stepId(), kind };
  return { id: stepId(), kind, interview: { stageName, defaultMethod: "in-person", defaultMinutes: 45, criteria: defaultCriteria(), whoMayScore: ["hr_officer", "hr_manager", "operations"] } };
}

/** The journey a brand-new job starts with when no template is chosen. */
export function blankJourney(): Journey {
  return [newStep("application"), newStep("screening-questions"), newStep("documents-at-application"), newStep("operations-decision"), newStep("offer")];
}

/** A copy for a vacancy: same steps, fresh ids, so editing it never touches the template. */
export function copyJourney(journey: Journey): Journey {
  return journey.map((s) => ({
    ...s,
    id: stepId(),
    interview: s.interview ? { ...s.interview, criteria: s.interview.criteria.map((c) => ({ ...c, id: stepId() })), whoMayScore: [...s.interview.whoMayScore] } : undefined,
  }));
}

export const hasStep = (journey: Journey, kind: JourneyStepKind): boolean => journey.some((s) => s.kind === kind);
export const interviewSteps = (journey: Journey): JourneyStep[] => journey.filter((s) => s.kind === "interview" && s.interview);

/* ---------- ordering rules ---------- */

/** True when the ORDER respects the fixed rules (content is checked by validateJourney). */
export function orderOk(journey: Journey): boolean {
  if (journey.length === 0 || journey[0].kind !== "application") return false;
  const at = (k: JourneyStepKind) => journey.findIndex((s) => s.kind === k);
  const decision = at("operations-decision");
  const offer = at("offer");
  const onboarding = at("onboarding");
  if (journey.filter((s) => s.kind === "application").length !== 1) return false;
  if (decision < 0) return false;
  if (offer >= 0 && offer < decision) return false;
  if (onboarding >= 0 && offer >= 0 && onboarding < offer) return false;
  if (onboarding >= 0 && onboarding !== journey.length - 1) return false;
  if (onboarding >= 0 && onboarding < decision) return false;
  return true;
}

function swapped(journey: Journey, i: number, dir: -1 | 1): Journey {
  const j = i + dir;
  const next = [...journey];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function canMoveStep(journey: Journey, i: number, dir: -1 | 1): boolean {
  const j = i + dir;
  if (j < 0 || j >= journey.length || journey[i].kind === "application") return false;
  return orderOk(swapped(journey, i, dir));
}

export function moveStep(journey: Journey, i: number, dir: -1 | 1): Journey {
  return canMoveStep(journey, i, dir) ? swapped(journey, i, dir) : journey;
}

export const canRemoveStep = (step: JourneyStep): boolean => STEP_META[step.kind].removable;

/** Kinds that can still be added (single kinds only when absent; application and decision always exist). */
export function addableKinds(journey: Journey): JourneyStepKind[] {
  return STEP_KINDS.filter((k) => k !== "application" && k !== "operations-decision" && (!STEP_META[k].single || !hasStep(journey, k)));
}

const BEFORE: Record<string, JourneyStepKind[]> = {
  "screening-questions": ["interview", "documents-after-selection", "operations-decision", "offer", "onboarding"],
  "documents-at-application": ["screening-questions", "test-or-form", "interview", "documents-after-selection", "operations-decision", "offer", "onboarding"],
  "test-or-form": ["interview", "documents-after-selection", "operations-decision", "offer", "onboarding"],
  interview: ["documents-after-selection", "operations-decision", "offer", "onboarding"],
  "documents-after-selection": ["operations-decision", "offer", "onboarding"],
  offer: ["onboarding"],
};

/** Adds a step in a sensible place that keeps the fixed rules; Beeliv can then move it. */
export function addStep(journey: Journey, kind: JourneyStepKind, step?: JourneyStep): Journey {
  const s = step ?? newStep(kind);
  if (kind === "onboarding") return [...journey, s];
  if (kind === "offer") {
    const ob = journey.findIndex((x) => x.kind === "onboarding");
    return ob >= 0 ? [...journey.slice(0, ob), s, ...journey.slice(ob)] : [...journey, s];
  }
  const stops = BEFORE[kind] ?? [];
  const at = journey.findIndex((x) => stops.includes(x.kind));
  return at >= 0 ? [...journey.slice(0, at), s, ...journey.slice(at)] : [...journey, s];
}

export const removeStep = (journey: Journey, id: string): Journey => journey.filter((s) => s.id !== id || !canRemoveStep(s));

/* ---------- validation (instant feedback; the backend validates again) ---------- */

/** Keys are step ids, plus "journey" for a problem with the whole list. Messages are plain language. */
export type JourneyErrors = Record<string, string>;

export function validateJourney(journey: Journey): JourneyErrors {
  const e: JourneyErrors = {};
  if (!orderOk(journey)) e.journey = "The journey must start with the application, include the Operations decision before the offer, and end with onboarding if there is one.";
  const names = new Set<string>();
  for (const s of journey) {
    if (s.kind !== "interview") continue;
    const c = s.interview;
    if (!c) {
      e[s.id] = "This interview has no settings.";
      continue;
    }
    const name = c.stageName.trim().toLowerCase();
    if (!name) e[s.id] = "Give this interview a name.";
    else if (names.has(name)) e[s.id] = "Two interviews share this name. Give each its own.";
    else if (c.criteria.length === 0) e[s.id] = "Add at least one scorecard criterion.";
    else if (c.criteria.some((x) => !x.label.trim())) e[s.id] = "Write each criterion, or remove the empty one.";
    else if (c.whoMayScore.length === 0) e[s.id] = "Choose who may score this interview.";
    names.add(name);
  }
  return e;
}

/* ---------- what the applicant sees ---------- */

/**
 * ONE mapping from a journey step to the application tracker's stage name (APPLICATION_STAGES, the 8 stages
 * an applicant sees on "My applications"). The job page's "Recruitment process" uses these SAME labels, so the
 * journey promised on the job page reads exactly like the tracker the person later sees. Several steps can map
 * to one stage (a test and an interview are both "Interview/Assessment"), and a stage with no step of its own
 * (Verification, Assignment) is not listed. Documents asked at application are part of the application stage.
 */
export const STEP_STAGE: Record<JourneyStepKind, ApplicationStage | null> = {
  application: "Application",
  "screening-questions": "Application Review/Shortlisting",
  "documents-at-application": null,
  "test-or-form": "Interview/Assessment",
  interview: "Interview/Assessment",
  "documents-after-selection": "Documentation",
  "operations-decision": "Selection/Approval",
  offer: "Selection/Approval",
  onboarding: "Staff Onboarding",
};

/**
 * The "Recruitment process" the applicant sees for a job, in the tracker's own stage names, in order, without
 * repeats. Every submitted application is reviewed by Beeliv (tracker stage 2), so that stage always follows
 * "Application" even when the job has no screening questions.
 */
export function applicantTimeline(journey: Journey): string[] {
  const out: ApplicationStage[] = [];
  const add = (stage: ApplicationStage | null) => {
    if (stage && out[out.length - 1] !== stage && !out.includes(stage)) out.push(stage);
  };
  for (const s of journey) {
    add(STEP_STAGE[s.kind]);
    if (s.kind === "application") add("Application Review/Shortlisting");
  }
  return out;
}

/** "8 steps, 2 interviews" for lists. */
export function journeySummary(journey: Journey): string {
  const n = journey.length;
  const i = interviewSteps(journey).length;
  return `${n} step${n === 1 ? "" : "s"}${i ? `, ${i} interview${i === 1 ? "" : "s"}` : ""}`;
}

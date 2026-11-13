/**
 * The ONE in-memory store for Tests & Forms. Admin (build, publish, results) and the taker screens (Applicant / Staff)
 * both import this module, so what one side saves the other sees (via `subscribe`). DEV FIXTURE: when the backend exists
 * this file is replaced by a real adapter; the function names and shapes stay the same.
 *
 * Rules kept here (never in a component): a score only ASSISTS a person and never rejects anyone; nothing is marked
 * automatically unless the answer key is "confirmed" by Beeliv; written answers always wait for a person.
 */
import { SEED_FORMS } from "@/lib/forms/seed";
import { sentAsSubmissions, subscribeSent } from "./participant-bridge";
import type { AnswerValue, FormAudience, FormDefinition, FormQuestion, FormStatus, FormSubmission, ScoreSummary } from "@/lib/forms/types";

/* ---------------- helpers (pure, safe to import anywhere) ---------------- */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export interface ScoreInfo extends ScoreSummary {
  /** Marks that count (auto where a confirmed key exists, otherwise the person's mark), by question id. */
  marks: Record<string, number>;
  markedCount: number;
  markableCount: number;
}

export interface SubmissionHistoryEntry {
  id: string;
  submissionId: string;
  at: string;
  actor: string;
  action: string;
}

/** Automatic mark, or null when the question cannot be marked automatically yet (no CONFIRMED key). */
export function autoMark(q: FormQuestion, answer: AnswerValue | undefined): number | null {
  if (q.marking !== "auto" || !q.points || q.answerKey?.status !== "confirmed" || q.answerKey.optionIds.length === 0) return null;
  const key = q.answerKey.optionIds;
  if (answer === undefined) return 0;
  if (q.type === "multiple") {
    // Selection rule (exact match) needs Beeliv confirmation.
    const picked = Array.isArray(answer) ? answer : [];
    return picked.length === key.length && key.every((k) => picked.includes(k)) ? q.points : 0;
  }
  return typeof answer === "string" && key.includes(answer) ? q.points : 0;
}

export function scoreSubmission(form: FormDefinition, sub: FormSubmission): ScoreInfo {
  const marks: Record<string, number> = {};
  let earned = 0;
  let possible = 0;
  let markedPossible = 0;
  let waiting = 0;
  let markable = 0;
  for (const q of form.questions) {
    if (q.marking === "none" || !q.points) continue;
    markable += 1;
    possible += q.points;
    const auto = autoMark(q, sub.answers[q.id]);
    const manual = sub.marks?.[q.id];
    const mark = auto ?? (typeof manual === "number" ? manual : null);
    if (mark === null) {
      waiting += 1;
    } else {
      marks[q.id] = mark;
      earned += mark;
      markedPossible += q.points;
    }
  }
  return {
    earned,
    possible,
    percent: markedPossible > 0 ? Math.round((earned / markedPossible) * 100) : null,
    awaitingMarking: waiting,
    marks,
    markedCount: markable - waiting,
    markableCount: markable,
  };
}

/** Sample, configurable lists (adapter data, never hard-coded in components). */
export const SAMPLE_DEPARTMENTS = ["Front of house", "Kitchen", "Bar", "Housekeeping", "Management"];
export const SAMPLE_CLIENTS = ["Brunch Lane", "Demo Hotel Abuja", "Demo Lounge Lagos"];

/* ---------------- seed data ---------------- */

const ME = "Funke Sample";
const NAMES = ["Bisi", "Ngozi", "Emeka", "Zainab", "Yusuf", "Amaka", "Segun", "Halima", "Ifeanyi", "Folake", "Gbenga", "Dayo"];
const LONG = [
  "Good evening, welcome to our restaurant. My name is Bisi and I will be looking after you today.",
  "Hospitality is how the guest feels; service is the tasks we do. (Sample answer.)",
  "I would greet them warmly, smile and offer a seat straight away. (Sample answer.)",
];
const SHORT = ["Empathy", "Patient", "Calm", "Lead by example"];

const testForm = SEED_FORMS[0];
const appraisalForm = SEED_FORMS[1];

function seedTestSubmissions(): FormSubmission[] {
  return NAMES.slice(0, 11).map((n, i) => {
    const answers: Record<string, AnswerValue> = {};
    testForm.questions.forEach((q, qi) => {
      const o = q.options ?? [];
      if (q.type === "single") answers[q.id] = o[(i + qi) % 3 === 0 ? o.length - 1 : (i + qi) % o.length].id;
      else if (q.type === "multiple") answers[q.id] = o.filter((_, k) => (k + i) % 2 === 0).map((x) => x.id);
      else if (q.type === "long") answers[q.id] = LONG[(i + qi) % LONG.length];
      else answers[q.id] = SHORT[(i + qi) % SHORT.length];
    });
    const day = String(2 + (i % 8)).padStart(2, "0");
    const hour = String(8 + ((i * 3) % 10)).padStart(2, "0");
    const submittedAt = `2026-10-${day}T${hour}:${String(10 + i * 4).padStart(2, "0")}:00.000Z`;
    const base: FormSubmission = {
      id: `sub-test-${i + 1}`,
      formId: testForm.id,
      formVersion: 1,
      takerId: `a-${String(i + 1).padStart(3, "0")}`,
      takerName: `${n} Sample`,
      takerType: "applicant",
      startedAt: submittedAt,
      submittedAt: i === 10 ? null : submittedAt,
      status: i === 10 ? "in-progress" : "submitted",
      answers: i === 10 ? { [testForm.questions[0].id]: testForm.questions[0].options![1].id } : answers,
    };
    if (i === 1) {
      base.marks = { "training-q2": 2, "training-q3": 1, "training-q5": 1, "training-q8": 1 };
      base.recommendation = "proceed";
      base.markedBy = ME;
    }
    return base;
  });
}

function seedAppraisalSubmissions(): FormSubmission[] {
  const q = appraisalForm.questions;
  return ["Tunde", "Chioma", "Ahmed", "Blessing", "Sola", "Kunle"].map((n, i) => ({
    id: `sub-appraisal-${i + 1}`,
    formId: appraisalForm.id,
    formVersion: 1,
    takerId: `s-${String(i + 1).padStart(3, "0")}`,
    takerName: `${n} Sample`,
    takerType: "staff" as const,
    startedAt: `2026-10-0${3 + (i % 5)}T1${i}:00:00.000Z`,
    submittedAt: `2026-10-0${3 + (i % 5)}T1${i}:12:00.000Z`,
    status: "submitted" as const,
    answers: {
      [q[0].id]: `${n} Sample`,
      [q[1].id]: SAMPLE_DEPARTMENTS[i % SAMPLE_DEPARTMENTS.length],
      [q[2].id]: [q[2].options![i % 5].id, q[2].options![(i + 2) % 5].id],
      [q[3].id]: "Listening and staying calm under pressure. (Sample answer.)",
      [q[4].id]: 3 + (i % 3),
      [q[5].id]: q[5].options![i % 4].id,
      [q[6].id]: "I have learned to take feedback well. (Sample answer.)",
      [q[7].id]: q[7].options![i % 3].id,
      [q[8].id]: "Hold short training sessions every week. (Sample answer.)",
      [q[9].id]: `${n.toLowerCase()}@example.com`,
    },
  }));
}

/* ---------------- state ---------------- */

let forms: FormDefinition[] = clone(SEED_FORMS);
let submissions: FormSubmission[] = [...seedTestSubmissions(), ...seedAppraisalSubmissions()];
let history: SubmissionHistoryEntry[] = [
  { id: "h-seed-1", submissionId: "sub-test-2", at: "2026-10-04T12:30:00.000Z", actor: ME, action: "Saved marks and recommended: Proceed" },
];
let counter = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(counter += 1)}`;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Mock bridge: pull in anything participants have sent (standalone or inside a job application) that Admin has not seen yet. */
function pullSent() {
  const fresh = sentAsSubmissions().filter((s) => !submissions.some((x) => x.id === s.id));
  if (fresh.length) submissions = [...fresh, ...submissions];
}
subscribeSent(() => {
  pullSent();
  emit();
});

/** Both Admin and the taker screens call this to be told when anything changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ---------------- reads ---------------- */

export function listForms(): FormDefinition[] {
  return clone(forms);
}

export function getForm(id: string): FormDefinition | null {
  const f = forms.find((x) => x.id === id);
  return f ? clone(f) : null;
}

/** What a person of this audience may take right now: published forms only. */
export function listPublishedFor(audience: FormAudience): FormDefinition[] {
  return clone(forms.filter((f) => f.status === "published" && f.audience === audience));
}

export function listSubmissions(formId: string): FormSubmission[] {
  pullSent();
  return clone(submissions.filter((s) => s.formId === formId));
}

export function getSubmission(id: string): FormSubmission | null {
  pullSent();
  const s = submissions.find((x) => x.id === id);
  return s ? clone(s) : null;
}

export function getSubmissionHistory(submissionId: string): SubmissionHistoryEntry[] {
  return clone(history.filter((h) => h.submissionId === submissionId).sort((a, b) => b.at.localeCompare(a.at)));
}

export function submissionCount(formId: string): number {
  pullSent();
  return submissions.filter((s) => s.formId === formId && s.status !== "in-progress").length;
}

/* ---------------- taker writes ---------------- */

/** A person submits their answers. Returns the stored submission (id and status filled in). */
export function submit(submission: Omit<FormSubmission, "id" | "status"> & Partial<Pick<FormSubmission, "id" | "status">>): FormSubmission {
  const now = new Date().toISOString();
  const stored: FormSubmission = {
    ...clone(submission),
    id: submission.id ?? nextId("sub"),
    status: "submitted",
    submittedAt: submission.submittedAt ?? now,
  };
  const at = submissions.findIndex((s) => s.id === stored.id);
  if (at >= 0) submissions[at] = stored;
  else submissions = [stored, ...submissions];
  emit();
  return clone(stored);
}

/** HR saves marks for the written answers (and any choice question with no confirmed key) plus a recommendation. */
export function saveMarks(submissionId: string, marks: Record<string, number>, recommendation: FormSubmission["recommendation"], actor: string = ME): FormSubmission | null {
  pullSent();
  const at = submissions.findIndex((s) => s.id === submissionId);
  if (at < 0) return null;
  const form = forms.find((f) => f.id === submissions[at].formId);
  const merged = { ...(submissions[at].marks ?? {}), ...marks };
  const next: FormSubmission = { ...submissions[at], marks: merged, recommendation: recommendation ?? null, markedBy: actor };
  if (form && scoreSubmission(form, next).awaitingMarking === 0 && next.status === "submitted") next.status = "marked";
  submissions[at] = next;
  const RECO: Record<string, string> = { proceed: "Proceed", hold: "Hold", "needs-another-stage": "Needs another stage" };
  history = [
    { id: nextId("h"), submissionId, at: new Date().toISOString(), actor, action: recommendation ? `Saved marks and recommended: ${RECO[recommendation]}` : "Saved marks (no recommendation yet)" },
    ...history,
  ];
  emit();
  return clone(next);
}

/* ---------------- form writes (Admin) ---------------- */

export type FormInput = Omit<FormDefinition, "id" | "version" | "updatedAt" | "updatedBy" | "status"> & { id?: string };

/** Create (no id) or update. Editing a published form bumps its version. New forms start as a draft. */
export function saveForm(input: FormInput, actor: string = ME): FormDefinition {
  const now = new Date().toISOString();
  const at = input.id ? forms.findIndex((f) => f.id === input.id) : -1;
  if (at >= 0) {
    const cur = forms[at];
    forms[at] = { ...cur, ...clone(input), id: cur.id, status: cur.status, version: cur.status === "published" ? cur.version + 1 : cur.version, updatedAt: now, updatedBy: actor };
    emit();
    return clone(forms[at]);
  }
  const created: FormDefinition = { ...clone(input), id: nextId("form"), status: "draft", version: 1, updatedAt: now, updatedBy: actor };
  forms = [created, ...forms];
  emit();
  return clone(created);
}

export function setFormStatus(id: string, status: FormStatus, actor: string = ME): FormDefinition | null {
  const at = forms.findIndex((f) => f.id === id);
  if (at < 0) return null;
  forms[at] = { ...forms[at], status, updatedAt: new Date().toISOString(), updatedBy: actor };
  emit();
  return clone(forms[at]);
}

export function duplicateForm(id: string, actor: string = ME): FormDefinition | null {
  const src = forms.find((f) => f.id === id);
  if (!src) return null;
  const copy: FormDefinition = { ...clone(src), id: nextId("form"), title: `Copy of ${src.title}`, status: "draft", version: 1, updatedAt: new Date().toISOString(), updatedBy: actor };
  forms = [copy, ...forms];
  emit();
  return clone(copy);
}

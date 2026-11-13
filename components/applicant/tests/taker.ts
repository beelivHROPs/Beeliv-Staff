"use client";

/**
 * Taker-side helpers shared by the Applicant "Tests" and Staff "Forms" screens (mock data only).
 * - Drafts: a person's in-progress answers are saved on THIS device (localStorage) so they can resume.
 *   A draft also remembers that the form was sent, so the list can show "Submitted" even after a reload.
 * - Validation: every question in the supplied forms is required.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { AnswerValue } from "@/lib/forms/types";
import type { ParticipantForm, ParticipantQuestion } from "@/lib/forms/participant-store";

/** Option id used for the "Other (please specify)" choice. */
export const OTHER_ID = "__other";

export interface Draft {
  answers: Record<string, AnswerValue>;
  otherText: Record<string, string>;
  /** Current step: 0..n-1 = a question, n = the review screen. */
  index: number;
  /** null until the person presses Start. */
  startedAt: string | null;
  submittedAt: string | null;
  submissionId: string | null;
  /** True when the time limit ran out and the form was sent automatically. */
  autoSubmitted: boolean;
}

export const EMPTY_DRAFT: Draft = { answers: {}, otherText: {}, index: 0, startedAt: null, submittedAt: null, submissionId: null, autoSubmitted: false };

const keyOf = (takerId: string, formId: string) => `beeliv-form-draft-v1:${takerId}:${formId}`;

const cache = new Map<string, Draft>();
const listeners = new Set<() => void>();

function read(key: string): Draft {
  const hit = cache.get(key);
  if (hit) return hit;
  let draft = EMPTY_DRAFT;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) draft = { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
    } catch {
      // Unreadable storage: start fresh.
    }
    cache.set(key, draft);
  }
  return draft;
}

function write(key: string, draft: Draft) {
  cache.set(key, draft);
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: progress stays in memory for this visit only.
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** One person's draft for one form. */
export function useDraft(takerId: string, formId: string) {
  const key = keyOf(takerId, formId);
  const draft = useSyncExternalStore(subscribe, () => read(key), () => EMPTY_DRAFT);
  const update = useCallback((patch: Partial<Draft>) => write(key, { ...read(key), ...patch }), [key]);
  const reset = useCallback(() => write(key, EMPTY_DRAFT), [key]);
  return { draft, update, reset };
}

/** Drafts for several forms at once (for the list pages). */
export function useDraftsFor(takerId: string, formIds: string[]): Record<string, Draft> {
  const ids = formIds.filter(Boolean);
  // The snapshot is a string so React can compare it by value (an array would look "new" on every read).
  const snap = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(ids.map((id) => read(keyOf(takerId, id)))),
    () => "[]",
  );
  const parsed = JSON.parse(snap) as Draft[];
  const out: Record<string, Draft> = {};
  ids.forEach((id, i) => (out[id] = parsed[i] ?? EMPTY_DRAFT));
  return out;
}

export type TakerStatus = "not-started" | "in-progress" | "submitted";

export function statusOf(d: Draft): TakerStatus {
  if (d.submittedAt) return "submitted";
  if (d.startedAt && (Object.keys(d.answers).length > 0 || d.index > 0)) return "in-progress";
  if (d.startedAt) return "in-progress";
  return "not-started";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAnswered(q: ParticipantQuestion, answers: Record<string, AnswerValue>, otherText: Record<string, string>): boolean {
  const v = answers[q.id];
  const other = (otherText[q.id] ?? "").trim();
  switch (q.type) {
    case "single":
    case "dropdown":
      if (typeof v !== "string" || !v) return false;
      return v === OTHER_ID ? other.length > 0 : true;
    case "multiple":
      if (!Array.isArray(v) || v.length === 0) return false;
      return v.includes(OTHER_ID) ? other.length > 0 : true;
    case "short":
    case "long":
      return typeof v === "string" && v.trim().length > 0;
    case "email":
      return typeof v === "string" && EMAIL.test(v.trim());
    case "rating":
      return typeof v === "number" && v >= 1;
  }
}

export function missingQuestions(form: ParticipantForm, answers: Record<string, AnswerValue>, otherText: Record<string, string>): ParticipantQuestion[] {
  return form.questions.filter((q) => q.required && !isAnswered(q, answers, otherText));
}

/** Short, plain-words summary of an answer for the review screen. */
export function describeAnswer(q: ParticipantQuestion, answers: Record<string, AnswerValue>, otherText: Record<string, string>): string {
  const v = answers[q.id];
  const labelOf = (id: string) => (id === OTHER_ID ? `Other: ${otherText[q.id] ?? ""}` : (q.options?.find((o) => o.id === id)?.label ?? id));
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return "";
  if (q.type === "single") return labelOf(String(v));
  if (q.type === "multiple") return (v as string[]).map(labelOf).join(", ");
  if (q.type === "dropdown") return q.optionsSource ? String(v) : labelOf(String(v));
  if (q.type === "rating") return `${v} out of ${q.ratingMax ?? 5}`;
  return String(v);
}

/** Admin-facing notes on a question that the person taking the form should not see. */
export function visibleHelper(q: ParticipantQuestion): string | null {
  if (!q.helper) return null;
  return /needs Beeliv confirmation|original list|filled in from/i.test(q.helper) ? null : q.helper;
}

/** "about n minutes": a rough guide of 1 minute for a choice answer and 2 for a written one, never under 2. */
export function estimateMinutes(form: ParticipantForm): number {
  if (form.timeLimitMinutes) return form.timeLimitMinutes;
  const written = form.questions.filter((q) => q.type === "long").length;
  const rest = form.questions.length - written;
  return Math.max(2, Math.round(rest * 0.5 + written * 2));
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

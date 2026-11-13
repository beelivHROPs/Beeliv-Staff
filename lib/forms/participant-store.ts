"use client";

/**
 * Participant-only forms store for the Applicant (Tests) and Staff (Forms) screens. Mock only.
 * See docs/contracts/forms-tests-uploads.md: a participant sees the questions and nothing else. This file and its
 * fixtures (participant-seed.ts) contain NO answer keys, points, marking data or other people's submissions, and import
 * nothing from lib/admin/**. The Admin side reads sent attempts via lib/admin/tests/participant-bridge.ts.
 */
import { useSyncExternalStore } from "react";
import { PARTICIPANT_DEPARTMENTS, PARTICIPANT_FORMS } from "./participant-seed";
import { hasSent, recordAttempt, sentVersion, subscribeOutbox } from "./participant-outbox";
import type { Attempt, ParticipantForm } from "./participant-types";

export type { Attempt, ParticipantForm, ParticipantQuestion } from "./participant-types";

export const SAMPLE_DEPARTMENTS: string[] = PARTICIPANT_DEPARTMENTS;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function listPublishedFor(audience: "applicants" | "staff"): ParticipantForm[] {
  return clone(PARTICIPANT_FORMS.filter((f) => f.audience === audience));
}

export function getForm(id: string): ParticipantForm | null {
  const f = PARTICIPANT_FORMS.find((x) => x.id === id);
  return f ? clone(f) : null;
}

/** Hands the person's own attempt over. Resolves with the submission id; rejects if it could not be sent. */
export async function submitAttempt(a: Attempt): Promise<{ id: string }> {
  const rec = recordAttempt(a);
  return { id: rec.id };
}

/** Re-render when the published forms change (fixed in the mock, so this never changes). */
export function useFormsVersion(): number {
  return 0;
}

/** True once this person has sent this form, whether from the Tests screen or inside a job application. */
export function useHasSent(takerId: string, formId: string): boolean {
  useSyncExternalStore(subscribeOutbox, sentVersion, () => 0);
  return hasSent(takerId, formId);
}

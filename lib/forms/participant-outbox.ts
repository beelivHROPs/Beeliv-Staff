/**
 * Participant-side record of attempts a person has SENT (mock; in memory for this visit). The participant screens write
 * here and read their own "already sent" state from here. It imports nothing from lib/admin/**: the Admin side reads
 * this outbox through lib/admin/tests/participant-bridge.ts. The real version is one server call plus a server-side read.
 */
import type { Attempt, SentAttempt } from "./participant-types";

let sent: SentAttempt[] = [];
let counter = 0;
const listeners = new Set<() => void>();

export function subscribeOutbox(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function listSentAttempts(): SentAttempt[] {
  return sent.map((s) => ({ ...s }));
}

export function sentVersion(): number {
  return sent.length;
}

/** Has this person already sent this form (in any way, including inside a job application)? */
export function hasSent(takerId: string, formId: string): boolean {
  return sent.some((s) => s.takerId === takerId && s.formId === formId);
}

export function recordAttempt(a: Attempt): SentAttempt {
  counter += 1;
  const rec: SentAttempt = JSON.parse(JSON.stringify({ ...a, id: `sub-p-${Date.now().toString(36)}-${counter}`, submittedAt: new Date().toISOString() }));
  sent = [rec, ...sent];
  listeners.forEach((l) => l());
  return { ...rec };
}

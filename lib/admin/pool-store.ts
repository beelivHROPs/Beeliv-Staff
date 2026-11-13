/**
 * DEV FIXTURE: the ONE in-memory record of who has been moved to the Talent
 * Pool during this session. The Applicants, Shortlisting and Talent Pool mocks
 * all read and write it, so a person moved from any screen shows up in all of
 * them, once (no duplicates: keyed by applicant id and by name against the
 * seeded pool). The real backend is one database; replace this with it.
 * People are FICTIONAL.
 */
import { getPrototypeMode, subscribePrototypeMode } from "./dev-controls";

export type PoolReason = "not-selected" | "withdrawn" | "shortlisted-unplaced";

export interface PoolMove {
  /** Internal application / applicant id of the record the person was moved from. */
  applicantId: string;
  name: string;
  location: string;
  department: string;
  vacancyId: string;
  vacancyTitle: string;
  reason: PoolReason;
  note: string | null;
  skills: string[];
  movedAt: string;
}

let moves: PoolMove[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

subscribePrototypeMode(() => {
  moves = [];
  emit();
});

export const subscribePool = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const poolMoves = (): PoolMove[] => (getPrototypeMode() === "empty" ? [] : moves);
export const isMoved = (applicantId: string) => moves.some((m) => m.applicantId === applicantId);

/** Returns false (and changes nothing) when the person is already in the pool. */
export function addToPool(move: Omit<PoolMove, "movedAt"> & { movedAt?: string }, alreadySeeded: (name: string) => boolean = () => false): boolean {
  if (isMoved(move.applicantId) || alreadySeeded(move.name)) return false;
  moves = [{ ...move, movedAt: move.movedAt ?? new Date().toISOString() }, ...moves];
  emit();
  return true;
}

export function removeMove(applicantId: string): void {
  moves = moves.filter((m) => m.applicantId !== applicantId);
  emit();
}

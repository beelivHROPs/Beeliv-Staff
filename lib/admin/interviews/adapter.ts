/**
 * Replaceable contract for Interviews: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rules live in a component. Every call must be re-checked by the
 * backend against role and client / outlet scope (RLS), and every write must
 * create an audit / history record (spec 16, 28.2). Nothing here approves or
 * selects a candidate: final approval belongs to Operations (REC-001).
 */
import type { AdapterEvent } from "../adapter";
import type { Conflict, ConflictQuery, InterviewDetail, InterviewsPage, InterviewsQuery, SaveScorecardInput, ScheduleInput } from "./types";

export interface InterviewsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listInterviews(query: InterviewsQuery): Promise<InterviewsPage>;
  /** Null when the interview does not exist or is outside the user's scope. */
  getInterview(id: string): Promise<InterviewDetail | null>;
  /** Advisory only: whether conflicts block a booking needs Beeliv confirmation. */
  checkConflicts(query: ConflictQuery): Promise<Conflict[]>;
  scheduleInterview(id: string, input: ScheduleInput): Promise<InterviewDetail>;
  rescheduleInterview(id: string, input: ScheduleInput): Promise<InterviewDetail>;
  cancelInterview(id: string, input: { reason: string }): Promise<InterviewDetail>;
  saveScorecard(id: string, input: SaveScorecardInput): Promise<InterviewDetail>;
}

/**
 * Replaceable contract for the Talent Pool: UI -> hooks -> service -> adapter
 * -> (dev fixture NOW, Supabase adapter LATER). The adapter fetches and
 * writes; no business rules live in a component. Every call must be
 * re-checked by the backend against role and client / outlet scope (RLS), and
 * both writes must create an audit / history record (spec 16, 28.2).
 */
import type { AdapterEvent } from "../adapter";
import type { AddToVacancyInput, RemoveFromPoolInput, TalentPoolPage, TalentPoolQuery } from "./types";

export interface TalentPoolAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listPool(query: TalentPoolQuery): Promise<TalentPoolPage>;
  addToVacancy(id: string, input: AddToVacancyInput): Promise<void>;
  /** Removes from the pool only: the applicant, their applications and history are retained. */
  removeFromPool(id: string, input: RemoveFromPoolInput): Promise<void>;
}

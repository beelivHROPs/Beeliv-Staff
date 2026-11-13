/**
 * Replaceable contract for Vacancies: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rule lives in a component. Every call must be re-checked by the
 * backend against role and client / outlet scope (RLS), and every write must
 * append an audit / activity record (spec 16).
 */
import type { AdapterEvent } from "../adapter";
import type { ActionInput, SaveIntent, VacanciesPage, VacancyConfig, VacancyDetail, VacancyInput, VacancyQuery } from "./types";


/**
 * Job photo (PROPOSAL): `VacancyContent.image` is optional and rides through
 * createVacancy / updateVacancy unchanged. `source: "upload"` needs a real
 * upload (see docs/contracts/public-jobs-frontend-plan.md "Job photo"); the
 * mock only holds a temporary browser object URL in `ref`.
 */
export interface VacancyAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getConfig(): Promise<VacancyConfig>;
  listVacancies(query: VacancyQuery): Promise<VacanciesPage>;
  /** null = not found or outside the user's scope. */
  getVacancy(id: string): Promise<VacancyDetail | null>;
  /** Throws VacancyValidationError on bad input. */
  createVacancy(input: VacancyInput, intent: SaveIntent): Promise<VacancyDetail>;
  updateVacancy(id: string, input: VacancyInput, intent: SaveIntent, expectedRevision?: number): Promise<VacancyDetail>;
  performAction(id: string, input: ActionInput, expectedRevision?: number): Promise<VacancyDetail>;
}

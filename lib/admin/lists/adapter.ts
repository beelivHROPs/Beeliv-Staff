/**
 * The replaceable contract between Lists & Rules and its data source:
 * UI -> hooks -> service -> adapter -> (dev fixture NOW, database LATER).
 * An adapter only loads and saves; it adds no business rules. The backend must
 * re-check every write against the user's role (RLS); hiding a button is not security.
 */
import type { ListsData } from "./types";

export interface ListsAdapter {
  /** Resolves when the lists may be shown. Throws RestrictedError (403) or Error. */
  load(): Promise<void>;
  /** Persists the full lists after a change. The dev fixture only waits. */
  save(next: ListsData): Promise<void>;
}

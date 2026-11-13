/**
 * Replaceable contract for SOPs, Training and Agreements: UI -> hooks ->
 * service -> adapter -> (dev fixture NOW, Supabase adapter LATER). The adapter
 * fetches and writes; no business rule lives in a component. Every call must be
 * re-checked by the backend against role and scope (RLS) and every write must
 * append an activity record. File bytes live in private storage: nothing here
 * returns a file URL.
 */
import type { AdapterEvent } from "../adapter";
import type { ActionInput, ContentConfig, ContentDetail, ContentInput, ContentPage, ContentQuery, SaveIntent } from "./types";

export interface ContentAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getConfig(): Promise<ContentConfig>;
  list(query: ContentQuery): Promise<ContentPage>;
  /** null = not found or outside the user's scope. */
  get(id: string): Promise<ContentDetail | null>;
  /** Throws ContentValidationError on bad input. */
  create(input: ContentInput, intent: SaveIntent): Promise<ContentDetail>;
  /** Editing a published item creates the next version as a draft; the live version stays visible to staff until it is published. */
  update(id: string, input: ContentInput, intent: SaveIntent): Promise<ContentDetail>;
  perform(id: string, input: ActionInput): Promise<ContentDetail>;
}

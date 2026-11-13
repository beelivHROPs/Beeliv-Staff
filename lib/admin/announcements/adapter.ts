/**
 * Replaceable contract for Announcements: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rule lives in a component. The backend re-checks role and scope on
 * every call, appends an activity record on every write, and owns scheduling
 * and expiry (a component never decides that an announcement has expired).
 * Email is not sent from here: it needs Beeliv confirmation.
 */
import type { AdapterEvent } from "../adapter";
import type { AnnouncementAction, AnnouncementConfig, AnnouncementDetail, AnnouncementInput, AnnouncementPage, AnnouncementQuery, SaveIntent } from "./types";

export interface AnnouncementAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getConfig(): Promise<AnnouncementConfig>;
  list(query: AnnouncementQuery): Promise<AnnouncementPage>;
  /** null = not found or outside the user's scope. */
  get(id: string): Promise<AnnouncementDetail | null>;
  /** Throws AnnouncementValidationError on bad input. */
  create(input: AnnouncementInput, intent: SaveIntent): Promise<AnnouncementDetail>;
  update(id: string, input: AnnouncementInput, intent: SaveIntent): Promise<AnnouncementDetail>;
  perform(id: string, action: AnnouncementAction): Promise<AnnouncementDetail>;
}

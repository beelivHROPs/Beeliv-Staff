/**
 * Operations Activity (audit viewer) data shapes (docs/contracts/ops-activity.md, DRAFT).
 * Read-only: nobody edits or deletes an event. Everything is FICTIONAL in the fixture.
 * An event never carries a NIN, bank value, pay amount or any other sensitive field:
 * `before` / `after` are short plain-language summaries chosen by the backend, and
 * `sensitive` only flags that the record touched a protected item so the UI can say
 * "details are hidden". Whether Operations may ever see more is a Beeliv decision.
 */
import type { ISODateTime } from "../types";

/** What happened. Past tense, one word. */
export type ActivityAction = "approved" | "sent-back" | "rejected" | "invited" | "assigned" | "published" | "verified" | "revealed" | "viewed";

/** What it happened to. */
export type ActivityEntityType = "approval" | "invitation" | "client" | "vacancy" | "document" | "agreement";

export interface ActivityEvent {
  id: string;
  /** Server-generated (BLV-AUD-...). Display only. */
  reference: string;
  at: ISODateTime;
  actorId: string;
  actorName: string;
  /** Plain label, e.g. "Head of Operations" or "HR". */
  actorRole: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  /** Human label of the record, e.g. "Selection: Ada Sample". */
  entityLabel: string;
  /** Where the record lives, when the viewer may open it. Null = no link. */
  entityHref: string | null;
  /** Short plain summary of the state before / after. Null when not applicable (e.g. an invitation has no "before"). */
  before: string | null;
  after: string | null;
  /** The reason or note recorded with the action, if any. */
  note: string | null;
  /** The record is a protected item (identity or bank detail): the UI says its details are hidden. */
  sensitive: boolean;
}

export type ActivityRange = "" | "today" | "7d" | "30d";

export interface ActivityQuery {
  search: string;
  action: ActivityAction | "";
  actorId: string;
  entityType: ActivityEntityType | "";
  range: ActivityRange;
}

export interface ActivityPage {
  rows: ActivityEvent[];
  total: number;
  facets: { actors: { id: string; name: string }[] };
  /** True when there are no events at all (not merely none matching). */
  workspaceEmpty: boolean;
}

export interface OpsActivityAdapter {
  /** Newest first. The backend re-checks that the caller is Operations (HR gets 403). */
  listActivity(query: ActivityQuery): Promise<ActivityPage>;
}

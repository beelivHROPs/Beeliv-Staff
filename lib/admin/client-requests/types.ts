/**
 * Client (workforce) Requests data shapes (spec 14 / 28.1 "Workforce requests"
 * inbox source). Admin half of /client/requests: a Client tells Beeliv what
 * staff it needs; HR picks it up, links or creates a vacancy, and closes it.
 * Nothing here publishes a vacancy.
 *
 * Open items (need Beeliv confirmation, not decided in a component):
 * - the reason taxonomy (the Client app sends backend-authored text);
 * - who may decline a request and whether a decline is shown to the client
 *   (the Client app has only one closed state, so Fulfilled and Declined both
 *   read "Closed" to the client until Beeliv decides);
 * - the new-request response time (the adapter decides `needsAttention`).
 * References come from the adapter only. Records are keyed by internal `id`.
 * All people in the mock are FICTIONAL.
 */
import type { ISODateTime } from "../types";

/**
 * new = just sent; under-review = HR acknowledged; in-recruitment and
 * candidates-submitted mirror the Client app; fulfilled / declined end it.
 */
export type RequestStatus = "new" | "under-review" | "in-recruitment" | "candidates-submitted" | "fulfilled" | "declined";

export type RequestTab = "new" | "in-progress" | "fulfilled" | "closed";

export interface PersonRef {
  id: string;
  name: string;
  /** True for the signed-in HR user, so the UI can offer "Assign to me". */
  isMe?: boolean;
}

export interface RequestRow {
  /** Internal request id (route key). */
  id: string;
  /** Server-generated request reference (display only). */
  reference: string;
  clientId: string;
  client: string;
  outlet: string | null;
  role: string;
  department: string;
  headcount: number;
  /** Client's desired resumption date, YYYY-MM-DD. */
  neededBy: string;
  reason: string;
  status: RequestStatus;
  assignedTo: PersonRef | null;
  linkedVacancy: { id: string; title: string } | null;
  submittedAt: ISODateTime;
  nextAction: string | null;
  needsAttention: boolean;
}

export interface RequestActivityEntry {
  id: string;
  actor: string;
  at: ISODateTime;
  action: string;
  from: string | null;
  to: string | null;
  note: string | null;
}

export interface RequestCapabilities {
  canAssign: boolean;
  canAcknowledge: boolean;
  canFulfil: boolean;
  canDecline: boolean;
}

export interface RequestDetail extends RequestRow {
  notes: string;
  requestedBy: { name: string; role: string };
  /** HR users a request can be assigned to. */
  hrOptions: PersonRef[];
  /** Why it was closed (decline reason or fulfilment note). */
  closingNote: string | null;
  activity: RequestActivityEntry[];
  capabilities: RequestCapabilities;
}

export interface RequestsQuery {
  search: string;
  tab: RequestTab;
  clientId: string;
  /** Rows to return (Show more grows this). */
  limit: number;
}

export interface RequestsPage {
  rows: RequestRow[];
  total: number;
  /** After search and client filter, before the tab. */
  tabCounts: Record<RequestTab, number>;
  facets: { clients: { id: string; name: string }[] };
  workspaceEmpty: boolean;
}

export interface AssignInput {
  assigneeId: string;
}
export interface FulfilInput {
  note: string;
}
export interface DeclineInput {
  reason: string;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "New",
  "under-review": "Acknowledged",
  "in-recruitment": "Recruitment in progress",
  "candidates-submitted": "Candidates submitted",
  fulfilled: "Fulfilled",
  declined: "Declined",
};

export const TAB_LABEL: Record<RequestTab, string> = { new: "New", "in-progress": "In progress", fulfilled: "Fulfilled", closed: "Closed" };
export const TAB_ORDER: RequestTab[] = ["new", "in-progress", "fulfilled", "closed"];

/** What the Client app shows for each Admin status (components/client/requests/meta.tsx). */
export const CLIENT_SEES: Record<RequestStatus, string> = {
  new: "Submitted",
  "under-review": "Under review",
  "in-recruitment": "Recruitment in progress",
  "candidates-submitted": "Candidates ready for review",
  fulfilled: "Closed",
  declined: "Closed",
};

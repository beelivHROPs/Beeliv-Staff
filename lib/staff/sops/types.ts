/**
 * Staff SOP library (links only). Beeliv adds LINKS to documents, videos and
 * pages; the app never hosts lessons, quizzes, certificates or badges, and it
 * only lists SOPs assigned to the signed-in person. What is new here is the
 * per-person READ RECEIPT (which SOP, which version, when). Mock data only for
 * now; the shape is the request to the backend (see
 * docs/contracts/frontend-backend-needs-2026-10-17.md).
 */
import type { ISODate, ISODateTime } from "../types";

export type SopKind = "document" | "video" | "page";

/** One assigned SOP as the Staff screens show it. The server returns this already scoped to the person. */
export interface SopItem {
  /** Assignment id (also the route segment of the older detail page). */
  id: string;
  sopId: string;
  title: string;
  category: string;
  description: string;
  version: string;
  kind: SopKind;
  /** Where the SOP lives. Must be https; the screen re-checks before opening. */
  url: string;
  /** Estimated minutes, when Beeliv supplied it. */
  minutes: number | null;
  assignedAt: ISODate;
  dueDate: ISODate | null;
  required: boolean;
  /** Beeliv asked for a sign-off after reading. */
  needsSignOff: boolean;
  signedOff: boolean;
  /** First time this person opened this VERSION; null = not read yet. */
  readAt: ISODateTime | null;
  /** Most recent open of this version; drives "Continue where you left off". */
  lastOpenedAt: ISODateTime | null;
}

/** The stored receipt (one per person, SOP and version). */
export interface SopReceipt {
  sopId: string;
  version: string;
  readAt: ISODateTime;
  lastOpenedAt: ISODateTime;
}

export type SopStatus = "new" | "sign-off" | "read";

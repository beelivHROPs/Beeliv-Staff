/**
 * Offers data shapes (Master Spec v1.5 sections 6.5, 23.4, 14, 28.1). Presentation-facing only.
 * The Applicant app's Offer page (components/applicant/OfferBody.tsx) only knows three states
 * (pending / accepted / declined); this is the Admin half that produces them. All people are
 * FICTIONAL. Records are keyed by internal `id`; `BLV-*` references come only from the adapter.
 * Money amounts arrive as display text from the adapter (no currency maths in the UI).
 */
import type { ISODateTime } from "../types";

/**
 * Lifecycle (brief): Draft -> Submitted for approval -> Approved (by Operations; HR can NOT approve)
 * -> Sent -> Viewed -> Accepted / Declined / Expired / Withdrawn.
 */
export type OfferStatus = "draft" | "pending-approval" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "withdrawn";

/** List tabs by lifecycle. `sent` groups Sent + Viewed; `closed` groups Declined, Expired and Withdrawn. */
export type OfferTab = "all" | "draft" | "pending-approval" | "approved" | "sent" | "accepted" | "closed";

/** Public = shown to the applicant on the Offer page; Internal = HR / Operations only (spec 15 pattern). */
export type PayVisibility = "public" | "internal";

export interface PayLine {
  /** Row key inside this offer (not a record id). */
  key: string;
  label: string;
  /** Display text, e.g. "NGN 150,000 per month". The amount rules belong to Beeliv; nothing is calculated here. */
  value: string;
  visibility: PayVisibility;
}

export interface OfferPerson {
  /** Internal Applicant id: link target and avatar subject. */
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface OfferRow {
  id: string;
  /** Server-generated (BLV-OFR-...). Display only. */
  reference: string;
  applicant: OfferPerson;
  vacancyId: string;
  vacancy: string;
  clientId: string;
  client: string;
  outletId: string;
  outlet: string;
  role: string;
  startDate: string;
  status: OfferStatus;
  /** Last day the applicant can respond, if set. */
  expiresAt: string | null;
  updatedAt: ISODateTime;
  /** HR should look at it (approved and waiting to be sent, or expiring). */
  needsAttention: boolean;
}

export interface OfferHistoryEntry {
  id: string;
  at: ISODateTime;
  actor: string;
  action: string;
  from: string | null;
  to: string | null;
  reason?: string;
}

export type OfferAction = "edit" | "submit" | "send" | "withdraw" | "resend" | "convert" | "approve";
/* "approve" is the Head of Operations' own action (they never "submit"); the server must refuse it for every other role. */

export interface OfferApproval {
  /** Operations decision. HR sees it read-only. */
  state: "waiting" | "approved";
  by: string | null;
  at: ISODateTime | null;
}

/** The pending staff-activation record created by "Convert to staff". */
export interface StaffActivation {
  id: string;
  status: "pending-activation";
  createdAt: ISODateTime;
  createdBy: string;
  clientName: string;
  outletName: string;
  role: string;
  startDate: string;
}

export interface OfferDetail extends OfferRow {
  employmentType: string;
  location: string;
  reportingTo: string;
  pay: PayLine[];
  /** Letter slot: wording, signatory and format need Beeliv confirmation, so only a file name placeholder exists. */
  letterFileName: string;
  approval: OfferApproval | null;
  sentAt: ISODateTime | null;
  viewedAt: ISODateTime | null;
  respondedAt: ISODateTime | null;
  declineReason: string | null;
  withdrawReason: string | null;
  allowedActions: OfferAction[];
  activation: StaffActivation | null;
  history: OfferHistoryEntry[];
}

export interface OfferQuery {
  search: string;
  tab: OfferTab;
  clientId: string;
  vacancyId: string;
}

export interface OffersPage {
  rows: OfferRow[];
  total: number;
  tabCounts: Record<OfferTab, number>;
  facets: { clients: { id: string; name: string }[]; vacancies: { id: string; name: string }[] };
  canCreate: boolean;
  /** True when there are no offers at all (not merely none matching). */
  workspaceEmpty: boolean;
}

/** Choices for the offer form: all configurable adapter data. */
export interface OfferFacets {
  applicants: { id: string; name: string; vacancyId: string }[];
  vacancies: { id: string; name: string; clientId: string; outletId: string; role: string }[];
  clients: { id: string; name: string }[];
  outlets: { id: string; clientId: string; name: string }[];
  roles: string[];
  employmentTypes: string[];
}

export interface OfferInput {
  applicantId: string;
  vacancyId: string;
  clientId: string;
  outletId: string;
  role: string;
  startDate: string;
  employmentType: string;
  location: string;
  reportingTo: string;
  expiresAt: string;
  pay: PayLine[];
}

export interface ConvertInput {
  /** Both must be confirmed by the user before the record is created. */
  confirmSamePerson: boolean;
  confirmNoDuplicate: boolean;
  clientId: string;
  outletId: string;
  role: string;
  startDate: string;
}

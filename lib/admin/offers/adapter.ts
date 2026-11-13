/**
 * Replaceable contract for Offers: UI -> hooks -> service -> adapter -> (dev
 * fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rule lives in a component. Every call must be re-checked by the
 * backend against role and scope (RLS), and every write MUST create a history
 * record (spec 30, 32.2). Approval belongs to Operations: `approve` is for the
 * Head of Operations only (the server must refuse it for HR); HR uses submitForApproval. Nothing is emailed by the demo adapter.
 */
import type { AdapterEvent } from "../adapter";
import type { ConvertInput, OfferDetail, OfferFacets, OfferInput, OfferQuery, OffersPage } from "./types";

export interface OffersAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listOffers(query: OfferQuery): Promise<OffersPage>;
  /** Null when the offer does not exist or is outside the user's scope. */
  getOffer(id: string): Promise<OfferDetail | null>;
  getFacets(): Promise<OfferFacets>;
  createOffer(input: OfferInput): Promise<OfferDetail>;
  updateDraft(id: string, input: OfferInput): Promise<OfferDetail>;
  submitForApproval(id: string): Promise<OfferDetail>;
  /** Head of Operations approves a draft or submitted offer directly (they do not "submit"). Server: Operations only. */
  approve(id: string): Promise<OfferDetail>;
  /** Only valid once Operations approved it. In-app notification only; no email in the demo. */
  send(id: string): Promise<OfferDetail>;
  withdraw(id: string, reason: string): Promise<OfferDetail>;
  /** `expiresAt` is required for an expired offer. */
  resend(id: string, expiresAt: string | null): Promise<OfferDetail>;
  convertToStaff(id: string, input: ConvertInput): Promise<OfferDetail>;
  /** DEV ONLY: stands in for the Operations app's approval decision. Delete with the mock. */
  devSimulateOperationsApproval(id: string): Promise<OfferDetail>;
  /** DEV ONLY: stands in for the applicant opening / answering the offer. Delete with the mock. */
  devSimulateApplicantResponse(id: string, response: "viewed" | "accepted" | "declined"): Promise<OfferDetail>;
}

/** Labels, tones and link helpers for Offers. Display only: lifecycle rules live in the adapter. */
import type { ChipTone } from "@/components/client/StatusChip";
import type { OfferAction, OfferStatus, OfferTab } from "@/lib/admin/offers/types";

export { formatIsoDate, formatYmd } from "@/components/admin/vacancies/meta";

export const OFFERS_HREF = "/admin/recruitment/offers";
export const offerHref = (id: string) => `${OFFERS_HREF}/${id}`;
export const offerEditHref = (id: string) => `${OFFERS_HREF}/${id}/edit`;
export const NEW_OFFER_HREF = `${OFFERS_HREF}/new`;
export const newOfferForApplicantHref = (applicantId: string) => `${NEW_OFFER_HREF}?applicantId=${applicantId}`;
export const applicantRecordHref = (id: string) => `/admin/recruitment/applicants/${id}`;

export const STATUS_LABEL: Record<OfferStatus, string> = {
  draft: "Draft",
  "pending-approval": "Submitted for approval",
  approved: "Approved",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

export const STATUS_TONE: Record<OfferStatus, ChipTone> = {
  draft: "mute",
  "pending-approval": "warn",
  approved: "info",
  sent: "plum",
  viewed: "plum",
  accepted: "ok",
  declined: "bad",
  expired: "mute",
  withdrawn: "mute",
};

export const TAB_ORDER: OfferTab[] = ["all", "draft", "pending-approval", "approved", "sent", "accepted", "closed"];
export const TAB_LABEL: Record<OfferTab, string> = {
  all: "All",
  draft: "Drafts",
  "pending-approval": "Awaiting approval",
  approved: "Approved",
  sent: "Sent",
  accepted: "Accepted",
  closed: "Closed",
};

export const ACTION_LABEL: Record<OfferAction, string> = {
  edit: "Edit draft",
  submit: "Submit for approval",
  approve: "Approve offer",
  send: "Send offer",
  withdraw: "Withdraw",
  resend: "Resend",
  convert: "Convert to staff",
};

export const isTab = (v: string): v is OfferTab => (TAB_ORDER as string[]).includes(v);

/** The lifecycle in order, for the stepper. Closed outcomes replace the last steps. */
export const LIFECYCLE: OfferStatus[] = ["draft", "pending-approval", "approved", "sent", "viewed", "accepted"];

/**
 * What the Applicant app shows for this status (lib/applicant Offer.status:
 * pending / accepted / declined). Expired and Withdrawn have no applicant-side
 * wording yet: that needs Beeliv confirmation.
 */
export function applicantView(status: OfferStatus): { visible: boolean; label: string; tone: ChipTone; needsConfirmation?: boolean } {
  switch (status) {
    case "sent":
    case "viewed":
      return { visible: true, label: "Awaiting your response", tone: "warn" };
    case "accepted":
      return { visible: true, label: "Accepted", tone: "ok" };
    case "declined":
      return { visible: true, label: "Declined", tone: "mute" };
    case "expired":
    case "withdrawn":
      return { visible: false, label: "No longer available", tone: "mute", needsConfirmation: true };
    default:
      return { visible: false, label: "Not visible to the applicant yet", tone: "mute" };
  }
}

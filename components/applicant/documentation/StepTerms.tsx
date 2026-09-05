import { Card, CardContent } from "@/components/ui/card";
import { DISABLED_FIELD_TITLE } from "./constants";

/**
 * Step 6 — Terms & Declarations. Six items, substance per docs/BEELIV-
 * SOURCE-OF-TRUTH.md §7 "Terms and Declarations" — read directly, not
 * paraphrased away from its legal/business meaning. Item 5's one-off
 * placement-fee wording is kept consistent with components/shared/Faq.tsx's
 * homepage "Is there a fee to apply?" answer. Acknowledgment-only: no
 * payment collection, tracking, or invoicing mechanism of any kind is built
 * here or implied — payment processing is permanently out of scope
 * (Level 1, Proposal §4).
 */
const TERMS_ITEMS = [
  {
    title: "Confirmation of Information Provided",
    body: "I confirm that the personal, professional, educational, employment, and other information I have provided is true, accurate, and complete. I understand that false, misleading, or incomplete information may affect my placement or employment.",
  },
  {
    title: "Confidentiality & Non-Disclosure Agreement",
    body: "I agree to maintain strict confidentiality regarding information, documents, business processes, client information, staff information, and other confidential matters I access during recruitment, placement, or employment, and not to disclose, copy, share, or use such information for any unauthorized purpose.",
  },
  {
    title: "Medical Fitness",
    body: "I confirm my physical and medical fitness for the position applied for, and agree to provide or undergo medical fitness documentation or assessment where required.",
  },
  {
    title: "Media Consent",
    body: "I consent to Beeliv Hospitality and/or the hiring organization using photographs, videos, or other media recorded during official onboarding, training, workplace activities, events, or professional engagements for legitimate corporate, training, recruitment, marketing, or promotional purposes, potentially including official communication and social media platforms.",
  },
  {
    title: "One-Off Placement Fee",
    body: "I understand that for candidates directly recruited and successfully placed through Beeliv HR, a one-off placement fee of 20% of the applicable first-month emolument may apply, as communicated and agreed during the recruitment/placement process. This is a one-time charge, not a recurring cost.",
  },
  {
    title: "Acceptance & Acknowledgement",
    body: "I confirm that I have read, understood, and agreed to the terms above, and confirm the accuracy of the information I have provided. This acceptance forms part of Beeliv Hospitality's onboarding documentation.",
  },
];

export function StepTerms() {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Terms & Declarations</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Please review and acknowledge each item below.
        </p>
        <div className="space-y-3">
          {TERMS_ITEMS.map((item, i) => (
            <label
              key={item.title}
              className="flex items-start gap-3 rounded-lg border border-border px-3.5 py-3"
            >
              <input
                type="checkbox"
                disabled
                title={DISABLED_FIELD_TITLE}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-input disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {i + 1}. {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

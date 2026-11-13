/**
 * Onboarding Terms and Conditions — the six terms shown on the last step of
 * the applicant's Documentation form.
 *
 * VERBATIM from docs/requirements/beeliv-onboarding-documentation-form-2026-09-29.md
 * ("Terms and conditions (verbatim)"), as supplied by the project lead.
 * docs/BEELIV-SOURCE-OF-TRUTH.md §7: "Do not rewrite the legal meaning of any
 * of these without management approval." Do NOT edit, shorten, reflow or
 * paraphrase any string below — change it only when the source document
 * changes, and copy it character for character.
 *
 * Numbering: the pasted source numbered every term "1." (a list-formatting
 * artifact); the requirements doc numbers them 1–6, which is followed here.
 *
 * Item 5 (placement fee) is an acknowledgement only. Per SOURCE-OF-TRUTH §7
 * no payment collection / tracking / invoicing of any kind is built from it.
 */

/** Introductory line shown above the six terms (verbatim). */
export const DOCUMENTATION_TERMS_INTRO =
  "Terms and conditions- As part of our onboarding documentation, all applicants are required to read, understand, and confirm the following terms;";

export type DocumentationTerm = {
  /** 1–6, as numbered in the requirements doc. */
  number: number;
  title: string;
  /** Each paragraph exactly as written in the source. */
  paragraphs: readonly string[];
};

export const DOCUMENTATION_TERMS: readonly DocumentationTerm[] = [
  {
    number: 1,
    title: "Confirmation of Information Provided",
    paragraphs: [
      "I confirm that all personal, professional, educational, employment, and other information provided to Beeliv Hospitality is true, accurate, and complete to the best of my knowledge.",
      "I understand that providing false, misleading, or incomplete information may affect my placement or employment.",
    ],
  },
  {
    number: 2,
    title: "Confidentiality & Non-Disclosure Agreement",
    paragraphs: [
      "I agree to maintain strict confidentiality regarding information, documents, business processes, client information, staff information, and other confidential matters accessed during my recruitment, placement, or employment.",
      "I will not disclose, copy, share, or use confidential information for unauthorized purposes.",
    ],
  },
  {
    number: 3,
    title: "Medical Fitness",
    paragraphs: [
      "I confirm that I am physically and medically fit to perform the duties associated with the position for which I am being considered.",
      "Where required, I agree to provide or undergo appropriate medical fitness documentation or assessment in accordance with the requirements of the hiring organization.",
    ],
  },
  {
    number: 4,
    title: "Media Consent",
    paragraphs: [
      "I consent to Beeliv Hospitality and/or the hiring organization using photographs, videos, or other media recorded during official onboarding, training, workplace activities, events, or professional engagements for legitimate corporate, training, recruitment, marketing, or promotional purposes.",
      "Where applicable, I understand that such materials may be used on official communication and social media platforms.",
    ],
  },
  {
    number: 5,
    title: "One-Off Placement Fee",
    paragraphs: [
      "For candidates who are directly recruited and successfully placed into employment through Beeliv HR, a one-off placement fee of 20% of the applicable first-month emolument shall apply, as communicated and agreed during the recruitment/placement process.",
      "This is a one-time placement charge and is not a recurring monthly fee.",
    ],
  },
  {
    number: 6,
    title: "Acceptance & Acknowledgement",
    paragraphs: [
      "By signing below, I confirm that I have read, understood, and agreed to the above onboarding terms and conditions and that the information I have provided to Beeliv HR is accurate.",
      "I understand that acceptance of these terms forms part of my onboarding documentation with Beeliv Hospitality.",
    ],
  },
];

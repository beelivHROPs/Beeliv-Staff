/**
 * The agreements PUBLISHED in the real database by M12 (docs/contracts/auth-m12-agreements-from-supplied-documents.sql),
 * copied verbatim so the local preview shows exactly what real people will read and accept. Generated from that file;
 * if the SQL changes, regenerate this file. Client has no agreement: Beeliv has not supplied Client wording.
 * Preview use only: in live mode the agreements always come from the server.
 */
export type PublishedAgreement = { code: string; title: string; body: string; required: boolean };
export const PUBLISHED_AGREEMENTS: Record<"staff" | "admin" | "client", PublishedAgreement[]> = {
  "staff": [
    {
      "code": "staff-welfare-policy-ack",
      "title": "Staff Welfare, HR & Workplace Policy Standard acknowledgement",
      "body": "I confirm that I have received, read and understood the Beeliv Hospitality Staff Welfare, HR & Workplace Policy Standard and agree to comply with the applicable requirements.",
      "required": true
    },
    {
      "code": "onboarding-confirmation-of-information",
      "title": "Confirmation of Information Provided",
      "body": "I confirm that all personal, professional, educational, employment, and other information provided to Beeliv Hospitality is true, accurate, and complete to the best of my knowledge.\n\nI understand that providing false, misleading, or incomplete information may affect my placement or employment.",
      "required": true
    },
    {
      "code": "onboarding-confidentiality-nda",
      "title": "Confidentiality & Non-Disclosure Agreement",
      "body": "I agree to maintain strict confidentiality regarding information, documents, business processes, client information, staff information, and other confidential matters accessed during my recruitment, placement, or employment.\n\nI will not disclose, copy, share, or use confidential information for unauthorized purposes.",
      "required": true
    },
    {
      "code": "onboarding-medical-fitness",
      "title": "Medical Fitness",
      "body": "I confirm that I am physically and medically fit to perform the duties associated with the position for which I am being considered.\n\nWhere required, I agree to provide or undergo appropriate medical fitness documentation or assessment in accordance with the requirements of the hiring organization.",
      "required": true
    },
    {
      "code": "onboarding-acceptance-acknowledgement",
      "title": "Acceptance & Acknowledgement",
      "body": "By signing below, I confirm that I have read, understood, and agreed to the above onboarding terms and conditions and that the information I have provided to Beeliv HR is accurate.\n\nI understand that acceptance of these terms forms part of my onboarding documentation with Beeliv Hospitality.",
      "required": true
    },
    {
      "code": "onboarding-media-consent",
      "title": "Media Consent",
      "body": "I consent to Beeliv Hospitality and/or the hiring organization using photographs, videos, or other media recorded during official onboarding, training, workplace activities, events, or professional engagements for legitimate corporate, training, recruitment, marketing, or promotional purposes.\n\nWhere applicable, I understand that such materials may be used on official communication and social media platforms.",
      "required": false
    }
  ],
  "admin": [
    {
      "code": "staff-welfare-policy-ack",
      "title": "Staff Welfare, HR & Workplace Policy Standard acknowledgement",
      "body": "I confirm that I have received, read and understood the Beeliv Hospitality Staff Welfare, HR & Workplace Policy Standard and agree to comply with the applicable requirements.",
      "required": true
    },
    {
      "code": "onboarding-confidentiality-nda",
      "title": "Confidentiality & Non-Disclosure Agreement",
      "body": "I agree to maintain strict confidentiality regarding information, documents, business processes, client information, staff information, and other confidential matters accessed during my recruitment, placement, or employment.\n\nI will not disclose, copy, share, or use confidential information for unauthorized purposes.",
      "required": true
    }
  ],
  "client": []
};

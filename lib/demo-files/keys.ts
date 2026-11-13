/**
 * DEMO ONLY (see store.ts): which stored demo file belongs to which mock document.
 *
 * Each app's mock has its own document ids. The demo applicant is Sarah Okafor in the
 * Applicant app; Admin has no Sarah, so her files are shown on Admin applicant a-003
 * ("Chidi Sample") as the stand-in. A file added for Sarah's CV / photo / ID / certificate /
 * guarantor form therefore also opens on a-003's matching Admin documents. Nothing here
 * exists in the real system; the server links documents by their real ids.
 */

/** Admin applicant that stands in for the demo applicant. */
export const DEMO_ADMIN_APPLICANT_ID = "a-003";

/** Applicant document type -> shared demo key. Other types are keyed by their own id. */
const BY_TYPE: Record<string, string> = {
  cv: "demo-sarah:cv",
  "passport-photo": "demo-sarah:passport-photo",
  "valid-id": "demo-sarah:valid-id",
  "educational-certificate": "demo-sarah:educational-certificate",
  "guarantor-form": "demo-sarah:guarantor-form",
  "reference-letter": "demo-sarah:reference-letter",
  "medical-fitness": "demo-sarah:medical-fitness",
};

/** Admin document-type label -> Applicant document type key. */
const ADMIN_LABEL_TO_TYPE: Record<string, string> = {
  CV: "cv",
  "Passport photograph": "passport-photo",
  "Identity document": "valid-id",
  "Educational certificate": "educational-certificate",
  "Guarantor form": "guarantor-form",
  "Reference letter": "reference-letter",
  "Medical/Fitness document": "medical-fitness",
};

export function applicantFileKey(doc: { id: string; docType?: string }): string {
  return (doc.docType && BY_TYPE[doc.docType]) || `demo-applicant:${doc.id}`;
}

/**
 * The demo key for an Admin document. The stand-in applicant's documents share Sarah's real
 * demo files. Every other document that has a file (`hasFile`) gets a "demo-sample:" key,
 * which the store resolves to the bundled "Sample preview" unless a file was stored for it.
 */
export function adminFileKey(ownerId: string, docTypeLabel: string, hasFile = false): string | null {
  if (!hasFile) return null;
  if (ownerId === DEMO_ADMIN_APPLICANT_ID) {
    const type = ADMIN_LABEL_TO_TYPE[docTypeLabel];
    if (type) return BY_TYPE[type];
  }
  return `demo-sample:${ownerId}:${docTypeLabel}`;
}

export const staffFileKey = (docId: string) => `demo-staff:${docId}`;

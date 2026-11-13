/**
 * Client document access (project-lead decision 1, 2026-10-18). A Client user may preview
 * and download documents of candidates and staff in THEIR OWN organisation/outlets that
 * relate to their placements. Highly sensitive types (NIN, bank, ID image, medical) are never
 * shown to Clients: only their status, with "Held securely by Beeliv". No print control.
 *
 * Presentation helper only. The real rule is server-side: a Client-scoped getDocumentAccess
 * with an allow-list of document types, an audit event and a short-lived signed link
 * (docs/contracts/frontend-backend-needs-2026-10-17.md). The type test below is a deny-by-default
 * stand-in for that allow-list so the prototype never renders a sensitive file.
 */

/** Types a Client may open. Anything else is treated as sensitive (deny by default) except the known operational ones. */
const ALLOWED = /\b(cv|resume|curriculum|reference|certificate|certification|training|licen[cs]e|permit|food (handling|safety)|guarantor|contract|testimonial)\b/i;
/** Always sensitive, even if a word above also matches. */
const SENSITIVE = /\b(nin|national\s*id|identity|id\s*(card|image|document)|valid\s*id|passport|bank|banking|account\s*number|salary\s*account|medical|fitness|health|photo|selfie)\b/i;

/** True when a Client must NOT open this document type (status only). */
export function isSensitiveForClient(documentType: string): boolean {
  if (SENSITIVE.test(documentType)) return true;
  return !ALLOWED.test(documentType);
}

/** Demo-file key for a Client-visible document (resolves to the bundled sample preview unless a real demo file was stored). */
export const clientFileKey = (ownerId: string, documentType: string) => `demo-sample:client-${ownerId}:${documentType}`;

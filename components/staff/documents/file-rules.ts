/**
 * Client-side file checks for Staff uploads (leave attachments, documents).
 * TBD: 5 MB and PDF/JPG/PNG mirror the Applicant upload rules; Beeliv has not
 * confirmed Staff-specific limits. Files stay in memory in the dev fixture and
 * are never stored or read.
 */
export const MAX_BYTES = 5_000_000;
export const ACCEPT = ".pdf,.jpg,.jpeg,.png";
export const FORMATS = "PDF, JPG or PNG up to 5 MB";

/** Returns a plain-language problem, or null when the file is acceptable. */
export function fileProblem(file: File): string | null {
  if (file.size < 1) return "That file is empty. Please choose another one.";
  if (file.size > MAX_BYTES) return "That file is larger than 5 MB. Please choose a smaller one.";
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return "Please choose a PDF, JPG or PNG file.";
  return null;
}

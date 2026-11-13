/**
 * Applicant documents: presentation helpers shared by the Documents page,
 * Overview and Application detail, so every screen shows the same glyph and
 * the same Module 1 §3 status wording for a document.
 */
import {
  Award,
  BriefcaseBusiness,
  FileCheck2,
  FilePenLine,
  FileText,
  Files,
  IdCard,
  Image as ImageIcon,
  ScrollText,
  Users,
  type LucideIcon,
} from "@/components/applicant/icons";
import { documentStatusLabel, documentTypeOf } from "@/lib/applicant/reference-data";
import type { ApplicantDocument, DocumentTypeKey } from "@/lib/applicant/types";

export const DOC_TYPE_ICON: Record<DocumentTypeKey, LucideIcon> = {
  cv: FileText,
  "passport-photo": ImageIcon,
  "valid-id": IdCard,
  "educational-certificate": Award,
  "professional-certificate": Award,
  "employment-evidence": BriefcaseBusiness,
  "guarantor-form": FilePenLine,
  "reference-contacts": Users,
  "reference-letter": ScrollText,
  "medical-fitness": FileCheck2,
  other: Files,
};

export function documentIcon(doc: Pick<ApplicantDocument, "docType" | "name">): LucideIcon {
  const t = documentTypeOf(doc);
  return t ? DOC_TYPE_ICON[t.key] : FileText;
}

export type DocChipTone = "ok" | "info" | "warn" | "mute";

/** Module 1 §3 label + chip tone for one document record. */
export function documentStatus(doc: Pick<ApplicantDocument, "category" | "status" | "resubmitted">): { label: string; tone: DocChipTone } {
  const label = documentStatusLabel(doc);
  const tone: DocChipTone = doc.status === "verified" || doc.status === "pending-review" ? "ok" : "warn";
  return { label, tone };
}

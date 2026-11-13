"use client";

/**
 * Small shared pieces for the Documentation queue and viewer. Reuses:
 * StatusMark (components/admin/standard), Initials (admin overview), documentIcon-style
 * glyphs from the applicant document-meta file's icon set.
 */
import { StatusMark } from "@/components/admin/standard/StatusMark";
import { DOC_TYPE_ICON } from "@/components/applicant/document-meta";
import { FileText, type LucideIcon } from "@/components/applicant/icons";
import { STATUS_LABEL } from "@/lib/admin/documentation/mock";
import type { DocumentStatus } from "@/lib/admin/documentation/types";

const TONE: Record<DocumentStatus, "warn" | "info" | "ok"> = {
  "needs-review": "warn",
  missing: "warn",
  "resubmission-required": "warn",
  resubmitted: "info",
  verified: "ok",
};

export function DocStatusChip({ status }: { status: DocumentStatus }) {
  return <StatusMark tone={TONE[status]}>{STATUS_LABEL[status]}</StatusMark>;
}

const BY_LABEL: [string, keyof typeof DOC_TYPE_ICON][] = [
  ["CV", "cv"],
  ["Passport", "passport-photo"],
  ["Identity", "valid-id"],
  ["Educational", "educational-certificate"],
  ["Guarantor", "guarantor-form"],
  ["Reference", "reference-letter"],
  ["Medical", "medical-fitness"],
];

export function docTypeIcon(label: string): LucideIcon {
  const hit = BY_LABEL.find(([p]) => label.startsWith(p));
  return hit ? DOC_TYPE_ICON[hit[1]] : FileText;
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  return bytes < 1_000_000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

"use client";

/** Small shared pieces and plain-language labels for the Tests & Forms screens. */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, LockKeyhole } from "@/components/applicant/icons";
import { StatusChip, type ChipTone } from "@/components/client/StatusChip";
import { useNoticeSound } from "@/lib/admin/use-notice-sound";
import type { FormAudience, FormKind, FormQuestion, FormStatus, QuestionType, SubmissionStatus } from "@/lib/forms/types";

export const TESTS_HREF = "/admin/recruitment/tests";
export const NEW_FORM_HREF = `${TESTS_HREF}/new`;
export const formHref = (id: string) => `${TESTS_HREF}/${id}`;
export const resultsHref = (id: string) => `${TESTS_HREF}/${id}/results`;
export const submissionHref = (formId: string, submissionId: string) => `${TESTS_HREF}/${formId}/results/${submissionId}`;
/** Applicant profile link, defined here (the shared link helpers are not mine to edit). */
export const applicantProfileHref = (id: string) => `/admin/recruitment/applicants/${id}`;

export const KIND_LABEL: Record<FormKind, string> = { test: "Test", appraisal: "Appraisal" };
export const STATUS_LABEL: Record<FormStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };
const STATUS_TONE: Record<FormStatus, ChipTone> = { draft: "warn", published: "ok", archived: "mute" };
export const AUDIENCE_LABEL: Record<FormAudience, string> = { applicants: "Applicants", staff: "Beeliv staff", "client-staff": "A client's staff" };
export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = { "in-progress": "In progress", submitted: "Waiting to be marked", marked: "Marked" };
const SUBMISSION_TONE: Record<SubmissionStatus, ChipTone> = { "in-progress": "mute", submitted: "warn", marked: "ok" };
export const RECO_LABEL = { proceed: "Proceed", hold: "Hold", "needs-another-stage": "Needs another stage" } as const;

export const TYPE_LABEL: Record<QuestionType, string> = {
  single: "Choose one",
  multiple: "Choose several",
  dropdown: "Dropdown list",
  short: "Short answer",
  long: "Long answer",
  rating: "Rating (1 to 5)",
  email: "Email address",
};
export const isChoice = (t: QuestionType) => t === "single" || t === "multiple" || t === "dropdown";

export function KindChip({ kind }: { kind: FormKind }) {
  return <StatusChip tone={kind === "test" ? "plum" : "info"}>{KIND_LABEL[kind]}</StatusChip>;
}
export function FormStatusChip({ status }: { status: FormStatus }) {
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}
export function SubmissionChip({ status }: { status: SubmissionStatus }) {
  return <StatusChip tone={SUBMISSION_TONE[status]}>{SUBMISSION_LABEL[status]}</StatusChip>;
}

/** Status of an answer key: only a confirmed key can mark automatically. */
export function KeyChip({ q }: { q: FormQuestion }) {
  if (!q.answerKey || q.answerKey.optionIds.length === 0) return <StatusChip tone="mute">No answer key yet</StatusChip>;
  return q.answerKey.status === "confirmed" ? <StatusChip tone="ok">Confirmed</StatusChip> : <StatusChip tone="warn">Suggested - needs Beeliv confirmation</StatusChip>;
}

export function BackLink({ href = TESTS_HREF, label = "Tests & Forms" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> {label}
    </Link>
  );
}

/** Card with an 18px serif title. */
export function Section({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`ap-card min-w-0 rounded-[20px] p-5 min-[768px]:p-6 ${className}`}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="ap-serif text-[18px] leading-tight">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Unauthorized state: the backend said this account may not see tests and forms. */
export function Restricted({ what }: { what: string }) {
  return (
    <section data-admin-nonav="" className="ap-card flex max-w-[860px] flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-8" role="status">
      <span className="flex size-10 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-muted)">
        <LockKeyhole className="size-[19px]" aria-hidden="true" />
      </span>
      <h2 className="ap-serif text-[18px] leading-tight">This is not available to your account</h2>
      <p className="max-w-[58ch] text-[15px] leading-snug text-(--ap-muted)">{what} is not shared with your account. If you think you should have access, ask your Beeliv team.</p>
    </section>
  );
}

export function DetailSkeleton({ label }: { label: string }) {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className={`${sk} mb-3 h-5 w-32`} />
      <div className={`${sk} mb-4 h-[120px]`} />
      <div className={`${sk} mb-3 h-[200px]`} />
      <div className={`${sk} h-[200px]`} />
    </div>
  );
}

export function Notice({ kind, children, onClose }: { kind: "ok" | "error"; children: ReactNode; onClose: () => void }) {
  useNoticeSound(kind, typeof children === "string" ? children : "");
  return (
    <div role={kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
      <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{children}</p>
      <button type="button" onClick={onClose} className="ap-btn ap-btn-s ap-btn-sm">
        Dismiss
      </button>
    </div>
  );
}

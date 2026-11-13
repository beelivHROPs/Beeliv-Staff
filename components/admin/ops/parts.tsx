"use client";

/** Small shared pieces for the Operations screens. Facts and ActivityList are reused from Vacancies. */
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusChip } from "@/components/client/StatusChip";
import { LockKeyhole } from "@/components/applicant/icons";

import { useAdminRole } from "@/lib/admin/ops/identity";
import { useNoticeSound } from "@/lib/admin/use-notice-sound";
import type { ApprovalKind, ApprovalStatus, DocumentState } from "@/lib/admin/ops/types";
import { DOC_LABEL, DOC_TONE, KIND_LABEL, STATUS_LABEL, STATUS_TONE } from "./meta";

export { ActivityList, Facts } from "@/components/admin/vacancies/parts";

export function ApprovalStatusChip({ status }: { status: ApprovalStatus }) {
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

export function KindChip({ kind }: { kind: ApprovalKind }) {
  return <StatusChip tone={kind === "offer" ? "plum" : "mute"}>{KIND_LABEL[kind]}</StatusChip>;
}

export function DocChip({ state }: { state: DocumentState }) {
  return <StatusChip tone={DOC_TONE[state]}>{DOC_LABEL[state]}</StatusChip>;
}

/**
 * NIN / bank detail: always masked, no reveal control, no digits (not even the
 * last four). Whether Operations may ever see these needs Beeliv confirmation
 * (rbac.md section 5), so approvals only ever show that one is on file.
 */
export function MaskedValue({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-(--ap-muted)" aria-label={`${label}: hidden`}>
      <LockKeyhole className="size-3.5" aria-hidden="true" />
      <span aria-hidden="true" className="tracking-[.18em]">
        ••••••••••
      </span>
    </span>
  );
}

/** Notice (success / error / conflict): a thin bordered strip with a coloured left rule, no icon circle. `role` is alert for problems so it is announced. */
export function Notice({ tone, children, action }: { tone: "ok" | "error" | "conflict"; children: ReactNode; action?: ReactNode }) {
  // Errors and conflicts sound here; "ok" is silent because each caller plays its own decision sound.
  useNoticeSound(tone === "ok" ? "ok" : "error", typeof children === "string" ? children : tone, false);
  const rule = tone === "ok" ? "border-l-(--ap-ok)" : tone === "conflict" ? "border-l-(--ap-warn)" : "border-l-(--ap-rose)";
  return (
    <div role={tone === "ok" ? "status" : "alert"} className={`mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-(--ap-line) border-l-[3px] bg-(--ap-surface) px-4 py-3 ${rule}`}>
      <div className="min-w-0 flex-1 text-[14.5px] leading-snug text-(--ap-ink)">{children}</div>
      {action}
    </div>
  );
}

/** Calm section: thin border, 10px radius, small semibold heading. Never nested inside another bordered box. */
export function Section({ title, right, children, className = "" }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[14px] leading-tight font-semibold text-(--ap-ink)">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Not available to this account (403). Same words as the other Admin screens, calm box, no icon circle. */
export function Restricted({ what }: { what: string }) {
  return (
    <section data-bv-status="" data-admin-nonav="" className="max-w-[760px] rounded-[10px] border border-(--ap-line) bg-(--ap-surface) p-6" role="status">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold text-(--ap-ink)">
        <LockKeyhole className="size-4 text-(--ap-muted)" aria-hidden="true" />
        This is not available to your account
      </h2>
      <p className="mt-2 max-w-[58ch] text-[14.5px] leading-snug text-(--ap-muted)">{what} is not shared with your account. If you think you should have access, ask your Beeliv team.</p>
    </section>
  );
}

/**
 * Only the Operations identity may use these screens. HR (or anything else) sees
 * the same "not available" panel as a 403 from the backend. Prototype only: the
 * real boundary is the server. Waits (renders `fallback`) until the identity is
 * known, so there is no flash of the wrong view.
 */
export function OpsOnly({ what, fallback, children }: { what: string; fallback: ReactNode; children: ReactNode }) {
  const role = useAdminRole();
  if (role === null) return <>{fallback}</>;
  if (role !== "ops") {
    return (
      <>
        <Restricted what={what} />
        <p className="mt-3 text-[13px] text-(--ap-muted)">
          HR submits requests for approval; Operations decides them. <Link href="/admin" className="font-bold text-(--ap-violet)">Back to Home</Link>
        </p>
      </>
    );
  }
  return <>{children}</>;
}

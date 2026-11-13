"use client";

/** Small shared pieces for the Offers screens. Section, Facts, ActivityList and Restricted are reused from Vacancies. */
import { Check } from "@/components/applicant/icons";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { StatusChip } from "@/components/client/StatusChip";
import { PhonePill, pillTone } from "@/components/admin/PhoneDetail";
import type { OfferStatus } from "@/lib/admin/offers/types";
import { LIFECYCLE, STATUS_LABEL, STATUS_TONE } from "./meta";

export { ActivityList, Facts, Restricted, Section } from "@/components/admin/vacancies/parts";

export function OfferStatusChip({ status }: { status: OfferStatus }) {
  return <StatusChip tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusChip>;
}

/** Marks a rule or wording Beeliv has not defined yet. */
export function NeedsConfirmation({ children }: { children: React.ReactNode }) {
  if (!SHOW_PROTOTYPE_CONTROLS) return null;
  return (
    <p className="rounded-lg bg-(--ap-warn-bg) px-3 py-2 text-[13px] leading-snug text-(--ap-warn)">
      <b>Needs Beeliv confirmation.</b> {children}
    </p>
  );
}

/** Lifecycle stepper: the current stage is filled; closed outcomes show as a final labelled step. */
export function LifecycleStepper({ status }: { status: OfferStatus }) {
  const closed = status === "declined" || status === "expired" || status === "withdrawn";
  const steps: OfferStatus[] = closed ? [...LIFECYCLE.slice(0, 4), status] : LIFECYCLE;
  const at = closed ? steps.length - 1 : LIFECYCLE.indexOf(status);
  return (
    <ol aria-label="Offer lifecycle" className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
      {steps.map((s, i) => {
        const done = i < at;
        const here = i === at;
        return (
          <li key={s} aria-current={here ? "step" : undefined} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden="true"
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${here ? (closed ? "bg-(--ap-muted) text-white" : "bg-(--ap-violet) text-white") : done ? "bg-(--ap-ok-bg) text-(--ap-ok)" : "bg-(--ap-line-2) text-(--ap-muted)"}`}
            >
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={here ? "font-bold text-(--ap-ink)" : "text-(--ap-muted)"}>{STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Phone detail pill (spec colours). */
export function OfferStatusPill({ status }: { status: OfferStatus }) {
  return <PhonePill tone={pillTone(STATUS_TONE[status])}>{STATUS_LABEL[status]}</PhonePill>;
}

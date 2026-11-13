"use client";

import { useId, useState } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Check, ChevronDown } from "@/components/applicant/icons";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import type { ApplicantDetail } from "@/lib/admin/applicants/types";

const OWNER_LABEL = { hr: "Waiting on you", you: "Waiting on you", applicant: "Waiting on the applicant", operations: "Waiting on Operations", none: "" } as const;

/**
 * Next required action, as one calm line at the foot of the header card (it used to be a card of its own).
 * The attention mark shows only when HR must act now; waiting on someone else is a quiet word.
 */
export function NextActionBox({ a }: { a: ApplicantDetail }) {
  const n = a.nextRequired;
  return (
    <section aria-label="Next required action" className="min-w-0">
      <h2 className="m-0 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">Next required action</h2>
      <div className="mt-1.5 flex items-start gap-2.5">
        {n.owner === "hr" || n.owner === "you" ? <AttentionBadge className="mt-0.5 size-5 shrink-0" halo={false} /> : null}
        <p className="m-0 min-w-0 text-[15px] leading-snug text-(--ap-ink-2)">
          <b className="block text-(--ap-ink)">{n.title}</b>
          {n.detail ? <span className="block max-[767px]:hidden">{n.detail}</span> : null}
          {n.owner === "applicant" || n.owner === "operations" ? <span className="ml-2 text-[13px] font-semibold text-(--ap-warn)">{OWNER_LABEL[n.owner]}</span> : null}
        </p>
      </div>
    </section>
  );
}

/**
 * Recruitment progress over the 8 locked stages, as a thin step line with the current step named.
 * "All steps" opens the full list. Hold / Rejected are retained statuses, shown on the stage the person was at.
 */
export function ProgressRail({ a }: { a: ApplicantDetail }) {
  const retained = a.status === "hold" ? "On hold here" : a.status === "rejected" ? "Rejected here" : a.status === "talent-pool" ? "In talent pool" : null;
  const [open, setOpen] = useState(false);
  const id = useId();
  const total = APPLICATION_STAGES.length;
  return (
    <section aria-label="Recruitment progress" className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">Recruitment progress</h2>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="ap-hit inline-flex items-center gap-1 rounded-md text-[13px] font-semibold text-(--ap-violet) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
          All steps
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <div role="img" aria-label={`Step ${a.stage + 1} of ${total}: ${APPLICATION_STAGES[a.stage]}`} className="mt-2.5 flex gap-1">
        {APPLICATION_STAGES.map((label, i) => (
          <span key={label} className={`h-1.5 flex-1 rounded-full ${i < a.stage ? "bg-(--ap-violet)" : i === a.stage ? "bg-(--ap-violet) opacity-55" : "bg-(--ap-line)"}`} />
        ))}
      </div>
      <p className="mt-1.5 mb-0 text-[14px] text-(--ap-ink-2)">
        <b className="text-(--ap-ink)">{APPLICATION_STAGES[a.stage]}</b>, step {a.stage + 1} of {total}
        {retained ? <span className="ml-2 text-[13px] font-semibold text-(--ap-muted)">{retained}</span> : null}
      </p>
      {open ? (
        <ol id={id} className="m-0 mt-3 grid list-none grid-cols-1 gap-x-6 gap-y-1.5 p-0 min-[600px]:grid-cols-2">
          {APPLICATION_STAGES.map((label, i) => {
            const done = i < a.stage;
            const current = i === a.stage;
            return (
              <li key={label} aria-current={current ? "step" : undefined} className="flex items-center gap-2.5">
                <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${done ? "border-(--ap-violet) bg-(--ap-violet) text-white" : current ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-faint)"}`}>
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={`text-[14px] ${current ? "font-bold text-(--ap-ink)" : done ? "text-(--ap-ink-2)" : "text-(--ap-muted)"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}

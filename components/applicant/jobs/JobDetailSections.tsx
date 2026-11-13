"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, FileCheck2, FileText, Sparkles } from "@/components/applicant/icons";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import type { ScreeningQuestion } from "@/lib/applicant/screening";
import { RECRUITMENT_PROCESS, conditionRows, type ExperienceFlag } from "@/lib/public-site/job-details";
import { Reveal } from "../motion";
import { ProcessTimeline } from "@/components/shared/jobs/ProcessTimeline";

/**
 * Body sections of the applicant job page, in the requirements doc's §2.15
 * order (About → Responsibilities → Essential / Preferred → Experience →
 * Skills → Working conditions → Benefits → Required documents → Screening
 * questions → Recruitment process). Sections with no data are skipped.
 * Long lists fold after a few items on phones only (≤767px); desktop always
 * shows everything.
 */

const H3 = "ax-label m-0 mb-2.5";
const SOFT_CHIP = "inline-flex h-[30px] items-center rounded-full border border-(--ap-line) px-3 text-[13px] whitespace-nowrap text-(--ap-ink-2) max-[767px]:h-7";

const FLAG_LABEL: Record<ExperienceFlag, string> = {
  Management: "Supervisory / management experience",
  "Fine dining": "Fine-dining experience",
  Hotel: "Hotel experience",
  QSR: "QSR experience",
  "International cuisine": "International cuisine experience",
  POS: "POS experience",
};

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <Reveal as="section" aria-labelledby={id} className="[&+&]:mt-7">
      <h3 id={id} className={H3}>
        {title}
      </h3>
      {children}
    </Reveal>
  );
}

/** Check-marked list; on phones folds after `fold` items behind a "Show all" toggle. */
export function CheckList({ items, fold = 5, muted = false }: { items: string[]; fold?: number; muted?: boolean }) {
  const [open, setOpen] = useState(false);
  const extra = items.length - fold;
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((x, i) => (
          <li key={x} className={`flex gap-2.5 text-[15px] leading-snug text-(--ap-ink-2) ${!open && i >= fold ? "max-[767px]:hidden" : ""}`}>
            <Check className={`mt-[4px] size-4 shrink-0 ${muted ? "text-(--ap-faint)" : "text-(--ax-olive)"}`} strokeWidth={2} aria-hidden="true" />
            {x}
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ax-link mt-1 inline-flex min-h-11 items-center gap-1.5 min-[768px]:hidden"
        >
          {open ? "Show fewer" : `Show all ${items.length}`}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.6} aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}

/** Two-column key/value grid (same `.kv` look as the Job overview card). */
export function FactGrid({ rows, className = "" }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={`m-0 grid grid-cols-1 gap-x-8 gap-y-3 min-[768px]:grid-cols-2 ${className}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[13px] text-(--ap-muted)">{k}</dt>
          <dd className="m-0 text-[15px] font-semibold [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function DocList({ title, items, icon: Icon, note }: { title: string; items: string[]; icon: typeof FileText; note: string }) {
  return (
    <div>
      <b className="block text-[15px]">{title}</b>
      <span className="ap-sm mt-0.5 block">{note}</span>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {items.map((d) => (
          <li key={d} className="flex items-center gap-2.5 text-(--ap-ink-2)">
            <Icon className="size-[17px] shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** §2.10 as a vertical timeline (numbered markers on a connector line, full names beside them): never breaks a word, any width. */
export function ProcessStepper() {
  return <ProcessTimeline steps={RECRUITMENT_PROCESS} />;
}

export function JobDetailSections({ job, questions }: { job: ApplicantJob; questions: ScreeningQuestion[] }) {
  const conditions = conditionRows(job.conditions);
  return (
    <div className="ap-stagger">
      {job.about ? (
        <Section title="About the role" id="jd-about">
          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-(--ap-ink-2)">{job.about}</p>
        </Section>
      ) : null}

      {job.responsibilities.length ? (
        <Section title="Key responsibilities" id="jd-resp">
          <CheckList items={job.responsibilities} />
        </Section>
      ) : null}

      {job.essential.length || job.preferred.length ? (
        <Section title="Requirements" id="jd-req">
          <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
            {job.essential.length ? (
              <div>
                <b className="mb-2 block text-[15px]">Essential</b>
                <CheckList items={job.essential} fold={4} />
              </div>
            ) : null}
            {job.preferred.length ? (
              <div>
                <b className="block text-[15px]">Preferred</b>
                <span className="ap-sm mb-2 block">Nice to have. You can still apply without these.</span>
                <CheckList items={job.preferred} fold={4} muted />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {job.experience.summary ? (
        <Section title="Experience" id="jd-exp">
          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-(--ap-ink-2)">{job.experience.summary}</p>
          {job.experience.flags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {job.experience.flags.map((f) => (
                <span key={f} className={SOFT_CHIP}>
                  {FLAG_LABEL[f]}
                </span>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {job.skills.length ? (
        <Section title="Skills required" id="jd-skills">
          <div className="flex flex-wrap gap-2">
            {job.skills.map((s) => (
              <span key={s} className={SOFT_CHIP}>
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {conditions.length ? (
        <Section title="Working conditions" id="jd-cond">
          <FactGrid rows={conditions} />
        </Section>
      ) : null}

      {job.benefits.length ? (
        <Section title="Benefits" id="jd-ben">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {job.benefits.map((b) => (
              <li key={b.kind + b.detail} className="flex gap-2.5 text-(--ap-ink-2)">
                <Sparkles className="mt-[4px] size-4 shrink-0 text-(--ax-gold)" strokeWidth={1.6} aria-hidden="true" />
                <span>
                  <b className="font-semibold text-(--ap-ink)">{b.kind}:</b> {b.detail}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Required documents" id="jd-docs">
        <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2">
          <DocList title="Required to apply" note="Upload these with your application." items={job.requiredDocuments.atApplication} icon={FileText} />
          <DocList title="Required after selection" note="Only asked for once you are selected." items={job.requiredDocuments.afterSelection} icon={FileCheck2} />
        </div>
      </Section>

      {questions.length ? (
        <Section title="Screening questions" id="jd-screen">
          <p className="ap-sm mb-2.5">You&apos;ll answer {questions.length} short questions when you apply:</p>
          <CheckList items={questions.map((q) => q.title)} fold={3} muted />
        </Section>
      ) : null}

      <Section title="Recruitment process" id="jd-process">
        <ProcessStepper />
        {job.interviewMethod ? (
          <p className="ap-sm mt-3.5">
            <b className="font-semibold text-(--ap-ink-2)">Interview:</b> {job.interviewMethod}
          </p>
        ) : null}
      </Section>
    </div>
  );
}

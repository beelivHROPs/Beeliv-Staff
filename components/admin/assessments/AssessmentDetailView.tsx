"use client";

/** Assessment result detail (read-only) plus the RESERVED data model for the later Assessment & Testing module. Scores never decide. */
import Link from "next/link";
import { ChevronLeft, Check, FileCheck2 } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { StatusChip } from "@/components/client/StatusChip";
import { Disc } from "@/components/admin/overview/Disc";
import { Initials } from "@/components/admin/overview/Sections";
import { RestrictedPanel } from "@/components/admin/interviews/ui";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useAssessment } from "@/lib/admin/assessments/hooks";
import { ASSESSMENT_RECOMMENDATION_LABEL } from "@/lib/admin/assessments/types";
import { applicantHref } from "@/lib/admin/links";
import { ASSESSMENT_STATUS, AssessmentNote } from "./AssessmentsList";
import { PD_CTA, PhoneDetailHead, PhoneFacts, PhoneMore, PhonePill, PhoneStickyAction, initialsOf, pillTone } from "@/components/admin/PhoneDetail";

const H2 = "ap-serif mb-3 text-[18px] leading-tight";
const RESERVED = ["Assessment type (configurable)", "Applicant and application", "Evaluator", "Scheduled and completed times", "Per-criterion scores and maximum", "Total score (a guide only)", "Status", "Human recommendation", "Evaluator notes", "History of every change"];

function Back() {
  return (
    <Link href="/admin/recruitment/assessments" className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Assessments
    </Link>
  );
}

export function AssessmentDetailView({ id }: { id: string }) {
  const live = useAssessment(id);
  if (live.status === "restricted") return <RestrictedPanel title="Assessment" what="This assessment result" />;
  if (live.status === "error") {
    return (
      <>
        <Back />
        <ErrorPanel title="We could not load this assessment" retry={live.retry} />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={FileCheck2} title="Assessment not found" description="This result does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading assessment">
        <div className="ap-shimmer mb-3 h-5 w-28 rounded-lg" />
        <div className="ap-shimmer mb-4 h-[150px] rounded-2xl" />
        <div className="ap-shimmer h-[300px] rounded-2xl" />
      </div>
    );
  }
  const st = ASSESSMENT_STATUS[d.status];

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, a short counted list, ONE sticky action (View applicant). Result stays; history and the reserved model are folded. */}
      <PhoneDetailHead
        backHref="/admin/recruitment/assessments"
        backLabel="Assessments"
        visual={{ kind: "initials", text: initialsOf(d.candidateName) }}
        title={d.candidateName}
        status={<PhonePill tone={pillTone(st.tone)}>{st.label}</PhonePill>}
        line={`${d.typeName} · ${d.vacancy}`}
      />
      <PhoneFacts
        title="Result"
        rows={[
          { label: "Score", value: d.score === null ? "Not recorded" : `${d.score} of ${d.maxScore}` },
          { label: "Recommendation", value: d.recommendation ? ASSESSMENT_RECOMMENDATION_LABEL[d.recommendation] : "Not recorded" },
          { label: "Evaluator", value: d.evaluator?.name ?? "Not assigned" },
        ]}
      />
      <PhoneStickyAction>
        <Link href={applicantHref(d.applicantId)} className={PD_CTA}>
          View applicant
        </Link>
      </PhoneStickyAction>
      <AssessmentNote />
      <PhoneMore title="More details">
      <header className={`${CARD} mb-4 max-[767px]:hidden`}>
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Initials name={d.candidateName} size="size-16" />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.candidateName}</h1>
              <p className="mt-1 text-[14px] break-all text-(--ap-muted)">{d.applicantReference}</p>
              <p className="mt-2 text-[15px] leading-snug break-words">
                <b>{d.typeName}</b> for {d.vacancy}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <StatusChip tone={st.tone}>{st.label}</StatusChip>
                <span>Evaluator: {d.evaluator?.name ?? "Not assigned"}</span>
                {d.at ? <RelativeTime iso={d.at} mode={d.status === "scheduled" ? "future" : "past"} /> : null}
              </div>
            </div>
          </div>
          <Link href={applicantHref(d.applicantId)} className="ap-btn ap-btn-s h-12 px-5">
            View applicant
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[1000px]:grid-cols-2">
        <section className={CARD} aria-labelledby="res-h">
          <h2 id="res-h" className={H2}>
            Result
          </h2>
          {d.score === null ? (
            <p className="text-[15px] leading-snug text-(--ap-muted)">No score has been recorded yet.</p>
          ) : (
            <>
              <p className="text-[17px] font-bold tabular-nums" title="A guide only. It never hires or rejects anyone.">
                {d.score} of {d.maxScore} <span className="text-[14px] font-normal text-(--ap-muted)">(guide only)</span>
              </p>
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {d.breakdown.map((b) => (
                  <li key={b.criterion} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="text-(--ap-ink-2)">{b.criterion}</span>
                    <span className="font-semibold tabular-nums">
                      {b.score}/{b.max}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-4 text-[14px] font-semibold text-(--ap-ink-2)">Recommendation</p>
          <p className="text-[15px]">{d.recommendation ? ASSESSMENT_RECOMMENDATION_LABEL[d.recommendation] : "Not recorded"}</p>
          {d.evaluatorNotes ? (
            <>
              <p className="mt-4 text-[14px] font-semibold text-(--ap-ink-2)">Evaluator notes</p>
              <p className="text-[15px] leading-snug break-words">{d.evaluatorNotes}</p>
            </>
          ) : null}
        </section>

        <section className={CARD} aria-labelledby="hist-h">
          <h2 id="hist-h" className={H2}>
            History
          </h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {[...d.history].reverse().map((h) => (
              <li key={h.id} className="flex gap-3">
                <Disc icon={Check} tone="brand" className="size-8" />
                <div className="min-w-0 text-[14px] leading-snug">
                  <p className="font-bold">
                    {h.action}
                    {h.to ? <span className="font-normal text-(--ap-muted)"> ({h.from ? `${h.from} to ` : ""}{h.to})</span> : null}
                  </p>
                  <p className="text-[13px] text-(--ap-muted)">
                    {h.actor}, <RelativeTime iso={h.at} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${CARD} min-[1000px]:col-span-2`} aria-labelledby="res-model">
          <h2 id="res-model" className={H2}>
            Reserved data model
          </h2>
          <p className="mb-3 text-[14px] leading-snug text-(--ap-muted)">Each assessment result will hold the fields below once the Assessment &amp; Testing module is built. Test content, templates and attempts belong to that module and are not designed here.</p>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-1.5 p-0 text-[14px] text-(--ap-ink-2) min-[640px]:grid-cols-2">
            {RESERVED.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
        </section>
      </div>
      </PhoneMore>
    </div>
  );
}

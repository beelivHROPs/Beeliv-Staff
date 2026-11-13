"use client";

/**
 * One person's submission: every answer beside its question, automatic marks (only where Beeliv has CONFIRMED the answer
 * key), manual mark inputs (0 up to the points) for written answers and any choice question still waiting, a
 * recommendation (Proceed / Hold / Needs another stage, never decided by the score), and a history entry on every save.
 * Appraisals show the answers only. The person links to their applicant profile when they are an applicant.
 *
 * Reused: AdminAvatar (viewable), SelectMenu, DETAIL_TITLE, EmptyState, ErrorPanel, StatusChip (via parts), Section.
 */
import Link from "next/link";
import { useState } from "react";
import { FileText } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { StatusChip } from "@/components/client/StatusChip";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { formatAnswer } from "@/components/forms/QuestionField";
import { StarRating } from "@/components/shared/StarRating";
import { formatDateTimeFull } from "@/lib/admin/sort";
import { saveMarks, useSubmission } from "@/lib/admin/tests/hooks";
import type { SubmissionDetail } from "@/lib/admin/tests/adapter";
import { autoMark, SAMPLE_DEPARTMENTS } from "@/lib/admin/tests/store";
import type { FormSubmission } from "@/lib/forms/types";
import { AUDIENCE_LABEL, BackLink, DetailSkeleton, Notice, RECO_LABEL, Restricted, Section, SubmissionChip, applicantProfileHref, resultsHref } from "./parts";

type Reco = NonNullable<FormSubmission["recommendation"]>;
const NONE = "__none";
const RECO_OPTIONS = [{ value: NONE, label: "Not decided yet" }, ...(Object.keys(RECO_LABEL) as Reco[]).map((r) => ({ value: r, label: RECO_LABEL[r] }))];

export function SubmissionDetailView({ formId, submissionId }: { formId: string; submissionId: string }) {
  const live = useSubmission(submissionId);
  const back = <BackLink href={resultsHref(formId)} label="Results" />;
  if (live.status === "error") {
    return (
      <>
        {back}
        <ErrorPanel title="We could not load this submission" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {back}
        <Restricted what="This submission is" />
      </>
    );
  }
  if (live.status === "empty" || (live.data && live.data.form.id !== formId)) {
    return (
      <>
        {back}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={FileText} title="Submission not found" description="It may have been removed, or it is outside your access." />
        </div>
      </>
    );
  }
  if (!live.data) return <DetailSkeleton label="Loading submission" />;
  return <Detail key={live.data.submission.id} d={live.data} back={back} onSaved={live.setData} />;
}

function Detail({ d, back, onSaved }: { d: SubmissionDetail; back: React.ReactNode; onSaved: (d: SubmissionDetail) => void }) {
  const { form, submission: s } = d;
  const isTest = form.kind === "test";
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(s.marks ?? {}).map(([k, v]) => [k, String(v)])));
  const [reco, setReco] = useState<string>(s.recommendation ?? NONE);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const needsPerson = (qid: string) => {
    const q = form.questions.find((x) => x.id === qid);
    return !!q && q.marking !== "none" && !!q.points && autoMark(q, s.answers[q.id]) === null;
  };

  async function save() {
    const next: Record<string, number> = {};
    const e: Record<string, string> = {};
    for (const q of form.questions) {
      if (!needsPerson(q.id)) continue;
      const raw = (marks[q.id] ?? "").trim();
      if (raw === "") continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > (q.points ?? 0)) e[q.id] = `Enter a mark from 0 to ${q.points}.`;
      else next[q.id] = n;
    }
    setErrs(e);
    if (Object.keys(e).length) {
      setNotice({ kind: "error", text: "Please fix the highlighted marks." });
      return;
    }
    setBusy(true);
    try {
      onSaved(await saveMarks(s.id, next, reco === NONE ? null : (reco as Reco)));
      setNotice({ kind: "ok", text: "Saved. It is recorded in the history below." });
    } catch {
      setNotice({ kind: "error", text: "We could not save. Nothing was changed. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {back}
      <header className="ap-card mb-4 rounded-[20px] p-5 min-[768px]:p-6">
        <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar name={s.takerName} size={56} viewable />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{s.takerName}</h1>
              <p className="mt-1 text-[14px] break-words text-(--ap-ink-2)">
                {form.title} (version {s.formVersion}) · {AUDIENCE_LABEL[form.audience]}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <SubmissionChip status={s.status} />
                <span>{s.submittedAt ? `Submitted ${formatDateTimeFull(s.submittedAt)}` : `Started ${formatDateTimeFull(s.startedAt)}, not submitted`}</span>
                {s.takerType === "applicant" ? (
                  <Link href={applicantProfileHref(s.takerId)} className="font-bold text-(--ap-violet) hover:text-(--ap-plum)">Open applicant profile</Link>
                ) : null}
              </div>
            </div>
          </div>
          {isTest && d.score ? (
            <div className="rounded-2xl bg-(--ap-tint-soft) px-4 py-3 min-[900px]:min-w-[220px]">
              <p className="text-[12px] font-bold text-(--ap-muted)">Score so far</p>
              <p className="text-[22px] leading-tight font-bold tabular-nums">{d.score.percent === null ? "Not marked yet" : `${d.score.percent}%`}</p>
              <p className="text-[13px] text-(--ap-muted)">
                {d.score.markedCount} / {d.score.markableCount} marked, {d.score.awaitingMarking} waiting
              </p>
              <p className="mt-1 text-[12px] text-(--ap-muted)">{form.passMarkPercent === null ? "Pass mark: Beeliv to confirm." : `Pass mark: ${form.passMarkPercent}%. For guidance only.`}</p>
            </div>
          ) : null}
        </div>
      </header>

      {notice ? <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice> : null}

      <div className="flex flex-col gap-4">
        <Section title="Answers">
          <ol className="m-0 flex list-none flex-col p-0">
            {form.questions.map((q, i) => {
              const raw = s.answers[q.id];
              const text = formatAnswer(q, raw, s.otherText?.[q.id], SAMPLE_DEPARTMENTS);
              const auto = autoMark(q, raw);
              const markable = isTest && q.marking !== "none" && !!q.points;
              return (
                <li key={q.id} className="border-t border-(--ap-line-2) py-4 first:border-t-0 first:pt-0 last:pb-0">
                  <p className="text-[15px] leading-snug font-bold break-words">{i + 1}. {q.prompt}</p>
                  {q.originalPrompt ? <p className="mt-0.5 text-[12px] text-(--ap-muted)">Original wording: {q.originalPrompt}</p> : null}
                  {q.type === "rating" && typeof raw === "number" ? (
                    <div className="mt-2 rounded-xl bg-(--ap-tint-soft) px-3.5 py-1.5">
                      <StarRating readOnly value={raw} scale={q.ratingMax ?? 5} label={q.prompt} />
                    </div>
                  ) : (
                    <p className={`mt-2 rounded-xl bg-(--ap-tint-soft) px-3.5 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap ${text ? "text-(--ap-ink)" : "text-(--ap-muted)"}`}>{text || "No answer"}</p>
                  )}
                  {markable ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {auto !== null ? (
                        <StatusChip tone={auto > 0 ? "ok" : "bad"}>Marked automatically: {auto} / {q.points}</StatusChip>
                      ) : (
                        <>
                          <label className="inline-flex items-center gap-2 text-[14px]" htmlFor={`mark-${q.id}`}>
                            Mark (0 to {q.points})
                            <input
                              id={`mark-${q.id}`}
                              className="ap-input !h-11 !w-24"
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={q.points}
                              step="0.5"
                              value={marks[q.id] ?? ""}
                              aria-invalid={!!errs[q.id] || undefined}
                              disabled={s.status === "in-progress"}
                              onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))}
                            />
                          </label>
                          {q.marking === "auto" ? <span className="text-[12px] text-(--ap-muted)">Answer key not confirmed yet, so a person marks this one.</span> : <span className="text-[12px] text-(--ap-muted)">Marked by a person.</span>}
                        </>
                      )}
                      {errs[q.id] ? <span role="alert" className="text-[13px] font-semibold text-(--ap-rose)">{errs[q.id]}</span> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Section>

        {isTest ? (
          <Section title="Your recommendation">
            <div className="grid max-w-[520px] gap-3">
              <p className="text-[14px] text-(--ap-muted)">The score only helps you decide. The recommendation is yours, and nobody is rejected because of a score.</p>
              <SelectMenu label="Recommendation" value={reco} options={RECO_OPTIONS} onChange={setReco} />
              <button type="button" disabled={busy || s.status === "in-progress"} onClick={() => void save()} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white! max-[600px]:w-full min-[601px]:w-fit">
                {busy ? "Saving..." : "Save marks and recommendation"}
              </button>
            </div>
          </Section>
        ) : null}

        {isTest ? (
          <Section title="History">
            {d.history.length === 0 ? (
              <p className="text-[14px] text-(--ap-muted)">Nothing recorded yet. Saving marks adds an entry here.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {d.history.map((h) => (
                  <li key={h.id} className="text-[14px] leading-snug">
                    <b>{h.actor}</b> · {h.action}
                    <span className="block text-[12px] text-(--ap-muted)">{formatDateTimeFull(h.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        ) : null}
      </div>
    </div>
  );
}

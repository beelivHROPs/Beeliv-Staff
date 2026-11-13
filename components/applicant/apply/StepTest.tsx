"use client";

/**
 * The "Test" section of the Screening step: a test the vacancy carries (set by HR), taken as part of the application.
 * Questions use the same large-card renderer as the standalone test. Answers are saved on this device as the person goes
 * and are sent together with the application in one submit. No score or marks are ever shown here.
 * Timed tests: the clock starts when the section is first opened; when it runs out the answers lock and are sent with the application.
 */
import { useEffect, useState } from "react";
import { Clock3 } from "@/components/applicant/icons";
import { ProgressBar } from "@/components/applicant/primitives";
import { type ParticipantForm, getForm } from "@/lib/forms/participant-store";
import { formatClock, isAnswered, useDraft } from "@/components/applicant/tests/taker";
import { TakerQuestion } from "@/components/applicant/tests/TakerQuestion";

/** Shared by ApplyBody (submit, review) and the section itself. `takerKey` = applicant + vacancy, so each application has its own attempt. */
export function useApplyTest(testFormId: string | undefined, takerKey: string) {
  const form: ParticipantForm | null = testFormId ? getForm(testFormId) : null;
  const { draft, update } = useDraft(takerKey, form?.id ?? "none");
  const answers = draft.answers;
  const otherText = draft.otherText;
  const missing = form ? form.questions.map((q, i) => (q.required && !isAnswered(q, answers, otherText) ? i + 1 : 0)).filter(Boolean) : [];
  const answeredN = form ? form.questions.length - missing.length : 0;
  return { form, draft, update, answers, otherText, missing, answeredN };
}
export type ApplyTest = ReturnType<typeof useApplyTest>;

export function StepTest({ test, showErrors }: { test: ApplyTest; showErrors: boolean }) {
  const { form, draft, update, answers, otherText, missing, answeredN } = test;
  const limit = form?.timeLimitMinutes ?? null;
  const [now, setNow] = useState(() => Date.now());

  // The clock starts when the person first opens the test section.
  useEffect(() => {
    if (form && !draft.startedAt) update({ startedAt: new Date().toISOString() });
  }, [form, draft.startedAt, update]);

  const deadline = limit && draft.startedAt ? new Date(draft.startedAt).getTime() + limit * 60_000 : null;
  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!form) return null;

  const remaining = deadline === null ? null : deadline - now;
  const expired = remaining !== null && remaining <= 0;
  const warn = remaining !== null && remaining <= 5 * 60_000;
  const n = form.questions.length;

  return (
    <section className="mt-8 border-t border-(--ap-line-2) pt-6" aria-labelledby="ap-test-title">
      <span className="ax-label">Test</span>
      <h2 id="ap-test-title" className="ap-serif mt-1 text-[22px]">{form.title}</h2>
      <p className="mt-1 text-[15px] leading-snug text-(--ap-muted)">
        {n} question{n === 1 ? "" : "s"}.{" "}
        {limit ? `You have ${limit} minute${limit === 1 ? "" : "s"}, starting when you opened this section.` : "There is no time limit."} Every question needs an answer.
      </p>

      {remaining !== null ? (
        <div className="sticky top-[62px] z-10 mt-4 rounded-xl border border-(--ap-line) bg-(--ax-surface) px-3.5 py-2.5 min-[768px]:top-[84px]">
          <span className={`ap-chip ${warn ? "ap-chip-warn" : "ap-chip-violet"}`}>
            <Clock3 className="size-3.5" aria-hidden="true" />
            {expired ? "Time is up" : `Time left ${formatClock(remaining)}`}
          </span>
          {expired ? <p className="mt-1.5 text-[13px] text-(--ap-muted)">Your test answers are locked and will be sent with your application.</p> : warn ? <p className="mt-1.5 text-[13px] text-(--ap-muted)">Less than 5 minutes left.</p> : null}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <b className="text-[14px]">{answeredN} of {n} answered</b>
        </div>
        <ProgressBar percent={(answeredN / n) * 100} label="Test questions answered" />
      </div>

      <div className="mt-5 flex flex-col gap-7">
        {form.questions.map((q, i) => (
          <div key={q.id} data-ap-field>
            <span className="ax-label mb-1 block">Test question {i + 1} of {n}</span>
            <TakerQuestion
              question={q}
              value={answers[q.id]}
              onChange={(v) => update({ answers: { ...answers, [q.id]: v } })}
              otherText={otherText[q.id] ?? ""}
              onOtherChange={(t) => update({ otherText: { ...otherText, [q.id]: t } })}
              readOnly={expired}
              error={showErrors && missing.includes(i + 1) ? "This question needs an answer before you can submit." : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

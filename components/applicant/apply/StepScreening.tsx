"use client";

import type { ScreeningAnswers, ScreeningQuestion } from "@/lib/applicant/screening";
import { FieldError, invalidAttrs } from "@/components/applicant/form-feedback";
import { INPUT_CLS, Pick, Segmented } from "./parts";

/**
 * Wireframe stepBody() s===4, now role-specific: each application shows its
 * own vacancy's questions (lib/applicant/screening.ts, requirements §2.11)
 * instead of the three hard-coded Sous Chef questions. Question types:
 * yes/no (segmented), single choice (radio list), multi choice (pick chips),
 * short text and number.
 */
function Question({ n, required, title, id, error, children }: { n: number; required: boolean; title: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    // `.q`
    <fieldset data-ap-field className="m-0 min-w-0 border-0 border-b border-(--ap-line-2) p-0 pt-5 pb-5 first:pt-0 last:border-b-0 [&+&]:mt-0" aria-labelledby={id}>
      <span className="ax-label">
        Question {n} · {required ? "Required" : "Optional"}
      </span>
      <b id={id} className="mt-1 mb-3 block text-[16px] leading-snug font-semibold">
        {title}
      </b>
      {children}
      <FieldError id={`${id}-err`}>{error}</FieldError>
    </fieldset>
  );
}

function Answer({ q, labelId, value, onChange, invalid }: { q: ScreeningQuestion; labelId: string; value: string | string[] | undefined; onChange: (v: string | string[]) => void; invalid: boolean }) {
  const bad = invalid ? true : undefined;
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];

  switch (q.type) {
    case "yesno":
      return <Segmented label={q.title} value={text} options={["Yes", "No"] as const} onChange={onChange} invalid={invalid} />;
    case "single":
      return (
        // `.radio`
        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={labelId} aria-invalid={bad}>
          {(q.options ?? []).map((o) => (
            <label
              key={o}
              className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent bg-(--ax-fill) px-3.5 text-[15px] has-[:checked]:border-(--ap-violet) has-[:checked]:bg-(--ax-surface) has-[:checked]:font-semibold has-[:checked]:shadow-[inset_0_0_0_1px_var(--ap-violet)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-(--ap-violet)"
            >
              <input type="radio" name={`ap-${q.id}`} value={o} checked={text === o} onChange={() => onChange(o)} className="m-0 size-4.5 accent-(--ap-violet)" />
              {o}
            </label>
          ))}
        </div>
      );
    case "multi":
      return (
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelId} {...invalidAttrs(invalid)}>
          {(q.options ?? []).map((o) => {
            const on = list.includes(o);
            return (
              <Pick key={o} pressed={on} onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}>
                {o}
              </Pick>
            );
          })}
        </div>
      );
    case "number":
      return (
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            className={`${INPUT_CLS} max-w-[140px]`}
            aria-labelledby={labelId}
            aria-invalid={bad}
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
          {q.unit ? <span className="ap-sm">{q.unit}</span> : null}
        </div>
      );
    default:
      return (
        <textarea
          className="ap-input"
          aria-labelledby={labelId}
          aria-invalid={bad}
          placeholder={q.placeholder}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function StepScreening({
  questions,
  answers,
  onAnswer,
  missing = [],
}: {
  questions: ScreeningQuestion[];
  answers: ScreeningAnswers;
  onAnswer: (id: string, value: string | string[]) => void;
  /** 1-based numbers of required questions to flag as unanswered (after a failed Submit). */
  missing?: number[];
}) {
  return (
    <div>
      {questions.map((q, i) => {
        const labelId = `ap-q-${q.id}`;
        const unanswered = missing.includes(i + 1);
        return (
          <Question key={q.id} n={i + 1} required={q.required} id={labelId} title={q.title} error={unanswered ? "This question needs an answer before you can submit." : undefined}>
            <Answer q={q} labelId={labelId} value={answers[q.id]} onChange={(v) => onAnswer(q.id, v)} invalid={unanswered} />
          </Question>
        );
      })}
    </div>
  );
}

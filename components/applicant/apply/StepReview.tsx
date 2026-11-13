"use client";

import { Check } from "@/components/applicant/icons";
import {
  answeredCount,
  formatScreeningAnswer,
  missingRequiredQuestions,
  readScreeningAnswers,
  type ScreeningQuestion,
} from "@/lib/applicant/screening";
import type { ApplyFormData } from "@/lib/applicant/types";
import { FieldError } from "@/components/applicant/form-feedback";
import { LINK_CLS } from "./parts";
import type { ApplyTest } from "./StepTest";
import { describeAnswer } from "@/components/applicant/tests/taker";

export type ReviewSummary = {
  name: string;
  phone: string;
  email: string;
  location: string;
  reusedDocs: string;
  company: string;
};

/** "1, 2 and 4" */
export function joinAnd(n: number[]): string {
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : String(n[0] ?? "");
}

/** 1-based numbers of this role's required screening questions still unanswered. */
export function missingRequired(form: ApplyFormData, questions: ScreeningQuestion[]): number[] {
  return missingRequiredQuestions(questions, readScreeningAnswers(form, questions));
}

export function StepReview({
  form,
  questions,
  test,
  summary,
  ack,
  setAck,
  onEdit,
  showErrors = false,
}: {
  form: ApplyFormData;
  questions: ScreeningQuestion[];
  /** The vacancy's test, if it has one: its answers are listed (never marks). */
  test?: ApplyTest;
  summary: ReviewSummary;
  ack: boolean;
  setAck: (v: boolean) => void;
  onEdit: (step: number) => void;
  /** After a Submit press: flag the unticked confirmation. */
  showErrors?: boolean;
}) {
  const allSkills = Object.values(form.skills).flat();
  const answers = readScreeningAnswers(form, questions);
  const answered = answeredCount(questions, answers);
  const missing = missingRequired(form, questions);
  const dash = (v: string) => v || "Not added yet";

  const sections: { title: string; step: number; rows: [string, string][] }[] = [
    {
      title: "Personal details",
      step: 0,
      rows: [
        ["Name", dash(summary.name)],
        ["Phone", dash(summary.phone)],
        ["Email", dash(summary.email)],
        ["Location", dash(summary.location)],
      ],
    },
    {
      title: "Experience & availability",
      step: 1,
      rows: [
        ["Experience", dash(form.yearsExperience)],
        ["Expected salary", dash(form.expectedSalary)],
        ["Availability", dash(form.availability)],
        ["Shifts · weekends · holidays", `${form.willingShifts} · ${form.willingWeekends} · ${form.willingHolidays}`],
      ],
    },
    {
      title: "Skills",
      step: 2,
      rows: [
        ["Selected", `${allSkills.length} skill${allSkills.length === 1 ? "" : "s"}`],
        ["Top skills", allSkills.slice(0, 3).join(", ") || "None yet"],
      ],
    },
    {
      title: "Documents",
      step: 3,
      rows: [
        ["Reused", summary.reusedDocs || "None yet"],
        ["Food handler's certificate", form.roleCertificateFileName ? "Uploaded" : "Not added yet"],
      ],
    },
    {
      title: "Screening questions",
      step: 4,
      rows: [
        ["Answered", `${answered} of ${questions.length}`],
        [
          "Required",
          missing.length === 0
            ? "All answered"
            : missing.length === 1
              ? `Question ${missing[0]} needs an answer`
              : `Questions ${joinAnd(missing)} need an answer`,
        ],
        // Every answer, so the applicant reviews exactly what goes on their record.
        ...questions.map((q): [string, string] => [q.title, formatScreeningAnswer(q, answers[q.id])]),
      ],
    },
  ];

  if (test?.form) {
    const f = test.form;
    sections.push({
      title: "Test",
      step: 4,
      rows: [
        ["Test", f.title],
        ["Answered", `${test.answeredN} of ${f.questions.length}`],
        ...f.questions.map((q): [string, string] => [q.prompt, describeAnswer(q, test.answers, test.otherText) || "Not answered yet"]),
      ],
    });
  }

  return (
    <div>
      <div className="ax-group">
      {sections.map((s) => (
        // `.rv`
        <section key={s.title} className="px-4 py-4" aria-label={s.title}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <b className="flex items-center gap-2 text-[15.5px]">
              <Check className="size-4.5 shrink-0 text-(--ax-olive)" strokeWidth={2} aria-hidden="true" />
              {s.title}
            </b>
            <button type="button" onClick={() => onEdit(s.step)} className={LINK_CLS} aria-label={`Edit ${s.title}`}>
              Edit
            </button>
          </div>
          {/* `.kv2` */}
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 max-[640px]:grid-cols-1">
            {s.rows.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[13px] text-(--ap-muted)">{label}</dt>
                <dd className="m-0 text-[15px] font-semibold wrap-anywhere">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      </div>

      {/* `.ack` */}
      <div data-ap-field className="mt-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-(--ax-fill) p-3.5 text-[14px] leading-snug text-(--ap-ink-2)">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            aria-invalid={showErrors && !ack ? true : undefined}
            aria-describedby={showErrors && !ack ? "ap-ack-err" : undefined}
            className="mt-px size-5 shrink-0 accent-(--ap-violet)"
          />
          <span>I confirm the information is accurate. Beeliv may share my application with {summary.company} for this role.</span>
        </label>
        <FieldError id="ap-ack-err">{showErrors && !ack ? "Tick the box to confirm before you submit." : null}</FieldError>
      </div>
    </div>
  );
}

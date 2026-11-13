"use client";

/**
 * Journey editor: the ordered steps an applicant goes through for one job.
 * Used by the vacancy form AND the job template editor (Lists & Rules), so both
 * behave the same. The existing documents, screening questions and test fields
 * live INSIDE their journey steps (open a step to edit it); a step that is not in
 * the journey has no content.
 *
 * Fixed rules (lib/journeys/types.ts): Application is first; the Operations
 * decision cannot be removed and always comes before the offer; onboarding is
 * last. Moves that would break them are simply not offered (button disabled
 * with a plain reason). Up/down buttons are real buttons, so it is fully
 * keyboard friendly, and the focus stays on the moved step.
 *
 * Calm on purpose: one hairline list, no coloured boxes, colour only on errors.
 */
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LockKeyhole as LockIcon, Plus, Trash2 } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { FieldError } from "@/components/applicant/form-feedback";
import type { ScreeningQuestion } from "@/lib/admin/vacancies/types";
import {
  INTERVIEW_MINUTES,
  JOURNEY_METHOD_LABEL,
  SCORER_LABEL,
  SCORER_ROLES,
  STEP_META,
  addStep,
  addableKinds,
  canMoveStep,
  canRemoveStep,
  moveStep,
  removeStep,
  stepId,
  type InterviewStepConfig,
  type Journey,
  type JourneyMethod,
  type JourneyStep,
  type JourneyStepKind,
  type ScorecardCriterion,
  type ScorerRole,
} from "@/lib/journeys/types";

export interface JourneyExtras {
  docsApply: string;
  docsAfter: string;
  questions: ScreeningQuestion[];
  testFormId: string;
  /** Vacancy only: the interview note applicants see. Omit for templates. */
  interviewMethod?: string;
  interviewLocation?: string;
}

const LINE = "border-t border-(--ap-line-2)";
const ICON_BTN = "ap-hit flex size-9 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2) hover:text-(--ap-ink) disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-(--ap-muted)";
const LABEL = "mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)";
const METHODS = (Object.keys(JOURNEY_METHOD_LABEL) as JourneyMethod[]).map((m) => ({ value: m, label: JOURNEY_METHOD_LABEL[m] }));
const MINUTES = INTERVIEW_MINUTES.map((m) => ({ value: String(m), label: `${m} minutes` }));
const SCALES = [{ value: "5", label: "1 to 5" }, { value: "10", label: "1 to 10" }];
const WEIGHTS = ["1", "2", "3", "4", "5"].map((w) => ({ value: w, label: w }));

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function stepTitle(s: JourneyStep): string {
  return s.kind === "interview" ? s.interview?.stageName.trim() || "Interview" : STEP_META[s.kind].label;
}

function summaryOf(s: JourneyStep, x: JourneyExtras, tests: { value: string; label: string }[]): string {
  switch (s.kind) {
    case "screening-questions": {
      const n = x.questions.filter((q) => q.text.trim()).length;
      return n ? plural(n, "question") : "No questions written yet";
    }
    case "documents-at-application": {
      const d = lines(x.docsApply);
      return d.length ? `${d.slice(0, 3).join(", ")}${d.length > 3 ? ` and ${d.length - 3} more` : ""}` : "No documents listed";
    }
    case "documents-after-selection": {
      const d = lines(x.docsAfter);
      return d.length ? `${d.slice(0, 3).join(", ")}${d.length > 3 ? ` and ${d.length - 3} more` : ""}` : "No documents listed";
    }
    case "test-or-form":
      return tests.find((t) => t.value === x.testFormId)?.label ?? "No test chosen yet";
    case "interview": {
      const c = s.interview;
      if (!c) return "";
      return `${JOURNEY_METHOD_LABEL[c.defaultMethod]}, ${c.defaultMinutes} min, ${plural(c.criteria.length, "criterion", "criteria")}, scored by ${c.whoMayScore.map((r) => SCORER_LABEL[r]).join(" / ") || "no one"}`;
    }
    default:
      return STEP_META[s.kind].help;
  }
}

const hasContent = (k: JourneyStepKind) => k === "screening-questions" || k === "documents-at-application" || k === "documents-after-selection" || k === "test-or-form" || k === "interview";

export function JourneyEditor({
  journey,
  onJourney,
  extras,
  onExtras,
  errors = {},
  tests,
  lockStructure = false,
  lockNote,
}: {
  journey: Journey;
  onJourney: (j: Journey) => void;
  extras: JourneyExtras;
  onExtras: (patch: Partial<JourneyExtras>) => void;
  errors?: Partial<Record<string, string>>;
  /** Published tests the vacancy may carry. */
  tests: { value: string; label: string }[];
  /** True once applications exist: steps can be added or renamed, not removed or moved. */
  lockStructure?: boolean;
  lockNote?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const refocus = useRef<{ id: string; dir: "up" | "down" } | null>(null);
  const listId = useId();
  const isOpen = (s: JourneyStep) => open[s.id] ?? !!errors[s.id];
  const kinds = addableKinds(journey);

  useEffect(() => {
    const r = refocus.current;
    if (!r) return;
    refocus.current = null;
    const el = document.querySelector<HTMLButtonElement>(`[data-jmove="${r.id}-${r.dir}"]:not(:disabled)`) ?? document.querySelector<HTMLButtonElement>(`[data-jmove="${r.id}-${r.dir === "up" ? "down" : "up"}"]:not(:disabled)`);
    el?.focus();
  }, [journey]);

  function move(i: number, dir: -1 | 1) {
    const s = journey[i];
    refocus.current = { id: s.id, dir: dir === -1 ? "up" : "down" };
    onJourney(moveStep(journey, i, dir));
    setAnnounce(`${stepTitle(s)} moved to position ${i + dir + 1} of ${journey.length}.`);
  }
  function add(kind: JourneyStepKind) {
    const s: JourneyStep = kind === "interview" ? { id: stepId(), kind, interview: freshInterview(journey) } : { id: stepId(), kind };
    onJourney(addStep(journey, kind, s));
    setOpen((p) => ({ ...p, [s.id]: true }));
    setAnnounce(`${stepTitle(s)} added.`);
    if (kinds.length <= 1) setAdding(false);
  }
  function remove(s: JourneyStep) {
    onJourney(removeStep(journey, s.id));
    setAnnounce(`${stepTitle(s)} removed.`);
  }
  const patchInterview = (id: string, p: Partial<InterviewStepConfig>) => onJourney(journey.map((s) => (s.id === id && s.interview ? { ...s, interview: { ...s.interview, ...p } } : s)));

  return (
    <div>
      <p className="mb-1 max-w-[68ch] text-[14px] leading-snug text-(--ap-muted)">
        The steps an applicant goes through for this job, in order. Application is always first, the Operations decision can never be skipped and always comes before the offer, and onboarding is last. Everything else is up to you.
      </p>
      {lockStructure ? <p className="mt-2 mb-1 max-w-[68ch] text-[13px] text-(--ap-muted)">{lockNote}</p> : null}
      <FieldError>{errors.journey}</FieldError>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <ol id={listId} className="m-0 mt-3 list-none p-0" aria-label="Journey steps">
        {journey.map((s, i) => {
          const meta = STEP_META[s.kind];
          const expandable = hasContent(s.kind);
          const expanded = expandable && isOpen(s);
          const bodyId = `${listId}-${s.id}`;
          const err = errors[s.id];
          const fixed = !canRemoveStep(s);
          return (
            <li key={s.id} className={`${i === 0 ? "" : LINE}`} {...(err ? { "data-ap-invalid": true } : {})}>
              <div className="flex items-start gap-3 py-3.5">
                <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-(--ap-line) text-[12px] font-semibold text-(--ap-muted) tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {expandable ? (
                    <button type="button" aria-expanded={expanded} aria-controls={bodyId} onClick={() => setOpen((p) => ({ ...p, [s.id]: !isOpen(s) }))} className="group flex w-full items-start gap-2 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-(--ap-ink) group-hover:underline">{stepTitle(s)}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug break-words text-(--ap-muted)">{summaryOf(s, extras, tests)}</span>
                      </span>
                      <span className="mt-0.5 shrink-0 px-1 text-[13px] font-semibold text-(--ap-violet)">
                        {expanded ? "Done" : "Edit"}
                        <span className="sr-only"> {stepTitle(s)} settings</span>
                      </span>
                    </button>
                  ) : (
                    <>
                      <span className="block text-[15px] font-semibold text-(--ap-ink)">{stepTitle(s)}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">{summaryOf(s, extras, tests)}</span>
                    </>
                  )}
                  {err && !expanded ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{err}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {s.kind === "application" ? (
                    <span className="inline-flex items-center gap-1 px-2 text-[12px] text-(--ap-muted)">
                      <LockIcon className="size-3.5" aria-hidden="true" /> Always first
                    </span>
                  ) : lockStructure ? null : (
                    <>
                      <button type="button" data-jmove={`${s.id}-up`} aria-label={`Move ${stepTitle(s)} up`} title={canMoveStep(journey, i, -1) ? "Move up" : "Cannot move higher"} disabled={!canMoveStep(journey, i, -1)} onClick={() => move(i, -1)} className={ICON_BTN}>
                        <ChevronDown className="size-4 rotate-180" aria-hidden="true" />
                      </button>
                      <button type="button" data-jmove={`${s.id}-down`} aria-label={`Move ${stepTitle(s)} down`} title={canMoveStep(journey, i, 1) ? "Move down" : "Cannot move lower"} disabled={!canMoveStep(journey, i, 1)} onClick={() => move(i, 1)} className={ICON_BTN}>
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </button>
                      {fixed ? (
                        <span className="inline-flex size-9 items-center justify-center text-(--ap-faint)" title="This step cannot be removed">
                          <LockIcon className="size-4" aria-hidden="true" />
                          <span className="sr-only">{meta.label} cannot be removed</span>
                        </span>
                      ) : (
                        <button type="button" aria-label={`Remove ${stepTitle(s)}`} onClick={() => remove(s)} className={ICON_BTN}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {expanded ? (
                <div id={bodyId} className="mb-4 ml-9 max-w-[760px] border-l border-(--ap-line-2) pl-4">
                  <StepBody step={s} extras={extras} onExtras={onExtras} tests={tests} error={err} patchInterview={patchInterview} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className={`${LINE} pt-3.5`}>
        {adding ? (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-(--ap-ink-2)">Add a step</p>
            <div className="flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button key={k} type="button" onClick={() => add(k)} title={STEP_META[k].help} className="ap-btn ap-btn-s ap-btn-sm">
                  <Plus className="size-3.5" aria-hidden="true" /> {STEP_META[k].label}
                </button>
              ))}
              <button type="button" onClick={() => setAdding(false)} className="ap-btn ap-btn-sm text-(--ap-muted) hover:text-(--ap-ink)">
                Done
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="ap-btn ap-btn-s ap-btn-sm">
            <Plus className="size-4" aria-hidden="true" /> Add a step
          </button>
        )}
      </div>
    </div>
  );
}

function freshInterview(journey: Journey): InterviewStepConfig {
  const n = journey.filter((s) => s.kind === "interview").length;
  return {
    stageName: n ? `Interview ${n + 1}` : "Interview",
    defaultMethod: "in-person",
    defaultMinutes: 45,
    criteria: [
      { id: stepId(), label: "Communication", scale: 5, weight: 1 },
      { id: stepId(), label: "Service attitude", scale: 5, weight: 1 },
      { id: stepId(), label: "Relevant experience", scale: 5, weight: 1 },
    ],
    whoMayScore: ["hr_officer", "hr_manager", "operations"],
  };
}

/* ---------- the content of a step ---------- */

function StepBody({
  step,
  extras,
  onExtras,
  tests,
  error,
  patchInterview,
}: {
  step: JourneyStep;
  extras: JourneyExtras;
  onExtras: (p: Partial<JourneyExtras>) => void;
  tests: { value: string; label: string }[];
  error?: string;
  patchInterview: (id: string, p: Partial<InterviewStepConfig>) => void;
}) {
  const uid = useId();
  switch (step.kind) {
    case "documents-at-application":
      return (
        <div>
          <label htmlFor={`${uid}-d`} className={LABEL}>
            Documents required to apply
          </label>
          <textarea id={`${uid}-d`} className="ap-input" rows={4} value={extras.docsApply} onChange={(e) => onExtras({ docsApply: e.target.value })} />
          <p className="mt-1 text-[13px] text-(--ap-muted)">One item per line.</p>
        </div>
      );
    case "documents-after-selection":
      return (
        <div>
          <label htmlFor={`${uid}-d`} className={LABEL}>
            Documents required after selection
          </label>
          <textarea id={`${uid}-d`} className="ap-input" rows={4} value={extras.docsAfter} onChange={(e) => onExtras({ docsAfter: e.target.value })} />
          <p className="mt-1 text-[13px] text-(--ap-muted)">One item per line.</p>
        </div>
      );
    case "test-or-form":
      return (
        <div className="max-w-[420px]">
          <span id={`${uid}-t`} className={LABEL}>
            Attach a test or form
          </span>
          <SelectMenu label="Attach a test or form" value={extras.testFormId} options={[{ value: "", label: "None yet" }, ...tests]} onChange={(v) => onExtras({ testFormId: v })} />
          <p className="mt-1 text-[13px] text-(--ap-muted)">Applicants take it as part of their application, after the screening questions. Only published tests are listed.</p>
        </div>
      );
    case "screening-questions":
      return <QuestionsEditor extras={extras} onExtras={onExtras} error={error} />;
    case "interview":
      return step.interview ? <InterviewBody cfg={step.interview} extras={extras} onExtras={onExtras} error={error} patch={(p) => patchInterview(step.id, p)} /> : null;
    default:
      return null;
  }
}

function QuestionsEditor({ extras, onExtras, error }: { extras: JourneyExtras; onExtras: (p: Partial<JourneyExtras>) => void; error?: string }) {
  const qs = extras.questions;
  const set = (next: ScreeningQuestion[]) => onExtras({ questions: next });
  return (
    <div className="flex flex-col gap-3">
      {qs.length === 0 ? <p className="text-[14px] text-(--ap-muted)">No screening questions. Answers are stored with each application.</p> : null}
      {qs.map((q, i) => (
        <div key={q.id} className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-[minmax(0,1fr)_150px_110px_40px] min-[700px]:items-center">
          <input aria-label={`Question ${i + 1}`} className="ap-input" placeholder="Question" value={q.text} maxLength={200} onChange={(e) => set(qs.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))} />
          <SelectMenu label={`Question ${i + 1} answer type`} value={q.answerType} options={[{ value: "yes-no", label: "Yes / No" }, { value: "text", label: "Short answer" }]} onChange={(v) => set(qs.map((x) => (x.id === q.id ? { ...x, answerType: v as "yes-no" | "text" } : x)))} />
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" className="size-5 accent-(--ap-violet)" checked={q.required} onChange={(e) => set(qs.map((x) => (x.id === q.id ? { ...x, required: e.target.checked } : x)))} /> Required
          </label>
          <button type="button" aria-label={`Remove question ${i + 1}`} onClick={() => set(qs.filter((x) => x.id !== q.id))} className={ICON_BTN}>
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
      <FieldError>{error}</FieldError>
      <button type="button" onClick={() => set([...qs, { id: stepId(), text: "", required: false, answerType: "yes-no" }])} className="ap-btn ap-btn-s ap-btn-sm self-start">
        <Plus className="size-4" aria-hidden="true" /> Add question
      </button>
    </div>
  );
}

function InterviewBody({ cfg, extras, onExtras, error, patch }: { cfg: InterviewStepConfig; extras: JourneyExtras; onExtras: (p: Partial<JourneyExtras>) => void; error?: string; patch: (p: Partial<InterviewStepConfig>) => void }) {
  const uid = useId();
  const setCrit = (next: ScorecardCriterion[]) => patch({ criteria: next });
  const toggleScorer = (r: ScorerRole) => patch({ whoMayScore: cfg.whoMayScore.includes(r) ? cfg.whoMayScore.filter((x) => x !== r) : SCORER_ROLES.filter((x) => x === r || cfg.whoMayScore.includes(x)) });
  return (
    <div className="flex flex-col gap-5">
      <FieldError>{error}</FieldError>
      <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-3">
        <div className="min-[700px]:col-span-1">
          <label htmlFor={`${uid}-n`} className={LABEL}>
            Interview name
          </label>
          <input id={`${uid}-n`} className="ap-input" value={cfg.stageName} maxLength={60} onChange={(e) => patch({ stageName: e.target.value })} aria-invalid={!!error && !cfg.stageName.trim()} />
        </div>
        <div>
          <span className={LABEL}>Usual method</span>
          <SelectMenu label={`${cfg.stageName || "Interview"} usual method`} value={cfg.defaultMethod} options={METHODS} onChange={(v) => patch({ defaultMethod: v as JourneyMethod })} />
        </div>
        <div>
          <span className={LABEL}>Usual length</span>
          <SelectMenu label={`${cfg.stageName || "Interview"} usual length`} value={String(cfg.defaultMinutes)} options={MINUTES} onChange={(v) => patch({ defaultMinutes: Number(v) })} />
        </div>
      </div>
      {extras.interviewMethod !== undefined ? (
        <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-im`} className={LABEL}>
              Interview note shown to applicants
            </label>
            <input id={`${uid}-im`} className="ap-input" value={extras.interviewMethod} placeholder="For example: in person" onChange={(e) => onExtras({ interviewMethod: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${uid}-il`} className={LABEL}>
              Interview location shown to applicants
            </label>
            <input id={`${uid}-il`} className="ap-input" value={extras.interviewLocation ?? ""} onChange={(e) => onExtras({ interviewLocation: e.target.value })} />
          </div>
        </div>
      ) : null}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className={LABEL}>Who may score this interview</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {SCORER_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" className="size-5 accent-(--ap-violet)" checked={cfg.whoMayScore.includes(r)} onChange={() => toggleScorer(r)} /> {SCORER_LABEL[r]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[13px] text-(--ap-muted)">The person who scores picks the recommendation. The total is only a guide.</p>
      </fieldset>

      <div>
        <p className={LABEL}>Scorecard</p>
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_100px_40px] gap-2 pb-1 text-[12px] font-semibold text-(--ap-muted) min-[700px]:grid">
          <span>Criterion</span>
          <span>Scale</span>
          <span>Weight</span>
          <span />
        </div>
        <div className="flex flex-col gap-2">
          {cfg.criteria.map((c, i) => (
            <div key={c.id} className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-[minmax(0,1fr)_120px_100px_40px] min-[700px]:items-center">
              <input aria-label={`${cfg.stageName || "Interview"} criterion ${i + 1}`} className="ap-input" placeholder="For example: Communication" value={c.label} maxLength={80} onChange={(e) => setCrit(cfg.criteria.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))} />
              <SelectMenu label={`Criterion ${i + 1} scale`} value={String(c.scale)} options={SCALES} onChange={(v) => setCrit(cfg.criteria.map((x) => (x.id === c.id ? { ...x, scale: v === "10" ? 10 : 5 } : x)))} />
              <SelectMenu label={`Criterion ${i + 1} weight`} value={String(c.weight)} options={WEIGHTS} onChange={(v) => setCrit(cfg.criteria.map((x) => (x.id === c.id ? { ...x, weight: Number(v) } : x)))} />
              <button type="button" aria-label={`Remove criterion ${i + 1}`} onClick={() => setCrit(cfg.criteria.filter((x) => x.id !== c.id))} className={ICON_BTN}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCrit([...cfg.criteria, { id: stepId(), label: "", scale: 5, weight: 1 }])} className="ap-btn ap-btn-s ap-btn-sm mt-3">
          <Plus className="size-4" aria-hidden="true" /> Add criterion
        </button>
        <p className="mt-2 text-[13px] text-(--ap-muted)">Weight 1 is normal. A higher weight counts for more in the guide total.</p>
      </div>
    </div>
  );
}

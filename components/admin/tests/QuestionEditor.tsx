"use client";

/**
 * One question inside the builder: wording, type, choices, required, and (for tests) points, how it is marked and the
 * answer key with its confirmation status. Pure presentation: the parent owns the list and the validation messages.
 * Nothing here marks anything: a key only counts once it is "Confirmed".
 */
import { Plus, Trash2 } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import type { FormKind, FormQuestion, QuestionType } from "@/lib/forms/types";
import { KeyChip, TYPE_LABEL, isChoice } from "./parts";

export interface QuestionErrors {
  prompt?: string;
  options?: string;
  points?: string;
}

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq += 1)}`;

/** Make a question valid for the chosen kind (tests are marked, appraisals never are). */
export function normaliseQuestion(q: FormQuestion, kind: FormKind): FormQuestion {
  const next: FormQuestion = { ...q };
  if (kind === "appraisal") {
    next.marking = "none";
    delete next.points;
    delete next.answerKey;
    return next;
  }
  next.marking = isChoice(q.type) && q.marking !== "manual" ? "auto" : "manual";
  if (!isChoice(q.type) || next.marking !== "auto") delete next.answerKey;
  if (next.points === undefined) next.points = 1;
  return next;
}

export function retype(q: FormQuestion, type: QuestionType, kind: FormKind): FormQuestion {
  const next: FormQuestion = { ...q, type };
  delete next.answerKey;
  if (isChoice(type)) {
    if (!next.options || next.options.length < 2) next.options = [{ id: newId(`${q.id}-o`), label: "" }, { id: newId(`${q.id}-o`), label: "" }];
    if (type === "dropdown") delete next.allowOther;
  } else {
    delete next.options;
    delete next.optionsSource;
    delete next.allowOther;
  }
  if (type === "rating") next.ratingMax = 5;
  else delete next.ratingMax;
  next.marking = kind === "appraisal" ? "none" : isChoice(type) ? "auto" : "manual";
  return normaliseQuestion(next, kind);
}

export function blankQuestion(kind: FormKind): FormQuestion {
  return normaliseQuestion({ id: newId("q"), type: "short", prompt: "", required: true, marking: "manual" }, kind);
}

const LABEL = "mb-1 block text-[13px] font-bold text-(--ap-ink-2)";
const TYPES = (Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

export function QuestionEditor({
  q,
  index,
  total,
  kind,
  errors,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  q: FormQuestion;
  index: number;
  total: number;
  kind: FormKind;
  errors?: QuestionErrors;
  onChange: (q: FormQuestion) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const set = (patch: Partial<FormQuestion>) => onChange({ ...q, ...patch });
  const options = q.options ?? [];
  const choice = isChoice(q.type);
  const auto = kind === "test" && choice && q.marking === "auto";
  const keyIds = q.answerKey?.optionIds ?? [];
  const multi = q.type === "multiple";
  const fid = `q-${q.id}`;

  const setOption = (id: string, label: string) => set({ options: options.map((o) => (o.id === id ? { ...o, label } : o)) });
  const removeOption = (id: string) =>
    set({
      options: options.filter((o) => o.id !== id),
      answerKey: q.answerKey ? { optionIds: q.answerKey.optionIds.filter((k) => k !== id), status: "suggested" } : undefined,
    });
  const toggleKey = (id: string) => {
    const next = multi ? (keyIds.includes(id) ? keyIds.filter((k) => k !== id) : [...keyIds, id]) : [id];
    set({ answerKey: { optionIds: next, status: "suggested" } });
  };
  const confirmKey = async () => {
    const ok = await confirmAction({
      tone: "caution",
      title: "Confirm this answer key?",
      description: "Only confirm it once Beeliv has approved the right answer. From then on, answers to this question are marked automatically.",
      confirmLabel: "Confirm key",
    });
    if (ok && q.answerKey) set({ answerKey: { ...q.answerKey, status: "confirmed" } });
  };

  return (
    <li className="rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-4 min-[768px]:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-(--ap-ink)">Question {index + 1}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move question ${index + 1} up`}>
            Move up
          </button>
          <button type="button" className="ap-btn ap-btn-s ap-btn-sm" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Move question ${index + 1} down`}>
            Move down
          </button>
          <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={onDuplicate} aria-label={`Duplicate question ${index + 1}`}>
            Duplicate
          </button>
          <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={onDelete} aria-label={`Delete question ${index + 1}`}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-3.5">
        <div>
          <label htmlFor={`${fid}-prompt`} className={LABEL}>Question</label>
          <textarea id={`${fid}-prompt`} className="ap-input" rows={2} value={q.prompt} maxLength={500} aria-invalid={!!errors?.prompt || undefined} onChange={(e) => set({ prompt: e.target.value })} />
          {errors?.prompt ? <p role="alert" className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{errors.prompt}</p> : null}
          {q.originalPrompt ? <p className="mt-1 text-[12px] text-(--ap-muted)">Original wording: {q.originalPrompt}</p> : null}
        </div>

        <div className="grid gap-3.5 min-[768px]:grid-cols-2">
          <div>
            <span className={LABEL} id={`${fid}-type-l`}>Answer type</span>
            <SelectMenu id={`${fid}-type`} label="Answer type" value={q.type} options={TYPES} onChange={(v) => onChange(retype(q, v as QuestionType, kind))} />
          </div>
          <div>
            <label htmlFor={`${fid}-help`} className={LABEL}>Hint under the question (optional)</label>
            <input id={`${fid}-help`} className="ap-input" value={q.helper ?? ""} maxLength={200} onChange={(e) => set({ helper: e.target.value || undefined })} />
          </div>
        </div>

        {choice ? (
          q.optionsSource ? (
            <p className="text-[13px] text-(--ap-muted)">The choices come from Beeliv&apos;s department list, so there is nothing to type here.</p>
          ) : (
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className={LABEL}>Choices</legend>
              <div className="grid gap-2">
                {options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input className="ap-input" aria-label={`Choice ${i + 1}`} value={o.label} maxLength={200} onChange={(e) => setOption(o.id, e.target.value)} />
                    <button type="button" className="ap-btn ap-btn-s ap-btn-sm shrink-0" onClick={() => removeOption(o.id)} disabled={options.length <= 2} aria-label={`Remove choice ${i + 1}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              {errors?.options ? <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">{errors.options}</p> : null}
              <button type="button" className="ap-btn ap-btn-s ap-btn-sm mt-2" onClick={() => set({ options: [...options, { id: newId(`${q.id}-o`), label: "" }] })}>
                <Plus className="size-4" aria-hidden="true" /> Add a choice
              </button>
            </fieldset>
          )
        ) : null}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5">
            <input type="checkbox" className="size-4 accent-(--ap-violet)" checked={q.required} onChange={(e) => set({ required: e.target.checked })} />
            Required
          </label>
          {q.type === "single" || q.type === "multiple" ? (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5">
              <input type="checkbox" className="size-4 accent-(--ap-violet)" checked={!!q.allowOther} onChange={(e) => set({ allowOther: e.target.checked || undefined })} />
              Allow &quot;Other (please specify)&quot;
            </label>
          ) : null}
        </div>

        {kind === "test" ? (
          <div className="grid gap-3.5 rounded-xl bg-(--ap-tint-soft) p-3.5">
            <div className="grid gap-3.5 min-[768px]:grid-cols-2">
              <div>
                <label htmlFor={`${fid}-points`} className={LABEL}>Points</label>
                <input id={`${fid}-points`} className="ap-input" type="number" inputMode="numeric" min={0} max={100} value={q.points ?? ""} aria-invalid={!!errors?.points || undefined} onChange={(e) => set({ points: e.target.value === "" ? undefined : Number(e.target.value) })} />
                {errors?.points ? <p role="alert" className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{errors.points}</p> : null}
              </div>
              <div>
                <span className={LABEL}>How it is marked</span>
                {choice ? (
                  <SelectMenu
                    label="How it is marked"
                    value={q.marking === "auto" ? "auto" : "manual"}
                    options={[
                      { value: "auto", label: "Automatically, using an answer key" },
                      { value: "manual", label: "By a person" },
                    ]}
                    onChange={(v) => onChange(normaliseQuestion({ ...q, marking: v as "auto" | "manual" }, kind))}
                  />
                ) : (
                  <p className="flex min-h-12 items-center text-[15px] text-(--ap-ink-2)">By a person (written answers are never marked automatically)</p>
                )}
              </div>
            </div>

            {auto && !q.optionsSource ? (
              <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className={LABEL}>{multi ? "Correct answers (tick all that count)" : "Correct answer"}</legend>
                <div className="grid gap-1.5">
                  {options.map((o, i) => (
                    <label key={o.id} className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px]">
                      <input type={multi ? "checkbox" : "radio"} name={`${fid}-key`} className="size-4 accent-(--ap-violet)" checked={keyIds.includes(o.id)} onChange={() => toggleKey(o.id)} />
                      <span className="min-w-0 break-words">{o.label || `Choice ${i + 1}`}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <KeyChip q={q} />
                  {keyIds.length > 0 && q.answerKey?.status !== "confirmed" ? (
                    <button type="button" className="ap-btn ap-btn-s ap-btn-sm" onClick={() => void confirmKey()}>
                      Confirm key
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[12px] text-(--ap-muted)">
                  Until the key is confirmed, nothing is marked automatically: this question waits for a person.{multi ? " How several correct answers are scored needs Beeliv confirmation (for now all must match)." : ""}
                </p>
              </fieldset>
            ) : null}
          </div>
        ) : (
          <p className="text-[12px] text-(--ap-muted)">Appraisal answers are collected, not scored.</p>
        )}
      </div>
    </li>
  );
}

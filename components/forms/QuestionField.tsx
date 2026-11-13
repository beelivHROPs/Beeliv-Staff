"use client";

/**
 * ONE question renderer shared by the Admin builder preview and the taker screens (Applicant / Staff), so what HR
 * previews is exactly what people see. Controlled: `value` / `onChange`; `error` shows a message and marks the field
 * invalid; `readOnly` shows the answer without letting it change. Dropdown choices that come from configurable data
 * (optionsSource "departments") are passed in through `departments`.
 *
 * "Other (please specify)" is stored in `otherValue`, never inside the option list. Reuses SelectMenu and the ap-input
 * styles from the Applicant app.
 */
import { useId } from "react";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { StarRating } from "@/components/shared/StarRating";
import type { AnswerValue, FormQuestion } from "@/lib/forms/types";

export interface QuestionFieldProps {
  question: FormQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  otherValue?: string;
  onOtherChange?: (text: string) => void;
  error?: string;
  readOnly?: boolean;
  /** Choices for a dropdown whose `optionsSource` is "departments". */
  departments?: string[];
  /** 1-based number shown before the question, when the screen wants one. */
  number?: number;
}

/** A plain-text version of an answer (used by results screens). */
export function formatAnswer(q: FormQuestion, value: AnswerValue | undefined, other?: string, departments: string[] = []): string {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "";
  const label = (id: string) => q.options?.find((o) => o.id === id)?.label ?? departments.find((d) => d === id) ?? id;
  if (Array.isArray(value)) {
    const parts = value.map(label);
    if (other) parts.push(`Other: ${other}`);
    return parts.join(", ");
  }
  if (q.type === "single" || q.type === "dropdown") return other ? `${label(String(value))} (${other})` : label(String(value));
  if (q.type === "rating") return `${value} out of ${q.ratingMax ?? 5}`;
  return String(value);
}

const ROW = "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-(--ap-line) bg-(--ap-surface) px-3.5 py-2 text-[15px] text-(--ap-ink) has-[:checked]:border-(--ap-violet) has-[:checked]:bg-(--ap-tint) has-[:disabled]:cursor-default";

export function QuestionField({ question: q, value, onChange, otherValue = "", onOtherChange, error, readOnly = false, departments = [], number }: QuestionFieldProps) {
  const uid = useId();
  const errId = `${uid}-err`;
  const helpId = `${uid}-help`;
  const describedBy = [q.helper ? helpId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  const picked = Array.isArray(value) ? value : [];
  const otherOn = picked.includes("__other") || value === "__other";

  const choiceList = (multi: boolean) => (
    <div role={multi ? "group" : "radiogroup"} aria-labelledby={`${uid}-label`} aria-describedby={describedBy} className="flex flex-col gap-2">
      {(q.options ?? []).map((o) => {
        const on = multi ? picked.includes(o.id) : value === o.id;
        return (
          <label key={o.id} className={ROW}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={uid}
              checked={on}
              disabled={readOnly}
              onChange={() => onChange(multi ? (on ? picked.filter((x) => x !== o.id) : [...picked, o.id]) : o.id)}
              className="size-4 shrink-0 accent-(--ap-violet)"
            />
            <span className="min-w-0 break-words">{o.label}</span>
          </label>
        );
      })}
      {q.allowOther ? (
        <label className={ROW}>
          <input
            type={multi ? "checkbox" : "radio"}
            name={uid}
            checked={otherOn}
            disabled={readOnly}
            onChange={() => onChange(multi ? (otherOn ? picked.filter((x) => x !== "__other") : [...picked, "__other"]) : "__other")}
            className="size-4 shrink-0 accent-(--ap-violet)"
          />
          <span>Other (please specify)</span>
        </label>
      ) : null}
      {q.allowOther && otherOn ? (
        <input className="ap-input" aria-label="Please specify" value={otherValue} readOnly={readOnly} maxLength={200} onChange={(e) => onOtherChange?.(e.target.value)} />
      ) : null}
    </div>
  );

  const dropdownOptions = q.options ? q.options.map((o) => ({ value: o.id, label: o.label })) : departments.map((d) => ({ value: d, label: d }));

  let control: React.ReactNode;
  switch (q.type) {
    case "single":
      control = choiceList(false);
      break;
    case "multiple":
      control = choiceList(true);
      break;
    case "dropdown":
      control = readOnly ? (
        <p className="ap-input flex items-center">{dropdownOptions.find((o) => o.value === value)?.label ?? "Not answered"}</p>
      ) : (
        <SelectMenu id={`${uid}-field`} value={typeof value === "string" ? value : ""} options={dropdownOptions} placeholder="Choose one" onChange={(v) => onChange(v)} invalid={!!error} describedBy={describedBy} label={q.prompt} />
      );
      break;
    case "long":
      control = (
        <textarea id={`${uid}-field`} className="ap-input" rows={4} value={typeof value === "string" ? value : ""} readOnly={readOnly} maxLength={2000} aria-invalid={!!error || undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "rating": {
      const max = q.ratingMax ?? 5;
      control = (
        <StarRating value={typeof value === "number" ? value : null} scale={max} label={q.prompt || "Rating"} readOnly={readOnly} allowClear={false} onChange={(n) => n !== null && onChange(n)} />

      );
      break;
    }
    default:
      control = (
        <input id={`${uid}-field`} className="ap-input" type={q.type === "email" ? "email" : "text"} inputMode={q.type === "email" ? "email" : undefined} value={typeof value === "string" ? value : ""} readOnly={readOnly} maxLength={q.type === "short" ? 200 : 254} aria-invalid={!!error || undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
      );
  }

  return (
    <div className="min-w-0">
      <label id={`${uid}-label`} htmlFor={q.type === "short" || q.type === "email" || q.type === "long" || q.type === "dropdown" ? `${uid}-field` : undefined} className="block text-[15px] leading-snug font-bold text-(--ap-ink)">
        {number ? `${number}. ` : ""}
        {q.prompt || <span className="font-normal text-(--ap-muted)">Question wording goes here</span>}
        {q.required ? <span aria-hidden="true" className="text-(--ap-rose)"> *</span> : <span className="ml-1.5 text-[13px] font-normal text-(--ap-muted)">(optional)</span>}
      </label>
      {q.helper ? (
        <p id={helpId} className="mt-0.5 text-[13px] text-(--ap-muted)">
          {q.helper}
        </p>
      ) : null}
      <div className="mt-2">{control}</div>
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

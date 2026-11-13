"use client";

/**
 * One question as the person taking a test or survey sees it (mobile first).
 * Choice questions are large tappable cards; ratings are big number buttons; written answers show a character count.
 * Used by both the Applicant "Tests" and the Staff "Forms" screens. Mock only: it just reports the value upward.
 */
import { useId } from "react";
import { Check, CircleAlert } from "@/components/applicant/icons";
import { StarRating } from "@/components/shared/StarRating";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import type { AnswerValue } from "@/lib/forms/types";
import type { ParticipantQuestion } from "@/lib/forms/participant-store";
import { OTHER_ID, visibleHelper } from "./taker";

export const SHORT_MAX = 120;
export const LONG_MAX = 1000;

const CARD =
  "group flex min-h-[56px] cursor-pointer items-center gap-3.5 rounded-2xl border-[1.5px] border-(--ap-line) bg-(--ap-surface,#fff) px-4 py-3.5 text-[16px] leading-snug font-semibold text-(--ap-ink) transition-colors hover:border-[#DCCFE6] has-[:checked]:border-(--ap-violet) has-[:checked]:bg-(--ap-tint) has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[rgba(138,10,163,.25)] has-disabled:cursor-default [.ax-root_&]:min-h-12 [.ax-root_&]:rounded-xl [.ax-root_&]:border [.ax-root_&]:border-transparent [.ax-root_&]:bg-(--ax-fill) [.ax-root_&]:px-3.5 [.ax-root_&]:py-3 [.ax-root_&]:text-[15px] [.ax-root_&]:font-medium [.ax-root_&]:has-[:checked]:border-(--ap-violet) [.ax-root_&]:has-[:checked]:bg-(--ax-surface) [.ax-root_&]:has-[:checked]:shadow-[inset_0_0_0_1px_var(--ap-violet)]";

function Mark({ round }: { round: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-6 shrink-0 items-center justify-center border-[1.5px] border-(--ap-muted) bg-transparent text-transparent transition-colors group-has-[:checked]:border-(--ap-violet) group-has-[:checked]:bg-[var(--ap-violet)] group-has-[:checked]:text-white ${round ? "rounded-full" : "rounded-[7px]"}`}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

export function TakerQuestion({
  question: q,
  value,
  onChange,
  otherText = "",
  onOtherChange,
  error,
  readOnly = false,
  departments = [],
}: {
  question: ParticipantQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  otherText?: string;
  onOtherChange?: (text: string) => void;
  error?: string;
  readOnly?: boolean;
  departments?: string[];
}) {
  const uid = useId();
  const helper = visibleHelper(q);
  const errId = `${uid}-err`;
  const descId = helper ? `${uid}-help` : undefined;
  const describedBy = [descId, error ? errId : undefined].filter(Boolean).join(" ") || undefined;
  const options = q.options ?? [];
  const choices = q.allowOther ? [...options, { id: OTHER_ID, label: "Other (please specify)" }] : options;
  const selected: string[] = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];

  const otherBox = (
    <input
      type="text"
      className="ap-input mt-2.5"
      aria-label="Please specify"
      placeholder="Please specify"
      maxLength={SHORT_MAX}
      value={otherText}
      readOnly={readOnly}
      onChange={(e) => onOtherChange?.(e.target.value)}
      autoFocus
    />
  );

  let body: React.ReactNode;
  if (q.type === "single" || q.type === "multiple") {
    const multi = q.type === "multiple";
    const yesNo = !multi && !q.allowOther && options.length === 2 && options.every((o) => /^(yes|no)$/i.test(o.label.trim()));
    body = (
      <div className={yesNo ? "grid grid-cols-2 gap-3 [&_label]:min-h-[72px] [&_label]:justify-center [&_label]:text-[18px]" : "flex flex-col gap-2.5"}>
        {choices.map((o) => {
          const checked = selected.includes(o.id);
          return (
            <div key={o.id}>
              <label className={CARD}>
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={uid}
                  className="sr-only"
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => {
                    if (multi) onChange(checked ? selected.filter((s) => s !== o.id) : [...selected, o.id]);
                    else onChange(o.id);
                  }}
                />
                <Mark round={!multi} />
                <span className="min-w-0 flex-1">{o.label}</span>
              </label>
              {o.id === OTHER_ID && checked ? otherBox : null}
            </div>
          );
        })}
      </div>
    );
  } else if (q.type === "dropdown") {
    const list = q.optionsSource === "departments" ? departments : options.map((o) => o.label);
    body = readOnly ? (
      <p className="text-[16px] font-semibold">{typeof value === "string" ? value : ""}</p>
    ) : (
      <SelectMenu
        id={`${uid}-sel`}
        label={q.prompt}
        value={typeof value === "string" ? value : ""}
        options={list}
        onChange={(v) => onChange(v)}
        placeholder="Choose one"
        invalid={!!error}
        describedBy={describedBy}
      />
    );
  } else if (q.type === "rating") {
    const max = q.ratingMax ?? 5;
    body = (
      <div>
        <StarRating value={typeof value === "number" ? value : null} scale={max} label={q.prompt} readOnly={readOnly} allowClear={false} onChange={(n) => n !== null && onChange(n)} />
        <div className="mt-1.5 flex max-w-[260px] justify-between text-[13px] font-semibold text-(--ap-muted)" aria-hidden="true">
          <span>Low</span>
          <span>Excellent</span>
        </div>
      </div>
    );
  } else if (q.type === "long") {
    const text = typeof value === "string" ? value : "";
    body = (
      <div>
        <textarea
          className="ap-input min-h-[160px]"
          aria-label={q.prompt}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          maxLength={LONG_MAX}
          value={text}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="mt-1.5 text-right text-[13px] text-(--ap-muted)" aria-live="off">
          {text.length} / {LONG_MAX} characters
        </p>
      </div>
    );
  } else {
    const text = typeof value === "string" ? value : "";
    body = (
      <div>
        <div className="relative">
          <input
            id={`${uid}-in`}
            type={q.type === "email" ? "email" : "text"}
            inputMode={q.type === "email" ? "email" : undefined}
            autoComplete={q.type === "email" ? "email" : "off"}
            className="peer ap-input h-16! pt-6! pb-1.5!"
            placeholder=" "
            aria-label={q.prompt}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            maxLength={SHORT_MAX}
            value={text}
            readOnly={readOnly}
            onChange={(e) => onChange(e.target.value)}
          />
          <label
            htmlFor={`${uid}-in`}
            className="pointer-events-none absolute top-[11px] left-4 text-[12px] font-semibold text-(--ap-muted) transition-all peer-placeholder-shown:top-[21px] peer-placeholder-shown:text-[16px] peer-placeholder-shown:font-medium peer-focus:top-[11px] peer-focus:text-[12px] peer-focus:font-semibold peer-focus:text-(--ap-violet)"
          >
            {q.type === "email" ? "Email address" : "Your answer"}
          </label>
        </div>
        {q.type === "short" ? <p className="mt-1.5 text-right text-[13px] text-(--ap-muted)">{text.length} / {SHORT_MAX} characters</p> : null}
      </div>
    );
  }

  return (
    <div>
      <h2 className="ap-serif text-[24px] leading-[1.2] min-[768px]:text-[28px] [.ax-root_&]:text-[18px] [.ax-root_&]:leading-snug [.ax-root_&]:min-[768px]:text-[20px]">{q.prompt}</h2>
      {helper ? (
        <p id={descId} className="mt-1.5 text-[15px] text-(--ap-muted)">
          {helper}
        </p>
      ) : null}
      {q.type === "multiple" && !helper && !/select all/i.test(q.prompt) ? <p className="mt-1.5 text-[15px] text-(--ap-muted)">Choose all that apply.</p> : null}
      <div className="mt-4">{body}</div>
      {error ? (
        <p id={errId} role="alert" className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-(--ap-rose)">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

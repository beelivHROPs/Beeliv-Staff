"use client";

/**
 * Terms & declarations (last step). The six terms are rendered VERBATIM
 * from lib/applicant/documentation-terms.ts — never paraphrased. Each term
 * has its own custom role="checkbox" control (ConfirmDialog's acknowledge
 * style). Signing = typing the applicant's full name; it must match the
 * profile name (case-insensitive) before Submit is enabled.
 *
 * Consent capture is a plain acknowledgement only (SOURCE-OF-TRUTH §7): the
 * exact mechanism (checkbox vs e-signature vs versioned terms with an audit
 * trail) is still "Requires Management Clarification", and nothing here
 * tracks or collects the placement fee in term 5.
 */
import { useId } from "react";
import { Check, FilePenLine } from "@/components/applicant/icons";
import { INPUT_CLS, STROKE } from "@/components/applicant/apply/parts";
import { DOCUMENTATION_TERMS, DOCUMENTATION_TERMS_INTRO } from "@/lib/applicant/documentation-terms";
import { signatureMatches } from "@/lib/applicant/documentation";
import { FieldError } from "@/components/applicant/form-feedback";
import { CheckMark, FOCUS } from "./controls";

export function TermsStep({
  terms,
  onToggle,
  signature,
  onSignature,
  fullName,
  today,
  showErrors = false,
}: {
  terms: boolean[];
  onToggle: (index: number) => void;
  signature: string;
  onSignature: (v: string) => void;
  fullName: string;
  /** Display date for the signature, e.g. "29 September 2026". */
  today: string;
  /** After a failed Submit: flag every unticked term and a missing/wrong signature. */
  showErrors?: boolean;
}) {
  const sigId = useId();
  const accepted = terms.filter(Boolean).length;
  const matches = signatureMatches(signature, fullName);
  const typed = signature.trim().length > 0;
  const sigBad = (typed && !matches) || (showErrors && !matches);

  return (
    <div>
      <p className="ap-bd mb-4 text-(--ap-ink-2)">{DOCUMENTATION_TERMS_INTRO}</p>

      <p className="mb-3 text-[14px] font-semibold text-(--ap-muted)" aria-live="polite">
        {accepted} of {DOCUMENTATION_TERMS.length} accepted
      </p>

      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {DOCUMENTATION_TERMS.map((term, i) => {
          const checked = Boolean(terms[i]);
          const bodyId = `${sigId}-t${term.number}`;
          const missing = showErrors && !checked;
          return (
            <li
              data-ap-field
              key={term.number}
              className={`rounded-[16px] border px-4.5 py-4 transition-colors max-[767px]:px-4 ${checked ? "border-(--ap-violet)/35 bg-[#fbf8fd]" : "border-(--ap-line) bg-white"}`}
            >
              <h3 className="flex items-baseline gap-2.5 text-[16px] font-bold text-(--ap-ink)">
                <span className="flex size-6.5 shrink-0 items-center justify-center self-start rounded-full bg-(--ap-tint) text-[13px] font-bold text-(--ap-violet)" aria-hidden="true">
                  {term.number}
                </span>
                <span>
                  <span className="sr-only">{term.number}. </span>
                  {term.title}
                </span>
              </h3>
              <div id={bodyId} className="mt-2.5 flex flex-col gap-2 pl-9 text-[15px] leading-[1.65] text-(--ap-ink-2) max-[767px]:pl-0">
                {term.paragraphs.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-invalid={missing ? true : undefined}
                aria-describedby={missing ? `${bodyId} ${bodyId}-err` : bodyId}
                onClick={() => onToggle(i)}
                className={`mt-3.5 ml-9 flex min-h-11 items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-left text-[14px] font-semibold max-[767px]:ml-0 max-[767px]:w-full ${
                  checked ? "border-transparent bg-(--ap-tint) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"
                } ${FOCUS}`}
              >
                <CheckMark checked={checked} />
                I have read, understood and accept term {term.number}
              </button>
              <FieldError id={`${bodyId}-err`}>{missing ? `Accept term ${term.number} to submit.` : null}</FieldError>
            </li>
          );
        })}
      </ol>

      {/* "By signing below" (term 6) — typed full-name signature */}
      <section className="mt-5 rounded-[16px] border border-(--ap-line) bg-white px-4.5 py-4.5 max-[767px]:px-4" aria-labelledby={`${sigId}-h`}>
        <h3 id={`${sigId}-h`} className="flex items-center gap-2 text-[16px] font-bold">
          <FilePenLine className="size-5 text-(--ap-violet)" strokeWidth={STROKE} aria-hidden="true" />
          Sign below
        </h3>
        <p className="ap-sm mt-1">Type your full name exactly as it appears on your profile: {fullName}.</p>

        <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 max-[640px]:grid-cols-1">
          <div data-ap-field className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${sigId}-in`} className="text-[14px] font-semibold text-(--ap-ink-2)">
              Full name (signature)
              <span className="ml-2 text-[12px] font-semibold text-(--ap-violet)">Required</span>
            </label>
            <input
              id={`${sigId}-in`}
              className={INPUT_CLS}
              autoComplete="name"
              spellCheck={false}
              value={signature}
              onChange={(e) => onSignature(e.target.value)}
              aria-invalid={sigBad ? true : undefined}
              aria-describedby={`${sigId}-st`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold text-(--ap-ink-2)">Date</span>
            <span className="flex h-12 items-center rounded-xl border border-(--ap-line) bg-[#fbfafc] px-3.5 text-[15px] whitespace-nowrap text-(--ap-muted)">{today}</span>
          </div>
        </div>

        {/* Signature preview line */}
        <div className="mt-4 border-b border-(--ap-ink-2)/40 pb-1.5" aria-hidden="true">
          <span className={`ap-serif block min-h-9 truncate text-[28px] italic ${matches ? "text-(--ap-plum)" : "text-(--ap-faint)"}`}>{signature.trim() || " "}</span>
        </div>

        <p id={`${sigId}-st`} className={`mt-2 flex items-center gap-1.5 text-[13px] ${matches ? "text-(--ap-ok)" : showErrors ? "font-semibold text-(--ap-rose)" : typed ? "text-(--ap-warn)" : "text-(--ap-muted)"}`} aria-live="polite">
          {matches ? <Check className="ap-bump size-3.5" strokeWidth={2.2} aria-hidden="true" /> : null}
          {matches ? "Signed" : typed ? "This doesn't match the name on your profile yet." : showErrors ? "Type your full name to sign." : "Your typed name acts as your signature."}
        </p>
      </section>
    </div>
  );
}

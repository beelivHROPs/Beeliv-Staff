/**
 * Apply flow: small presentational building blocks shared by every step.
 * Each one mirrors a class from the wireframe's own CSS
 * (beeliv-website/applicant/index.html) — the class name is noted beside
 * each component so a reviewer can diff them 1:1. Values are the FINAL
 * cascaded ones (the wireframe re-declares several rules further down its
 * <style> block; later rules win).
 */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Check, type LucideIcon } from "@/components/applicant/icons";
import { FieldError, invalidAttrs } from "@/components/applicant/form-feedback";

/** Lucide stroke width used across the wireframe's icon set (`I()` helper). */
export const STROKE = 1.6;

/** `.fld` / `.fld.full` + `.lbl` + `.hint` */
export function Field({
  label,
  htmlFor,
  hint,
  full,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  full?: boolean;
  /** Reason shown under the control while it is invalid (the control sets aria-invalid itself). */
  error?: string;
  children: ReactNode;
}) {
  const labelCls = "text-[13px] font-medium text-(--ap-ink-2)";
  // Plain text inputs and textareas get a floating label on phones (CSS in applicant.css, ".ax-fld-float"):
  // the label sits inside the filled box and rises once the field has focus or a value.
  // Custom controls (date, select, phone, address) keep a small caption above them.
  const el = isValidElement(children) ? (children as ReactElement<{ placeholder?: string; type?: string }>) : null;
  const floating =
    Boolean(htmlFor) && el !== null && (el.type === "textarea" || (el.type === "input" && (el.props.type === undefined || ["text", "email", "tel", "number", "search"].includes(el.props.type))));
  const control = floating && el ? cloneElement(el, { placeholder: el.props.placeholder ?? " " }) : children;
  return (
    <div data-ap-field className={`flex min-w-0 flex-col gap-1.5 ${full ? "col-span-full" : ""}`}>
      <div className={floating ? "ax-fld-float flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelCls}>
            {label}
          </label>
        ) : (
          <span className={labelCls}>{label}</span>
        )}
        {control}
      </div>
      {hint ? <span className="px-0.5 text-[13px] leading-snug text-(--ap-muted)">{hint}</span> : null}
      <FieldError id={htmlFor ? `${htmlFor}-err` : undefined}>{error}</FieldError>
    </div>
  );
}

/** `.form` — 2 columns, 1 column on phones (≤640px; 641–767 keeps 2, per the wireframe's own override). */
export function FormGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-x-4.5 gap-y-3.5 max-[640px]:grid-cols-1 ${className}`}>{children}</div>;
}

/** `.inp` (+ `.inp[readonly]`) */
export const INPUT_CLS =
  "ap-input read-only:text-(--ap-muted) read-only:focus:border-transparent";

/** `.seg` segmented Yes/No control. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  invalid = false,
}: {
  label: string;
  value: string;
  options: readonly T[];
  onChange: (v: T) => void;
  invalid?: boolean;
}) {
  // self-start / justify-self-start: stay sized to the labels inside flex/grid fields (never stretch to the column), same on every step.
  return (
    <div className="ap-seg self-start justify-self-start" role="group" aria-label={label} {...invalidAttrs(invalid)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className="focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet)"
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** `.pick` toggle chip — the check icon only shows while pressed. */
export function Pick({ pressed, onClick, children, hidden }: { pressed: boolean; onClick: () => void; children: ReactNode; hidden?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      hidden={hidden}
      className="ap-pick focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet)"
    >
      {pressed ? <Check className="size-3.5" strokeWidth={STROKE} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** `.sub-h` — gold eyebrow used for "Employment history", "Already provided" … */
export function SubHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ax-label mt-2 mb-3 ${className}`}>
      {children}
    </div>
  );
}

/** `.note` — one quiet line with a small icon (no tinted box). */
export function Note({ icon: Icon, children, className = "" }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 text-[14px] leading-snug text-(--ap-muted) ${className}`}>
      <Icon className="mt-px size-4 shrink-0 text-(--ap-ink-2)" strokeWidth={STROKE} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** `.lnk` — bare violet text button. */
export const LINK_CLS =
  "ap-hit inline-flex items-center border-0 bg-transparent p-0 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) min-[768px]:max-[1100px]:min-h-9 max-[767px]:min-h-9";

/** Final cascaded `.chip` colours for the tones this flow uses. */
export const CHIP = {
  mute: "ap-chip !bg-[#f3f1f5] !text-[#57545f] !font-semibold",
  info: "ap-chip !bg-[#f1e7f6] !text-[#5b087b] !font-semibold",
  ok: "ap-chip !bg-[#dcfce7] !text-[#15803d] !font-semibold",
} as const;

/** `.btn` final type (15px / 600) layered on the shared ap-btn primitive. */
export const BTN = "ap-btn text-[15px] font-semibold";

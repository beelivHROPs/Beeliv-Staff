"use client";

/**
 * Small controls used only by the Documentation form. Everything visual is
 * built from the dashboard's existing tokens (.ap-input, .ap-switch, --ap-*)
 * — no new styling system, no native <select>/date/checkbox controls.
 */
import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "@/components/applicant/icons";
import { STROKE } from "@/components/applicant/apply/parts";

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";

/**
 * `.fld` with a Required / Optional tag beside the label.
 * PROPOSAL: which fields are Required vs Optional is TBD in every source doc
 * (BEELIV-APPLICANT-JOURNEY.md §4, SOURCE-OF-TRUTH §7). The `need` values
 * passed at each call site are a UX proposal pending Beeliv confirmation.
 */
export function DocField({
  label,
  htmlFor,
  need,
  hint,
  full,
  children,
}: {
  label: string;
  htmlFor?: string;
  need?: "required" | "optional";
  hint?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  const labelCls = "text-[14px] font-semibold text-(--ap-ink-2)";
  const tag = need ? (
    <span className={`ml-2 text-[12px] font-semibold ${need === "required" ? "text-(--ap-violet)" : "text-(--ap-faint)"}`}>
      {need === "required" ? "Required" : "Optional"}
    </span>
  ) : null;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${full ? "col-span-full" : ""}`}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
          {tag}
        </label>
      ) : (
        <span className={labelCls}>
          {label}
          {tag}
        </span>
      )}
      {children}
      {hint ? <span className="ap-sm">{hint}</span> : null}
    </div>
  );
}

/** Switch row (".ap-switch" from Settings) — used for "I'm not currently employed" etc. */
export function SwitchRow({ checked, onChange, label, detail }: { checked: boolean; onChange: (v: boolean) => void; label: string; detail?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-(--ap-line) bg-[#fbfafc] px-4 py-3.5">
      <span className="min-w-0">
        <span id={id} className="block text-[15px] font-semibold text-(--ap-ink)">
          {label}
        </span>
        {detail ? <span className="ap-sm block">{detail}</span> : null}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} onClick={() => onChange(!checked)} className={`ap-switch ${FOCUS}`} />
    </div>
  );
}

/**
 * Custom checkbox — the same styled role="checkbox" control as
 * ConfirmDialog's `acknowledge`, not a native <input type="checkbox">.
 */
export function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-px flex size-5.5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
        checked ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-[#cfc8d8] bg-white"
      }`}
      aria-hidden="true"
    >
      {checked ? (
        <svg viewBox="0 0 24 24" className="ap-bump size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      ) : null}
    </span>
  );
}

/**
 * Digits-only input with an optional show/hide mask (NIN). The value lives
 * wherever the parent keeps it — for NIN/bank details that is React memory
 * only. autoComplete is off and password managers are asked to ignore it.
 */
export function DigitsInput({
  id,
  value,
  onChange,
  length,
  maskable,
  placeholder,
  describedBy,
  noPaste,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  length: number;
  maskable?: boolean;
  placeholder?: string;
  describedBy?: string;
  /** Block pasting, so a confirm field is retyped, not copied. */
  noPaste?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const masked = maskable && !shown;
  const complete = value.length === length;
  const hintId = `${id}-hint`;
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          maxLength={length}
          onPaste={noPaste ? (e) => e.preventDefault() : undefined}
          placeholder={placeholder}
          aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
          className={`ap-input tracking-[.08em] tabular-nums ${maskable ? "pr-12!" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        />
        {maskable ? (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide number" : "Show number"}
            aria-pressed={shown}
            aria-controls={id}
            className={`absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-(--ap-muted) hover:bg-(--ap-line-2) hover:text-(--ap-ink) ${FOCUS}`}
          >
            {shown ? <EyeOff className="size-[18px]" strokeWidth={STROKE} aria-hidden="true" /> : <Eye className="size-[18px]" strokeWidth={STROKE} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      <p id={hintId} className={`mt-1.5 text-[13px] ${complete ? "text-(--ap-ok)" : "text-(--ap-muted)"}`}>
        {complete ? `${length} digits` : value ? `${length - value.length} more digit${length - value.length === 1 ? "" : "s"}` : `${length} digits`}
      </p>
    </div>
  );
}

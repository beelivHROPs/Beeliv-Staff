"use client";

import { useId, useRef, useState } from "react";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  hint?: string;
};

/** OTPs live in component memory only. Empty cells retain their positions while editing. */
export function CodeBoxes({ id, value, onChange, onComplete, disabled = false, error, label = "Six-digit code", hint = "Enter the current code from your authenticator app." }: Props) {
  const generated = useId();
  const base = id ?? generated;
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [state, setState] = useState(() => ({ value, cells: Array.from({ length: 6 }, (_, i) => value[i] ?? "") }));
  // A caller reset must clear the boxes; locally emitted values preserve holes between cells.
  if (state.value !== value) setState({ value, cells: Array.from({ length: 6 }, (_, i) => value[i] ?? "") });
  const cells = state.value === value ? state.cells : Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const focus = (index: number) => { const input = inputs.current[Math.max(0, Math.min(5, index))]; input?.focus(); input?.select(); };
  function commit(next: string[], target: number) {
    if (disabled) return;
    const changed = next.some((digit, index) => digit !== cells[index]);
    const code = next.join("");
    setState({ value: code, cells: next });
    onChange(code);
    focus(target);
    if (changed && next.every(digit => /^\d$/.test(digit))) onComplete?.(code);
  }
  function fill(index: number, text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    if (!digits) { const next = [...cells]; next[index] = ""; commit(next, index); return; }
    const start = digits.length === 6 ? 0 : index;
    const next = [...cells];
    for (let offset = 0; offset < digits.length && start + offset < 6; offset++) next[start + offset] = digits[offset];
    commit(next, Math.min(5, start + digits.length));
  }
  return <fieldset disabled={disabled} className="min-w-0 border-0 p-0" aria-describedby={[hint ? `${base}-hint` : "", error ? `${base}-error` : ""].filter(Boolean).join(" ") || undefined}>
    <legend className="text-[13px] font-semibold text-(--ap-ink)">{label}</legend>
    <div className={`mt-2 flex gap-2 ${error ? "ap-shake" : ""}`}>
      {cells.map((digit, index) => <input key={index} ref={element => { inputs.current[index] = element; }}
        id={index === 0 ? base : `${base}-${index + 1}`} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
        aria-label={`Digit ${index + 1} of 6`} aria-invalid={!!error} aria-describedby={error ? `${base}-error` : undefined}
        maxLength={6} value={digit} disabled={disabled} spellCheck={false} autoCapitalize="none"
        className={`h-12 min-w-0 w-11 rounded-md border bg-white text-center text-xl font-semibold text-black outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet) ${error ? "border-(--ap-rose)" : "border-[#8b7c85]"}`}
        onFocus={event => event.currentTarget.select()}
        onChange={event => fill(index, event.target.value)}
        onPaste={event => { event.preventDefault(); fill(index, event.clipboardData.getData("text")); }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); focus(index + (event.key === "ArrowLeft" ? -1 : 1)); }
          if (event.key === "Backspace") { event.preventDefault(); const next = [...cells]; const target = cells[index] ? index : Math.max(0, index - 1); next[target] = ""; commit(next, target); }
          if (event.key === "Delete") { event.preventDefault(); const next = [...cells]; next[index] = ""; commit(next, index); }
        }} />)}
    </div>
    {hint ? <p id={`${base}-hint`} className="mt-2 text-[13px] text-(--ap-muted)">{hint}</p> : null}
    {error ? <p id={`${base}-error`} role="alert" className="mt-2 text-[14px] font-semibold text-(--ap-rose)">{error}</p> : null}
  </fieldset>;
}

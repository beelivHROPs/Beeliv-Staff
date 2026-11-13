"use client";

/**
 * Whole-number field with − / + buttons (headcount, team size). Still a text
 * value underneath (digits only), so existing "positive whole number"
 * validation is unchanged. Same box as the dashboard's form fields.
 */
import { Plus } from "@/components/applicant/icons";
import { FieldError } from "@/components/public/auth/fields";

export function NumberStepper({
  id,
  value,
  onChange,
  placeholder,
  error,
  min = 1,
  max = 99999,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  min?: number;
  max?: number;
}) {
  const n = Number(value.replace(/\D/g, "")) || 0;
  const set = (x: number) => onChange(String(Math.min(max, Math.max(min, x))));
  const errId = `${id}-err`;
  const btn =
    "flex size-12 shrink-0 items-center justify-center rounded-xl border border-(--ap-line) bg-white text-(--ap-violet) transition-colors hover:bg-(--ap-tint) active:scale-95 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Decrease" className={btn} disabled={n <= min} onClick={() => set(n - 1)}>
          <span aria-hidden="true" className="text-[22px] leading-none">−</span>
        </button>
        <input
          id={id}
          className="ap-input text-center"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          maxLength={String(max).length}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        />
        <button type="button" aria-label="Increase" className={btn} disabled={n >= max} onClick={() => set(n + 1)}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </div>
  );
}

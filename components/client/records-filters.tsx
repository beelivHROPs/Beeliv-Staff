"use client";

import { Search, X } from "@/components/applicant/icons";
import { SelectMenu, type SelectOption } from "@/components/applicant/SelectMenu";

/** Search box for record lists (no native controls beyond the text input itself). */
export function SearchField({ value, onChange, label, placeholder, onClear }: { value: string; onChange: (v: string) => void; label: string; placeholder: string; /** When given, the X button calls this instead of onChange(""). */ onClear?: () => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-(--ap-muted)" aria-hidden="true" />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="ap-input pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden" />
      {value ? (
        <button type="button" aria-label="Clear search" onClick={() => (onClear ? onClear() : onChange(""))} className="ap-hit absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** One filter dropdown (the shared SelectMenu in its compact toolbar form). */
export function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: SelectOption[]; onChange: (v: string) => void }) {
  return <SelectMenu label={label} value={value} options={options} onChange={onChange} variant="compact" className="w-full" />;
}

/** Grid for the dropdown row: 2 columns on phones, one row from tablet up. */
export const FILTER_ROW = "grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4";

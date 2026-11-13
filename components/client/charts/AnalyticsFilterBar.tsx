"use client";

import { X } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { PhoneFilterBar } from "../phone";
import { DateRangeSelector, type RangeValue } from "./DateRangeSelector";

export type FilterField = {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

/**
 * Global filter bar for the Reports / analytics centre (brief section 23):
 * outlet, department, role, status and a date range. It is purely a control
 * surface - it edits values and reports whether any filter is active; the
 * page decides which fields apply to the current report family and applies
 * them. Custom selects (no native <select>): two columns on phones, one row
 * from desktop. `range` is optional, for families whose data is date-based.
 */
export function AnalyticsFilterBar({
  fields,
  range,
  onClear,
  active,
  note,
}: {
  fields: FilterField[];
  range?: { value: RangeValue; onChange: (v: RangeValue) => void };
  onClear: () => void;
  /** Any non-default filter is set (shows "Clear filters"). */
  active: boolean;
  /** Muted explanation under the bar, e.g. what the filters apply to. */
  note?: string;
}) {
  return (
    <>
    <section aria-label="Period and filters" className="flex flex-col gap-2 min-[768px]:hidden">
      {range ? <DateRangeSelector value={range.value} onChange={range.onChange} ariaLabel="Report date range" className="w-full" /> : null}
      <PhoneFilterBar
        groups={fields.map((f) => ({ key: f.key, title: f.label, value: f.value, options: f.options, onChange: f.onChange }))}
        active={fields.filter((f) => f.value !== "" && f.value !== "all").length}
        onReset={onClear}
      />
    </section>
    <section aria-label="Report filters" className="ap-card rounded-[18px] p-3.5 max-[767px]:hidden min-[768px]:p-4">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[768px]:grid-cols-3 min-[1241px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {fields.map((f) => {
          const id = `flt-${f.key}`;
          return (
            <div key={f.key} className="flex min-w-0 flex-col gap-1">
              <label htmlFor={id} className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">
                {f.label}
              </label>
              <SelectMenu id={id} value={f.value} options={f.options} onChange={f.onChange} className="h-11! text-[15px]!" />
            </div>
          );
        })}
        {range ? (
          <div className="flex min-w-0 flex-col gap-1 min-[480px]:col-span-2 min-[768px]:col-span-1">
            <span className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Date range</span>
            <div className="flex h-11 items-center">
              <DateRangeSelector value={range.value} onChange={range.onChange} ariaLabel="Report date range" />
            </div>
          </div>
        ) : null}
      </div>
      {active || note ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {note ? <p className="min-w-0 flex-1 text-[12px] leading-snug text-(--ap-muted)">{note}</p> : <span />}
          {active ? (
            <button type="button" onClick={onClear} className="ap-hit inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
              <X className="size-3.5" aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
    </>
  );
}

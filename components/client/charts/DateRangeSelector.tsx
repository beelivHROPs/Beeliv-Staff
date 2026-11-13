"use client";

import { useState } from "react";
import { DatePicker } from "@/components/applicant/form-fields";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, dayMonth, todayISO } from "@/lib/client/format";
import type { ISODate } from "@/lib/client/types";

export type RangePreset = "today" | "7d" | "30d" | "custom";
export type RangeValue = { preset: RangePreset; from: ISODate; to: ISODate };

/** Resolve a preset to concrete dates (custom keeps its own). */
export function resolveRange(preset: "today" | "7d" | "30d", today: ISODate = todayISO()): RangeValue {
  return { preset, from: preset === "today" ? today : addDays(today, preset === "7d" ? -6 : -29), to: today };
}

const SEG = "h-9 flex-1 rounded-lg px-3 text-[13px] font-bold whitespace-nowrap transition-colors";

/**
 * Custom range control (no native select or date input): a segmented
 * "7 days | 30 days | Custom" switch, where Custom opens a small panel with two
 * of the shared DatePickers. It only edits a { from, to } value; the page
 * passes that to the data hook. Future ranges are not selectable.
 */
/** Default presets (charts): "7 days | 30 days". Pages that need a period switch pass their own (e.g. Today | Week | Month). */
export type PresetOption = { key: "today" | "7d" | "30d"; label: string };
const DEFAULT_PRESETS: PresetOption[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

export function DateRangeSelector({
  value,
  onChange,
  ariaLabel = "Date range",
  presets = DEFAULT_PRESETS,
  customShowsDates = true,
  className = "",
  themeClass = "client-theme",
}: {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  ariaLabel?: string;
  presets?: PresetOption[];
  /** false = the Custom segment always reads "Custom" (the page shows the dates elsewhere). */
  customShowsDates?: boolean;
  className?: string;
  /** Theme classes for the popup (it is portaled out of the app shell). Admin passes its own. */
  themeClass?: string;
}) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<ISODate>(value.from);
  const [to, setTo] = useState<ISODate>(value.to);
  const bad = !from || !to || from > to;

  const on = (p: RangePreset) => (value.preset === p ? "bg-(--ap-tint) text-(--ap-violet)" : "text-(--ap-muted) hover:bg-(--ap-line-2)");

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`inline-flex items-center gap-0.5 rounded-xl border border-(--ap-line) bg-(--ap-surface) p-0.5 ${className}`}>
      {presets.map((p) => (
        <button key={p.key} type="button" role="radio" aria-checked={value.preset === p.key} onClick={() => onChange(resolveRange(p.key))} className={`${SEG} ${on(p.key)}`}>
          {p.label}
        </button>
      ))}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setFrom(value.from);
            setTo(value.to);
          }
        }}
      >
        <PopoverTrigger role="radio" aria-checked={value.preset === "custom"} className={`${SEG} ${on("custom")}`}>
          {value.preset === "custom" && customShowsDates ? `${dayMonth(value.from)} - ${dayMonth(value.to)}` : "Custom"}
        </PopoverTrigger>
        <PopoverContent align="end" collisionPadding={{ top: 84, bottom: 12, left: 12, right: 12 }} className={`applicant-shell ${themeClass} w-[min(300px,calc(100vw-24px))] bg-white! p-4`}>
          <b className="mb-3 block text-[15px]">Custom range</b>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--ap-ink-2)" htmlFor="client-range-from">
              From
              <DatePicker id="client-range-from" title="From date" value={from} onChange={setFrom} max={to || today} placeholder="Start date" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-(--ap-ink-2)" htmlFor="client-range-to">
              To
              <DatePicker id="client-range-to" title="To date" value={to} onChange={setTo} min={from || undefined} max={today} placeholder="End date" />
            </label>
          </div>
          {bad && from && to ? <p className="mt-2 text-[13px] text-(--ap-rose)">The start date must be on or before the end date.</p> : null}
          <button
            type="button"
            disabled={bad}
            onClick={() => {
              onChange({ preset: "custom", from, to });
              setOpen(false);
            }}
            className="ap-btn ap-btn-p mt-4 w-full text-white!"
          >
            Apply range
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

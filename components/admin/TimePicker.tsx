"use client";

import { useId, useState } from "react";
import { Clock3 } from "@/components/applicant/icons";
import { ADMIN_ROLE_CLASS } from "@/components/admin/nav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Our own time picker (replaces the browser's <input type="time">): a field that opens a small panel with hour, minute and
 * AM/PM columns. The value is "HH:mm" in 24 hours (same as the native input, so forms and mocks need no change).
 */
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function parse(value: string): { h12: number; minute: number; pm: boolean } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  return { h12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
}

function to24(h12: number, pm: boolean): number {
  return (h12 % 12) + (pm ? 12 : 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(value: string): string {
  const p = parse(value);
  return p ? `${p.h12}:${pad(p.minute)} ${p.pm ? "PM" : "AM"}` : "";
}

export function TimePicker({
  id,
  value,
  onChange,
  step = 5,
  placeholder = "Select time",
  invalid = false,
  describedBy,
  label = "Time",
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** Minute step in the panel (5 by default). */
  step?: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  const [open, setOpen] = useState(false);
  const sel = parse(value);
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);

  function set(next: Partial<{ h12: number; minute: number; pm: boolean }>) {
    const cur = sel ?? { h12: 9, minute: 0, pm: false };
    const m = { ...cur, ...next };
    onChange(`${pad(to24(m.h12, m.pm))}:${pad(m.minute)}`);
  }

  const col = "flex max-h-[220px] flex-1 flex-col gap-0.5 overflow-y-auto p-1";
  const cell = (on: boolean) =>
    `flex h-9 items-center justify-center rounded-lg text-[14px] font-semibold ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={fieldId}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`ap-input flex w-full items-center justify-between gap-2 text-left ${sel ? "" : "text-(--ap-faint)"}`}
      >
        <span>{sel ? formatTime(value) : placeholder}</span>
        <Clock3 className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={{ top: 84, bottom: 12, left: 12, right: 12 }} className={`applicant-shell admin-theme ${ADMIN_ROLE_CLASS} w-[min(260px,calc(100vw-24px))] bg-white! p-2`}>
        <div className="flex gap-1" role="group" aria-label={label}>
          <div className={col} role="listbox" aria-label="Hour">
            {HOURS.map((h) => (
              <button key={h} type="button" role="option" aria-selected={sel?.h12 === h} onClick={() => set({ h12: h })} className={cell(sel?.h12 === h)}>
                {h}
              </button>
            ))}
          </div>
          <div className={col} role="listbox" aria-label="Minute">
            {minutes.map((m) => (
              <button key={m} type="button" role="option" aria-selected={sel?.minute === m} onClick={() => set({ minute: m })} className={cell(sel?.minute === m)}>
                {pad(m)}
              </button>
            ))}
          </div>
          <div className="flex w-16 flex-col gap-0.5 p-1" role="listbox" aria-label="AM or PM">
            {(["AM", "PM"] as const).map((x) => (
              <button key={x} type="button" role="option" aria-selected={sel ? sel.pm === (x === "PM") : false} onClick={() => set({ pm: x === "PM" })} className={cell(sel ? sel.pm === (x === "PM") : false)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="ap-btn ap-btn-p mt-2 h-10 w-full text-white!">
          Done
        </button>
      </PopoverContent>
    </Popover>
  );
}

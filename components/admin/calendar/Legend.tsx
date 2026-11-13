"use client";

import { Check } from "@/components/applicant/icons";
import type { CalendarEventType } from "@/lib/admin/calendar/types";
import { toneStyle } from "./model";

/** Colour legend that doubles as the type filter: each entry toggles that type on or off. */
export function Legend({ types, counts, hidden, onToggle, layout }: { types: CalendarEventType[]; counts: Record<string, number>; hidden: Set<string>; onToggle: (id: string) => void; layout: "list" | "wrap" }) {
  return (
    <ul aria-label="Event types. Select to show or hide." className={`m-0 list-none p-0 ${layout === "list" ? "flex flex-col gap-0.5" : "flex flex-wrap gap-2"}`}>
      {types.map((t) => {
        const on = !hidden.has(t.id);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t.id)}
              style={toneStyle(t.tone)}
              className={`ap-hit flex items-center gap-2 text-left text-[13px] focus-visible:outline-2 focus-visible:outline-(--ap-violet) ${
                layout === "list" ? "w-full rounded-lg px-2 py-1.5 hover:bg-(--ap-line-2)" : "rounded-full border border-(--ap-line) px-3 py-1.5 hover:bg-(--ap-line-2)"
              } ${on ? "font-semibold text-(--ap-ink)" : "text-(--ap-muted)"}`}
            >
              <span aria-hidden="true" className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-[color:var(--ev)] ${on ? "bg-[color:var(--ev)] text-white" : "bg-transparent"}`}>
                {on ? <Check className="size-3" strokeWidth={3.2} /> : null}
              </span>
              <span className={`min-w-0 flex-1 ${on ? "" : "line-through"}`}>{t.label}</span>
              <span className="text-[12px] font-normal text-(--ap-muted) tabular-nums">{counts[t.id] ?? 0}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

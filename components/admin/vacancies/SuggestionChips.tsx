"use client";

/**
 * Suggestion chips under a one-per-line field, styled like the Applicant skills
 * step (same ap-pick chips): grouped under small category headings with an
 * "n selected" count. The textarea stays the source of truth: a chip shows as
 * selected when its text is already a line in the field (case-insensitive);
 * clicking toggles that line. The first two categories show; the rest sit
 * behind "Show more categories". Sample content, see lib/admin/vacancies/suggestions.ts.
 */
import { useState } from "react";
import { Check } from "lucide-react";
import type { SuggestionGroup } from "@/lib/admin/vacancies/suggestions";

const VISIBLE_GROUPS = 2;
const RING = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--ap-violet)";

export const linesOf = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

export function appendLine(value: string, item: string): string {
  if (linesOf(value).some((l) => l.toLowerCase() === item.toLowerCase())) return value;
  const base = value.replace(/\s+$/, "");
  return base ? `${base}\n${item}` : item;
}

export function removeLine(value: string, item: string): string {
  const key = item.toLowerCase();
  return value.split("\n").filter((l) => l.trim().toLowerCase() !== key).join("\n");
}

function Chip({ label, name, pressed, onClick }: { label: string; name: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`ap-pick ${RING}`} aria-pressed={pressed} aria-label={`${name}: ${label}, ${pressed ? "selected" : "not selected"}`} onClick={onClick}>
      {pressed ? <Check className="size-3.5" strokeWidth={2} aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

export function SuggestionChips({ noun, groups, value, onChange }: { noun: string; groups: SuggestionGroup[]; value: string; onChange: (next: string) => void }) {
  const [all, setAll] = useState(false);
  const have = new Set(linesOf(value).map((l) => l.toLowerCase()));
  const nonEmpty = groups.filter((g) => g.items.length);
  if (!nonEmpty.length) return null;
  const shown = all ? nonEmpty : nonEmpty.slice(0, VISIBLE_GROUPS);
  const hidden = nonEmpty.length - VISIBLE_GROUPS;
  const label = noun.charAt(0).toUpperCase() + noun.slice(1);
  return (
    <div role="group" aria-label={`Suggested ${noun}s`} className="mt-3">
      {shown.map((g) => {
        const count = g.items.filter((i) => have.has(i.toLowerCase())).length;
        return (
          <section key={g.category} aria-label={g.category} className="mb-3 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <b className="text-[13px] font-semibold text-(--ap-ink-2)">{g.category}</b>
              <span className="text-[13px] text-(--ap-muted)" aria-live="polite">{count} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.items.map((i) => {
                const on = have.has(i.toLowerCase());
                return <Chip key={i} label={i} name={label} pressed={on} onClick={() => onChange(on ? removeLine(value, i) : appendLine(value, i))} />;
              })}
            </div>
          </section>
        );
      })}
      {hidden > 0 ? (
        <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className={`mt-1 text-[13px] text-(--ap-muted) underline-offset-2 hover:text-(--ap-violet) hover:underline ${RING}`}>
          {all ? "Show fewer categories" : `Show more categories (${hidden})`}
        </button>
      ) : null}
    </div>
  );
}

/** Experience-summary templates. Same chip look; the matching one shows selected. A click fills the field (the click is the consent to replace). */
export function TemplateChips({ items, current, onPick }: { items: string[]; current: string; onPick: (t: string) => void }) {
  return (
    <div role="group" aria-label="Experience summary suggestions" className="mt-3 flex flex-wrap gap-2">
      {items.map((t) => (
        <Chip key={t} label={t} name="Experience summary" pressed={current.trim().toLowerCase() === t.toLowerCase()} onClick={() => onPick(t)} />
      ))}
    </div>
  );
}

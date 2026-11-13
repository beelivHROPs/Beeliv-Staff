"use client";

import { useState } from "react";
import { ChefHat, ConciergeBell, Search, UsersRound, Wine, type LucideIcon } from "@/components/applicant/icons";
import { SKILL_CATEGORIES } from "@/lib/applicant/reference-data";
import type { ApplyFormData } from "@/lib/applicant/types";
import { Pick, STROKE } from "./parts";

/** Wireframe SK_I map: category -> LU icon (kitchen/foh/bar/mgmt). */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Kitchen: ChefHat,
  Floor: ConciergeBell,
  Bar: Wine,
  Management: UsersRound,
};

export function StepSkills({ form, toggleSkill }: { form: ApplyFormData; toggleSkill: (c: string, s: string) => void }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const visible = SKILL_CATEGORIES.map(({ category, skills }) => ({
    category,
    skills: skills.filter((s) => !query || s.toLowerCase().includes(query)),
  })).filter((c) => c.skills.length > 0);

  return (
    <div>
      {/* `.sch` search field */}
      <label
        htmlFor="ap-skillq"
        className="mb-4 flex h-13 items-center gap-2.5 rounded-xl border border-transparent bg-(--ax-fill) px-3.5 text-(--ap-muted) focus-within:border-(--ap-violet) focus-within:bg-(--ax-surface)"
      >
        <Search className="size-5 shrink-0" strokeWidth={STROKE} aria-hidden="true" />
        <span className="sr-only">Search skills</span>
        <input
          id="ap-skillq"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search skills, e.g. grill, POS, scheduling"
          className="w-full border-0 bg-transparent text-[16px] text-(--ap-ink) outline-0 placeholder:text-(--ap-muted)"
        />
      </label>

      {visible.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-(--ap-line) p-4 text-[14px] text-(--ap-muted)">
          No skills match &ldquo;{q.trim()}&rdquo;. Try a shorter word, like &ldquo;grill&rdquo; or &ldquo;POS&rdquo;.
        </p>
      ) : null}

      {visible.map(({ category, skills }) => {
        const selected = form.skills[category] ?? [];
        const Icon = CATEGORY_ICON[category] ?? UsersRound;
        return (
          // `.skillcat`
          <section key={category} className="border-b border-(--ap-line-2) py-4 first:pt-0" aria-label={category}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <b className="flex items-center gap-2 text-[15px]">
                <Icon className="size-5 shrink-0" strokeWidth={STROKE} aria-hidden="true" />
                {category}
              </b>
              <span className="text-[13px] text-(--ap-muted)" aria-live="polite">
                {selected.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Pick key={s} pressed={selected.includes(s)} onClick={() => toggleSkill(category, s)}>
                  {s}
                </Pick>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

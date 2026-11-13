"use client";

/**
 * Detail-page section card with a short heading that folds the section (tap or click the
 * heading). Sections marked `closed` start as one quiet line, so a long record shows only
 * what matters first and everything else is one click away (nothing is removed).
 * Used by the Applicant detail panels.
 */
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/applicant/icons";
import { CARD } from "@/components/applicant/SectionCard";

export function FoldCard({ title, right, closed = false, label, className = "", children }: { title: string; right?: ReactNode; closed?: boolean; label?: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(!closed);
  const id = useId();
  return (
    <section aria-label={label} className={`${CARD} min-w-0 ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${open ? "mb-3.5 max-[767px]:mb-2" : "mb-0"}`}>
        <h2 className="min-w-0 flex-1 text-[17px] leading-tight font-bold text-(--ap-ink)">
          <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-10 w-full items-center gap-2 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
            <span className="min-w-0 flex-1">{title}</span>
            <ChevronDown className={`size-4 shrink-0 text-(--ap-muted) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </h2>
        {right}
      </div>
      <div id={id} className={open ? "" : "hidden"}>
        {children}
      </div>
    </section>
  );
}

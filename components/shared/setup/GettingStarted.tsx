"use client";

/**
 * The "Complete your profile" group, after setup, as the Getting started card on Home.
 * Same StepCard as the setup page. Never blocking. A tick comes only from the `done` flag the
 * caller got from the server; sensitive values are never shown here (the action opens the
 * existing section, where NIN and bank stay write-only and masked).
 * Render nothing when there is nothing to do (the caller decides, see `items.length`).
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { JOURNEY_FOCUS, JourneyRing, StepCard, StepGroup } from "./journey";

export type GettingStartedItem = { id: string; title: string; why: string; done: boolean; href: string; actionLabel: string; summary?: string };

export function GettingStartedCard({ items, renderAction }: { items: GettingStartedItem[]; renderAction?: (item: GettingStartedItem, primary: boolean) => ReactNode }) {
  const firstOpen = items.find((i) => !i.done)?.id ?? null;
  const [openId, setOpenId] = useState<string | null>(firstOpen);
  const done = items.filter((i) => i.done).length;
  if (items.length === 0 || done === items.length) return null;
  const next = items.find((i) => !i.done);
  return (
    <section aria-labelledby="gs-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff) p-4 min-[640px]:p-5">
        <JourneyRing value={done / items.length} size={68} stroke={7} label={`${done} of ${items.length} done`}>
          <b className="text-[16px] leading-none text-(--ap-ink) tabular-nums">
            {done}/{items.length}
          </b>
        </JourneyRing>
        <div className="min-w-0">
          <h2 id="gs-title" className="text-[20px] leading-tight font-bold text-(--ap-ink) tabular-nums">
            Getting started: {done} of {items.length} done
          </h2>
          <p className="mt-0.5 text-[15px] leading-snug text-(--ap-ink-2)">{next ? `Up next: ${next.title}. Nothing here blocks you.` : "Nothing here blocks you."}</p>
        </div>
      </div>
      <StepGroup label="Complete your profile">
        {items.map((i, idx) => {
          const primary = i.id === next?.id;
          return (
            <StepCard key={i.id} id={`gs-${i.id}`} number={idx + 1} state={i.done ? "done" : primary ? "current" : "todo"} title={i.title} summary={i.done ? (i.summary ?? "Saved") : undefined} open={openId === i.id} onToggle={() => setOpenId(openId === i.id ? null : i.id)} why={i.why}>
              {renderAction ? (
                renderAction(i, primary)
              ) : (
                <Link href={i.href} className={`ap-btn ${primary && !i.done ? "ap-btn-p text-white!" : ""} h-12 w-fit px-5 text-[15px] font-semibold ${JOURNEY_FOCUS}`}>
                  {i.done ? "Review" : i.actionLabel}
                </Link>
              )}
            </StepCard>
          );
        })}
      </StepGroup>
    </section>
  );
}

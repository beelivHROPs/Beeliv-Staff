"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronLeft, FileText } from "@/components/applicant/icons";
import { SubmittedMark } from "@/components/applicant/apply/SubmittedMark";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Chip } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { toast } from "@/components/ui/toast";
import { dayMonth, dueLabel } from "@/lib/staff/format";
import { acknowledgeSOP, completeSOP, saveSOPProgress } from "@/lib/staff/service";
import type { SOPAssignment } from "@/lib/staff/types";
import { ImageRoom } from "../ImageRoom";
import type { LearningEntry } from "./learning";

const BACK = "ap-hit mb-1.5 mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ap-violet) hover:text-(--ap-plum)";
const BTN = "ap-btn text-[15px] font-semibold";

/**
 * Stepped SOP reader, same pattern as the Applicant application form:
 * sticky section rail from 1041px, compact progress card below that, a
 * reading card, and a Previous / Next bar. The reader's place is saved per
 * assignment (saveSOPProgress) so reopening resumes; a completed SOP stays
 * readable with no completion button. Progress % is derived from sections
 * read, and the backend stays the authority on it.
 */
export function SopReader({ a, next }: { a: SOPAssignment; next: LearningEntry | null }) {
  // A missing sections list (backend has none yet) reads as one section built from the description.
  const sections = a.sop.sections?.length ? a.sop.sections : [{ id: "overview", title: "Overview", body: a.sop.description }];
  const total = sections.length;
  const wasCompleted = a.status === "completed";

  const [index, setIndex] = useState(() => (wasCompleted ? 0 : Math.max(0, Math.min(total - 1, a.currentSection ?? 0))));
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);
  const [doneAt, setDoneAt] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const read = new Set([...(a.completedSections ?? []), ...Array.from({ length: index }, (_, i) => i)]);
  const pct = wasCompleted ? 100 : Math.round((read.size / total) * 100);
  const isLast = index === total - 1;
  const isDone = (i: number) => wasCompleted || read.has(i);

  function go(i: number) {
    if (i === index || i < 0 || i >= total) return;
    setDir(i > index ? 1 : -1);
    setIndex(i);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Remember the place. Failing to save must never block reading.
    if (!wasCompleted) saveSOPProgress(a.id, i).catch(() => {});
  }

  async function finish() {
    const needsAck = a.sop.requiresAcknowledgement;
    const ok = await confirmAction(
      needsAck
        ? { tone: "neutral", title: `Acknowledge "${a.sop.title}"?`, description: "Your acknowledgement is recorded against your Beeliv account.", acknowledge: "I have read and understood this SOP.", confirmLabel: "Acknowledge & complete" }
        : { tone: "neutral", title: `Mark "${a.sop.title}" as completed?`, confirmLabel: "Mark as completed" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await (needsAck ? acknowledgeSOP(a.id) : completeSOP(a.id));
      setDoneAt(res.completedAt ?? new Date().toISOString());
      setShowDone(true);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const crumb = (
    <Link href="/staff/sops-training" className={BACK}>
      <ChevronLeft className="size-4" aria-hidden="true" /> SOPs &amp; Training
    </Link>
  );

  if (showDone) {
    const at = doneAt ?? a.completedAt ?? new Date().toISOString();
    return (
      <>
        {crumb}
        <section className={`${CARD} mx-auto mt-3 flex max-w-[560px] flex-col items-center text-center min-[768px]:p-10`} aria-labelledby="sop-done-h">
          <SubmittedMark label="SOP completed" plane={false} />
          <h1 id="sop-done-h" className="ap-serif mt-3 text-[32px] leading-tight min-[768px]:text-[40px]">SOP completed</h1>
          <p className="ap-bd mt-2 max-w-[42ch]">
            You completed &ldquo;{a.sop.title}&rdquo; on {dayMonth(at.slice(0, 10))} {at.slice(0, 4)}.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2.5 min-[768px]:w-auto min-[768px]:flex-row">
            {next ? (
              <Link href={`/staff/sops-training/${next.id}`} className={`${BTN} ap-btn-p h-12`}>
                Next SOP <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link href="/staff/sops-training" className={`${BTN} ap-btn-s h-12`}>Back to SOPs</Link>
          </div>
          <button type="button" onClick={() => { setShowDone(false); setIndex(0); setDir(-1); }} className="ap-hit mt-4 text-[13px] font-bold text-(--ap-violet)">
            Read it again
          </button>
        </section>
      </>
    );
  }

  const section = sections[index];
  const paragraphs = section.body.split(/\n{2,}/);

  return (
    <div>
      {crumb}

      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop rail: sections, ticks, jump back */}
        <aside className={`${CARD} sticky top-[88px] hidden p-6 min-[1041px]:block`} aria-label="SOP sections">
          <div className="mb-2.5 flex items-center gap-3 border-b border-(--ap-line-2) pb-4">
            <ImageRoom src={null} icon={FileText} className="size-[46px] shrink-0 rounded-xl" iconClassName="size-5" />
            <div className="min-w-0">
              <b className="block text-[15px] leading-snug">{a.sop.title}</b>
              <span className="text-[13px] text-(--ap-muted)">{a.sop.category} · {a.sop.version}</span>
            </div>
          </div>
          <ol className="m-0 flex list-none flex-col p-0">
            {sections.map((s, i) => {
              const done = isDone(i);
              const current = i === index;
              const canJump = done || current;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!canJump}
                    onClick={() => go(i)}
                    aria-current={current ? "step" : undefined}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-[14px] disabled:cursor-default ${
                      current ? "bg-(--ap-tint) font-bold text-(--ap-violet)" : done ? "font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)" : "font-semibold text-(--ap-muted)"
                    }`}
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold ${done && !current ? "border-(--ap-violet) bg-(--ap-violet) text-white" : current ? "border-(--ap-violet) bg-white text-(--ap-violet)" : "border-[#cfc8d8] bg-white"}`}>
                      {done && !current ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className="min-w-0">{s.title}</span>
                    {done && !current ? <span className="sr-only"> (read)</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="ap-bar mt-4" role="progressbar" aria-label="SOP progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <i className="transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="ap-label mt-2 flex justify-between text-(--ap-muted)">
            <span>{a.dueDate && !wasCompleted ? dueLabel(a.dueDate) : "Progress"}</span>
            <span>{pct}%</span>
          </div>
        </aside>

        {/* Reading area */}
        <section className={`${CARD} min-w-0 p-6 min-[768px]:max-[1100px]:p-[22px] max-[767px]:px-4.5 max-[767px]:py-5`} aria-labelledby="sop-section-h">
          <div className="mb-2.5 flex flex-wrap gap-2">
            <Chip tone="violet">SOP</Chip>
            {wasCompleted ? <Chip tone="ok">Completed</Chip> : null}
            {a.required ? <Chip tone="warn">Required</Chip> : null}
          </div>
          <div key={index} className={dir > 0 ? "ap-step-fwd" : "ap-step-back"}>
            <h1 id="sop-section-h" className="ap-serif text-[35px] max-[767px]:text-[30px]">{section.title}</h1>
            <div className="mt-3 flex flex-col gap-3">
              {paragraphs.map((p, i) => (
                <p key={i} className="ap-bd">{p}</p>
              ))}
            </div>
            {/* Room for the section's photo or diagram */}
            <ImageRoom src={null} icon={FileText} className="mt-5 h-[180px] w-full rounded-2xl min-[768px]:h-[240px]" iconClassName="size-10" />
          </div>

          {/* Previous / Next: at the end of the content (not floating). On phones two buttons, Previous left and the main action right. */}
          <div className="mt-6.5 flex items-center gap-2.5 border-t border-(--ap-line-2) pt-4.5 max-[767px]:mt-5.5 max-[767px]:gap-3">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={`${BTN} ap-btn-s max-[767px]:h-auto max-[767px]:min-h-12 max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-3 max-[767px]:py-2 max-[767px]:text-center max-[767px]:leading-tight max-[767px]:!whitespace-normal`}>
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </button>
            <span className="flex-1 max-[767px]:hidden" />
            {!isLast ? (
              <button type="button" onClick={() => go(index + 1)} className={`${BTN} ap-btn-p max-[767px]:h-auto max-[767px]:min-h-12 max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-3 max-[767px]:py-2 max-[767px]:text-center max-[767px]:leading-tight max-[767px]:!whitespace-normal`}>
                Next <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : wasCompleted ? (
              <Link href="/staff/sops-training" className={`${BTN} ap-btn-p max-[767px]:h-auto max-[767px]:min-h-12 max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-3 max-[767px]:py-2 max-[767px]:text-center max-[767px]:leading-tight max-[767px]:!whitespace-normal`}>Back to SOPs</Link>
            ) : (
              <button type="button" onClick={finish} disabled={busy} className={`${BTN} ap-btn-p max-[767px]:h-auto max-[767px]:min-h-12 max-[767px]:min-w-0 max-[767px]:flex-1 max-[767px]:px-3 max-[767px]:py-2 max-[767px]:text-center max-[767px]:leading-tight max-[767px]:!whitespace-normal`}>
                {busy ? "Saving..." : a.sop.requiresAcknowledgement ? "Acknowledge & complete" : "Mark as completed"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Phones and tablets: compact progress card, below the SOP (not above it) */}
      <div className={`${CARD} mt-4 px-4 py-3.5 min-[1041px]:hidden`}>
        <div className="flex items-baseline justify-between gap-3">
          <b className="text-[14px]">Section {index + 1} of {total} · {pct}%</b>
          {wasCompleted ? <Chip tone="ok">Completed</Chip> : null}
        </div>
        <div className="ap-bar mt-2.5" role="progressbar" aria-label="SOP progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i className="transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[13px] text-(--ap-muted)">
          <span className="min-w-0 truncate">{a.sop.title}</span>
          <span className="shrink-0 text-right">{isLast ? (wasCompleted ? "Last section" : "Then: complete") : `Next: ${sections[index + 1].title}`}</span>
        </div>
      </div>
    </div>
  );
}

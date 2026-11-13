"use client";

import { useState } from "react";
import { Check, ChevronLeft, FileText } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { dayMonth, dueLabel } from "@/lib/staff/format";
import { useSOPs, useTraining } from "@/lib/staff/hooks";
import { completeTraining, startTraining } from "@/lib/staff/service";
import { BookOpen, CircleCheck } from "../icons";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Dot, Facts, PANEL, Panel, Sk, StateCard, confirmAction } from "../kit";
import { toEntries, type LearningEntry } from "./learning";
import { ReaderSkeleton, SopFullReader } from "./SopFullReader";

const BACK_HREF = "/staff/sops-training";

/** Route-level loading UI: the reader frame (SOPs open full screen). */
export function SopDetailSkeleton() {
  return <ReaderSkeleton />;
}

function Back() {
  return (
    <ActionPill href={BACK_HREF} variant="ghost" compact icon={ChevronLeft} arrow={false} className="-ml-2">
      SOPs &amp; Training
    </ActionPill>
  );
}

/**
 * /staff/sops-training/[id]. An assigned SOP opens in the full-screen reader (links shown in the
 * app). A training assignment keeps this simple detail page: purpose, progress and one action.
 */
export function SopDetailBody({ id }: { id: string }) {
  const sops = useSOPs();
  const training = useTraining();

  // SOP assignments (the ids the library also uses) go straight to the reader.
  if (sops.status === "ready" && sops.data?.some((s) => s.id === id)) return <SopFullReader id={id} />;

  if (sops.status === "loading" || training.status === "loading") return <TrainingSkeleton />;
  if (sops.status === "error" || training.status === "error") {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">SOPs &amp; Training</h1>
        <Back />
        <ErrorPanel
          title="We couldn't load this item"
          retry={() => {
            sops.retry();
            training.retry();
          }}
        />
      </div>
    );
  }

  const entries = toEntries(sops.data ?? [], training.data ?? []);
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">SOPs &amp; Training</h1>
        <Back />
        <StateCard
          icon={BookOpen}
          title="We can't find that item"
          text="It may have been archived or reassigned. Go back to see what is assigned to you."
          action={
            <ActionPill href={BACK_HREF} variant="purple" compact arrow={false} className="w-full justify-center">
              Back to the list
            </ActionPill>
          }
        />
      </div>
    );
  }
  if (entry.kind === "sop") return <SopFullReader id={id} />;

  const facts: [string, string][] = [
    ["Type", "Training"],
    ["Category", entry.category],
    ["Format", entry.meta],
    ...(entry.department ? ([["Department", entry.department]] as [string, string][]) : []),
    ["Assigned", dayMonth(entry.assignedAt) + " " + entry.assignedAt.slice(0, 4)],
  ];
  const tone = entry.status === "completed" ? "ok" : entry.status === "in-progress" ? "info" : "mute";
  const word = entry.status === "completed" ? "Completed" : entry.status === "in-progress" ? "In progress" : "Assigned";

  return (
    <div className="flex w-full max-w-[860px] flex-col gap-5 pt-2 pb-2">
      <Back />
      <header>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Dot tone={tone}>{word}</Dot>
          {entry.required ? <Dot tone="warn">Required</Dot> : null}
        </p>
        <h1 className="mt-2 text-[28px] leading-tight font-bold text-(--ap-ink)">{entry.title}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-(--ap-ink-2)">{entry.description}</p>
      </header>
      <ProgressPanel entry={entry} />
      <Panel title="About this training">
        <Facts rows={facts} />
      </Panel>
      <div id={MATERIAL_ID} tabIndex={-1} className={`${PANEL} flex items-center gap-3 p-4 text-[14px] text-(--ap-muted) focus:outline-none`}>
        <FileText className="size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
        The training material opens here once Beeliv publishes it.
      </div>
    </div>
  );
}

/** The training material panel; "Continue training" brings it into view. */
const MATERIAL_ID = "training-material";

function TrainingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 pt-2" aria-busy="true" aria-label="Loading">
      <h1 className="sr-only">SOPs &amp; Training</h1>
      <Sk className="h-8 w-44 rounded-full" />
      <Sk className="h-[120px]" />
      <Sk className="h-[170px]" />
      <Sk className="h-[200px]" />
    </div>
  );
}

/** Progress plus the one action that fits the item's state. Whether it is allowed is the backend's call. */
function ProgressPanel({ entry }: { entry: LearningEntry }) {
  const [busy, setBusy] = useState(false);
  const done = entry.status === "completed";

  async function run(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await work();
      toast.add({ title: success, type: "success" });
    } catch {
      toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    const ok = await confirmAction({ tone: "neutral", title: `Mark "${entry.title}" as complete?`, confirmLabel: "Mark complete" });
    if (ok) await run(() => completeTraining(entry.id), "Training completed");
  }

  function continueTraining() {
    const el = document.getElementById(MATERIAL_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }

  return (
    <Panel title="Your progress" aside={<span className="text-[14px] font-semibold text-(--ap-muted) tabular-nums">{entry.progress}%</span>}>
      <div className="h-2 overflow-hidden rounded-full bg-(--ap-line-2)" role="progressbar" aria-label={`${entry.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={entry.progress}>
        <div className="h-full rounded-full bg-(--ap-violet)" style={{ width: `${entry.progress}%` }} />
      </div>
      <p className="mt-2 text-[14px] text-(--ap-muted)">{entry.dueDate && !done ? dueLabel(entry.dueDate) : entry.dueDate ? "Completed" : "No due date"}</p>
      <div className="mt-5">
        {done ? (
          <p className="flex items-center gap-2 text-[16px] font-semibold text-(--ap-ok)">
            <CircleCheck className="size-5" aria-hidden="true" />
            Complete
          </p>
        ) : entry.status === "assigned" ? (
          <ActionPill variant="dark" icon={BookOpen} fit loading={busy} onClick={() => run(() => startTraining(entry.id), "Training started")} className="max-[767px]:w-full">
            Start training
          </ActionPill>
        ) : entry.progress >= 100 ? (
          <ActionPill variant="dark" icon={Check} fit loading={busy} onClick={complete} className="max-[767px]:w-full">
            Mark as complete
          </ActionPill>
        ) : (
          /* Below 100% the one action is to keep going: it takes you to the training material on this page. */
          <ActionPill variant="dark" icon={BookOpen} fit onClick={continueTraining} className="max-[767px]:w-full">
            Continue training
          </ActionPill>
        )}
      </div>
    </Panel>
  );
}

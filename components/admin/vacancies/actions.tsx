"use client";

/**
 * Status actions (submit / publish / resume / pause / close / mark filled /
 * cancel) shared by the list row menu and the detail header. Actions that need
 * a reason collect it in ReasonDialog, then ask for a final yes/no with the
 * shared confirmAction. The adapter appends the Activity entry.
 */
import { useState, type ReactNode } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { performVacancyAction } from "@/lib/admin/vacancies/hooks";
import type { VacancyAction, VacancyDetail } from "@/lib/admin/vacancies/types";
import { ACTION_LABEL, ACTION_NEEDS_REASON } from "./meta";
import { ReasonDialog } from "./parts";

const COPY: Record<VacancyAction, { title: (t: string) => string; description: string; points: string[]; tone: "neutral" | "caution" | "danger"; done: string }> = {
  "submit-for-approval": {
    title: (t) => `Submit ${t} for approval?`,
    description: "It will not be visible to applicants until it is approved and published.",
    points: ["Status changes from Draft to Pending Approval.", "Who approves a vacancy needs Beeliv confirmation."],
    tone: "neutral",
    done: "was submitted for approval.",
  },
  publish: {
    title: (t) => `Publish ${t}?`,
    description: "Applicants will see it in Find Jobs straight away.",
    points: ["The closing date and job details are shown to applicants.", "Internal-only salary and benefits stay hidden."],
    tone: "neutral",
    done: "was published.",
  },
  resume: {
    title: (t) => `Resume ${t}?`,
    description: "It becomes visible to applicants again.",
    points: ["Existing applications are not affected."],
    tone: "neutral",
    done: "was resumed.",
  },
  pause: {
    title: (t) => `Pause ${t}?`,
    description: "It is hidden from job listings. Existing applications continue.",
    points: ["You can resume it later.", "Your reason is added to the vacancy activity."],
    tone: "caution",
    done: "was paused.",
  },
  close: {
    title: (t) => `Close ${t}?`,
    description: "Applicants will see it as no longer accepting applications.",
    points: ["Existing applications are kept.", "Your reason is added to the vacancy activity."],
    tone: "danger",
    done: "was closed.",
  },
  "mark-filled": {
    title: (t) => `Mark ${t} as filled?`,
    description: "Applicants will see that the position is filled.",
    points: ["Existing applications are kept.", "Your reason is added to the vacancy activity."],
    tone: "caution",
    done: "was marked as filled.",
  },
  cancel: {
    title: (t) => `Cancel ${t}?`,
    description: "The vacancy is withdrawn and is not shown to applicants.",
    points: ["The record and its history are kept.", "Your reason is added to the vacancy activity."],
    tone: "danger",
    done: "was cancelled.",
  },
};

const REASON_LABEL: Partial<Record<VacancyAction, string>> = {
  pause: "Reason for pausing",
  close: "Reason for closing",
  "mark-filled": "How was the position filled?",
  cancel: "Reason for cancelling",
};

type Target = { id: string; title: string; revision?: number };

export function useVacancyActions(handlers: { onDone: (d: VacancyDetail, message: string) => void; onError: (message: string) => void }) {
  const [asking, setAsking] = useState<{ target: Target; action: VacancyAction } | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmAndRun(target: Target, action: VacancyAction, reason?: string) {
    const c = COPY[action];
    await confirmAction({
      tone: c.tone,
      title: c.title(target.title),
      description: c.description,
      points: c.points,
      confirmLabel: ACTION_LABEL[action],
      onConfirm: async () => {
        setBusy(true);
        try {
          const d = await performVacancyAction(target.id, { action, reason }, target.revision);
          handlers.onDone(d, `${target.title} ${c.done}`);
        } catch (error) {
          handlers.onError(error instanceof Error ? error.message : `We could not confirm the update. Reload the vacancy to check.`);
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function start(target: Target, action: VacancyAction) {
    if (ACTION_NEEDS_REASON.includes(action)) setAsking({ target, action });
    else void confirmAndRun(target, action);
  }

  const dialog: ReactNode = asking ? (
    <ReasonDialog
      key={`${asking.action}-${asking.target.id}`}
      title={COPY[asking.action].title(asking.target.title).replace("?", "")}
      description={COPY[asking.action].description}
      label={REASON_LABEL[asking.action] ?? "Reason"}
      confirmLabel="Continue"
      tone={COPY[asking.action].tone === "danger" ? "danger" : "neutral"}
      onCancel={() => setAsking(null)}
      onSubmit={(reason) => {
        const a = asking;
        setAsking(null);
        void confirmAndRun(a.target, a.action, reason);
      }}
    />
  ) : null;

  return { start, dialog, busy };
}

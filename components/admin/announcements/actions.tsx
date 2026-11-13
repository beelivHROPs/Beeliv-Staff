"use client";

/**
 * Publish / Unpublish (or cancel a schedule, or reuse an expired one) / End now,
 * shared by the list row menu and the detail header. Each asks for a final
 * yes/no with the shared confirmAction; the adapter appends the Activity entry.
 */
import { useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { performAnnouncementAction } from "@/lib/admin/announcements/hooks";
import type { AnnouncementAction, AnnouncementDetail, AnnouncementRow } from "@/lib/admin/announcements/types";
import { actionLabel } from "./meta";

export type ActionTarget = Pick<AnnouncementRow, "id" | "title" | "status" | "audienceLabel">;

function copy(t: ActionTarget, action: AnnouncementAction) {
  switch (action) {
    case "publish":
      return { title: `Publish ${t.title}?`, description: `It goes to: ${t.audienceLabel}. If you set a later date it is scheduled instead.`, points: ["Staff see it on their Home screen.", "Email is not sent. It needs Beeliv confirmation.", "The change is added to the activity log."], tone: "neutral" as const, done: "was published." };
    case "end":
      return { title: `End ${t.title} now?`, description: "It stops showing to staff and moves to Expired.", points: ["Read receipts are kept.", "The change is added to the activity log."], tone: "caution" as const, done: "was ended." };
    case "unpublish":
      return {
        title: t.status === "expired" ? `Reuse ${t.title} as a draft?` : t.status === "scheduled" ? `Cancel the schedule for ${t.title}?` : `Unpublish ${t.title}?`,
        description: t.status === "expired" ? "It returns to Draft so you can edit and publish it again." : "It returns to Draft and staff can no longer see it.",
        points: ["Nothing is deleted.", "The change is added to the activity log."],
        tone: t.status === "expired" ? ("neutral" as const) : ("caution" as const),
        done: t.status === "expired" ? "is a draft again." : "was returned to draft.",
      };
  }
}

export function useAnnouncementActions(handlers: { onDone: (d: AnnouncementDetail, message: string) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function start(target: ActionTarget, action: AnnouncementAction) {
    const c = copy(target, action);
    await confirmAction({
      tone: c.tone,
      title: c.title,
      description: c.description,
      points: c.points,
      confirmLabel: actionLabel(action, target.status),
      onConfirm: async () => {
        setBusy(true);
        try {
          const d = await performAnnouncementAction(target.id, action);
          handlers.onDone(d, `${target.title} ${c.done}`);
        } catch {
          handlers.onError(`We could not update ${target.title}. Nothing was changed. Please try again.`);
        } finally {
          setBusy(false);
        }
      },
    });
  }

  return { start, busy };
}

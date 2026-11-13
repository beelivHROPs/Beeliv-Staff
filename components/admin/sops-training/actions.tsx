"use client";

/**
 * Publish / Unpublish / Archive / Restore, shared by the list row menu and the
 * detail header. Every action asks for a final yes/no with the shared
 * confirmAction; the adapter appends the Activity entry (who, what, when).
 * Agreements: publishing a new version forces everyone who accepted the
 * earlier version to accept again, and the confirmation says so.
 */
import { useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { performContentAction } from "@/lib/admin/sops-training/hooks";
import type { ContentAction, ContentDetail, ContentKind, ContentRow } from "@/lib/admin/sops-training/types";
import { ACTION_LABEL, KIND_ONE } from "./meta";

export type ActionTarget = Pick<ContentRow, "id" | "title" | "kind" | "version" | "liveVersion" | "status" | "required">;

function copy(t: ActionTarget, action: ContentAction): { title: string; description: string; points: string[]; tone: "neutral" | "caution" | "danger"; done: string } {
  const kind: ContentKind = t.kind;
  const newVersion = !!t.liveVersion;
  switch (action) {
    case "publish": {
      const points = ["Staff in the audience can open it in the Staff app.", "The change is added to the activity log."];
      if (newVersion) {
        points.unshift(`${t.version} replaces ${t.liveVersion}. Staff see ${t.version} from now on.`);
        if (kind === "agreement") points.unshift(`Everyone who accepted ${t.liveVersion} is asked to accept ${t.version} again.`);
        else if (kind === "sop" && t.required) points.push("Earlier acknowledgements are kept against the older version. Whether staff must acknowledge a new version again needs Beeliv confirmation.");
      }
      return { title: `Publish ${t.title}${newVersion ? ` ${t.version}` : ""}?`, description: `This ${KIND_ONE[kind].toLowerCase()} becomes visible to its audience straight away.`, points, tone: "neutral", done: "was published." };
    }
    case "unpublish":
      return {
        title: `Unpublish ${t.title}?`,
        description: "Staff will no longer be able to open it. It returns to Draft.",
        points: ["Progress and acceptances already recorded are kept.", "You can publish it again later.", "The change is added to the activity log."],
        tone: "caution",
        done: "was unpublished.",
      };
    case "archive":
      return {
        title: `Archive ${t.title}?`,
        description: t.status === "published" ? "It is removed from staff and kept for your records." : "It is kept for your records and hidden from the default view.",
        points: ["Its history and tracking stay available.", "You can restore it as a draft later.", "The change is added to the activity log."],
        tone: "danger",
        done: "was archived.",
      };
    case "restore":
      return { title: `Restore ${t.title}?`, description: "It returns as a Draft. Nothing is visible to staff until you publish it.", points: ["The change is added to the activity log."], tone: "neutral", done: "was restored as a draft." };
  }
}

export function useContentActions(handlers: { onDone: (d: ContentDetail, message: string) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function start(target: ActionTarget, action: ContentAction) {
    const c = copy(target, action);
    await confirmAction({
      tone: c.tone,
      title: c.title,
      description: c.description,
      points: c.points,
      confirmLabel: ACTION_LABEL[action],
      onConfirm: async () => {
        setBusy(true);
        try {
          const d = await performContentAction(target.id, { action });
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

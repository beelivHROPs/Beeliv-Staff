"use client";

/**
 * Client Request actions shared by the list and detail: Assign (to me or
 * another HR user), Acknowledge, Mark fulfilled, Decline (reason required).
 * Each destructive or status-changing action asks a final yes/no with the
 * shared confirmAction. The adapter writes the activity entry. Link / Create
 * vacancy are plain links (the Vacancies screens own that form).
 */
import { useState, type ReactNode } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { SelectField, Sheet, TextField } from "@/components/admin/client-review/parts";
import { acknowledgeRequest, assignRequest, declineRequest, markRequestFulfilled } from "@/lib/admin/client-requests/hooks";
import type { PersonRef, RequestDetail } from "@/lib/admin/client-requests/types";

export type RequestAction = "assign" | "acknowledge" | "fulfil" | "decline";
export interface RequestTarget {
  id: string;
  label: string;
  hrOptions: PersonRef[];
  assignedId: string | null;
}

export const ACTION_LABEL: Record<RequestAction, string> = {
  assign: "Assign to another HR user",
  acknowledge: "Acknowledge request",
  fulfil: "Mark as fulfilled",
  decline: "Decline request",
};

export function useRequestActions(handlers: { onDone: (d: RequestDetail, message: string) => void; onError: (message: string) => void }) {
  const [asking, setAsking] = useState<{ target: RequestTarget; action: RequestAction } | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(target: RequestTarget, fn: () => Promise<RequestDetail>, done: string) {
    setBusy(true);
    try {
      handlers.onDone(await fn(), `${target.label} ${done}`);
    } catch {
      handlers.onError(`We could not update ${target.label}. Nothing was changed. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  const assign = (target: RequestTarget, assigneeId: string) => {
    const who = target.hrOptions.find((p) => p.id === assigneeId);
    return go(target, () => assignRequest(target.id, { assigneeId }), who?.isMe ? "was assigned to you." : `was assigned to ${who?.name ?? "HR"}.`);
  };

  async function acknowledge(target: RequestTarget) {
    await confirmAction({
      tone: "neutral",
      title: `Acknowledge ${target.label}?`,
      description: "The client sees the request as under review.",
      points: ["If nobody is assigned, it is assigned to you.", "This does not publish a vacancy."],
      confirmLabel: "Acknowledge",
      onConfirm: () => go(target, () => acknowledgeRequest(target.id), "was acknowledged."),
    });
  }

  async function fulfil(target: RequestTarget, note: string) {
    await confirmAction({
      tone: "caution",
      title: `Mark ${target.label} as fulfilled?`,
      description: "Use this once the staff have been placed. The client sees the request as closed.",
      points: ["The request and its activity are kept.", "Your note is added to the activity."],
      confirmLabel: "Mark as fulfilled",
      onConfirm: () => go(target, () => markRequestFulfilled(target.id, { note }), "was marked as fulfilled."),
    });
  }

  async function decline(target: RequestTarget, reason: string) {
    await confirmAction({
      tone: "danger",
      title: `Decline ${target.label}?`,
      description: "The client sees the request as closed. Whether the reason is shared with the client needs Beeliv confirmation.",
      points: ["The request and its activity are kept.", "Your reason is added to the activity."],
      confirmLabel: "Decline request",
      onConfirm: () => go(target, () => declineRequest(target.id, { reason }), "was declined."),
    });
  }

  function start(target: RequestTarget, action: RequestAction) {
    if (action === "acknowledge") void acknowledge(target);
    else setAsking({ target, action });
  }

  const dialog: ReactNode = asking ? (
    <ActionSheet
      key={`${asking.action}-${asking.target.id}`}
      target={asking.target}
      action={asking.action as "assign" | "fulfil" | "decline"}
      onCancel={() => setAsking(null)}
      onSubmit={(v) => {
        const a = asking;
        setAsking(null);
        if (a.action === "assign") void assign(a.target, v);
        else if (a.action === "fulfil") void fulfil(a.target, v);
        else void decline(a.target, v);
      }}
    />
  ) : null;

  return { start, assign, dialog, busy };
}

function ActionSheet({ target, action, onCancel, onSubmit }: { target: RequestTarget; action: "assign" | "fulfil" | "decline"; onCancel: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(action === "assign" ? (target.assignedId ?? "") : "");
  if (action === "assign") {
    return (
      <Sheet title={`Assign ${target.label}`} description="Choose the HR user who owns this request." onCancel={onCancel} onSubmit={() => onSubmit(value)} confirmLabel="Assign" ready={!!value && value !== target.assignedId}>
        <SelectField label="HR user">
          {(id) => <SelectMenu id={id} value={value} placeholder="Choose an HR user" options={target.hrOptions.map((p) => ({ value: p.id, label: p.isMe ? `${p.name} (you)` : p.name }))} onChange={setValue} />}
        </SelectField>
      </Sheet>
    );
  }
  if (action === "fulfil") {
    return (
      <Sheet title={`Mark ${target.label} as fulfilled`} description="Add a short note about who was placed, if useful." onCancel={onCancel} onSubmit={() => onSubmit(value.trim())} confirmLabel="Continue" ready>
        <TextField label="Note" value={value} onChange={setValue} rows={3} hint="Recorded in the activity with your name and the time." />
      </Sheet>
    );
  }
  return (
    <Sheet title={`Decline ${target.label}`} description="Say why Beeliv cannot take this request on." onCancel={onCancel} onSubmit={() => onSubmit(value.trim())} confirmLabel="Continue" ready={value.trim().length > 0} danger>
      <TextField label="Reason for declining" required value={value} onChange={setValue} hint="Required. Recorded in the activity with your name and the time." />
    </Sheet>
  );
}

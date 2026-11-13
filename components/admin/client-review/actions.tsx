"use client";

/**
 * Client Review actions shared by the list row menu and the detail header:
 * Submit to client, Withdraw submission, Record client feedback received
 * outside the app, Return to shortlist. Each collects what it needs in a
 * sheet, then asks a final yes/no with the shared confirmAction. The adapter
 * appends the history entry. Nothing here approves or selects a candidate.
 */
import { useState, type ReactNode } from "react";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { recordClientFeedback, returnToShortlist, submitToClient, withdrawSubmission } from "@/lib/admin/client-review/hooks";
import { DECISION_LABEL, type ClientContact, type ClientDecision, type ClientReviewDetail } from "@/lib/admin/client-review/types";
import { SelectField, Sheet, TextField } from "./parts";

export type ReviewAction = "submit" | "withdraw" | "record" | "return";
export interface ReviewTarget {
  id: string;
  name: string;
  /** Contacts for the Submit sheet (the list loads them lazily from the detail). */
  contacts: ClientContact[];
}

export const ACTION_LABEL: Record<ReviewAction, string> = {
  submit: "Submit to client",
  withdraw: "Withdraw submission",
  record: "Record client feedback",
  return: "Return to shortlist",
};

const DISCLAIMER = "The client's answer informs Beeliv. Final approval belongs to Operations, never to HR or the client.";

type Fields = { contactId: string; note: string; reason: string; decision: ClientDecision | ""; comment: string };
const EMPTY: Fields = { contactId: "", note: "", reason: "", decision: "", comment: "" };
const FEEDBACK_CHOICES: Exclude<ClientDecision, "awaiting">[] = ["interested", "interview-requested", "not-suitable"];

export function useReviewActions(handlers: { onDone: (d: ClientReviewDetail, message: string) => void; onError: (message: string) => void }) {
  const [asking, setAsking] = useState<{ target: ReviewTarget; action: ReviewAction } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(target: ReviewTarget, action: ReviewAction, f: Fields) {
    const go = async (fn: () => Promise<ClientReviewDetail>, done: string) => {
      setBusy(true);
      try {
        handlers.onDone(await fn(), `${target.name} ${done}`);
      } catch {
        handlers.onError(`We could not update ${target.name}. Nothing was changed. Please try again.`);
      } finally {
        setBusy(false);
      }
    };
    if (action === "submit") {
      const contact = target.contacts.find((c) => c.id === f.contactId);
      await confirmAction({
        tone: "neutral",
        title: `Submit ${target.name} to the client?`,
        description: `The client will see the profile pack in their Recruitment page${contact ? `, sent to ${contact.name}` : ""}.`,
        points: ["Only Beeliv-approved fields and document names are shown.", "NIN, banking and contact details are never shared.", "This does not approve or hire the candidate."],
        confirmLabel: "Submit to client",
        onConfirm: () => go(() => submitToClient(target.id, { contactId: f.contactId, note: f.note.trim() }), "was submitted to the client."),
      });
    } else if (action === "withdraw") {
      await confirmAction({
        tone: "danger",
        title: `Withdraw ${target.name} from the client?`,
        description: "The candidate disappears from the client's list.",
        points: ["The submission and its history are kept.", "Your reason is added to the history."],
        confirmLabel: "Withdraw submission",
        onConfirm: () => go(() => withdrawSubmission(target.id, { reason: f.reason.trim() }), "was withdrawn from the client."),
      });
    } else if (action === "record" && f.decision) {
      const decision = f.decision;
      await confirmAction({
        tone: "caution",
        title: `Record "${DECISION_LABEL[decision]}" for ${target.name}?`,
        description: DISCLAIMER,
        points: ["The entry is marked as recorded by HR, not sent by the client.", "Your reason is added to the history."],
        confirmLabel: "Record feedback",
        onConfirm: () => go(() => recordClientFeedback(target.id, { decision: decision as Exclude<typeof decision, "awaiting">, reason: f.reason.trim(), comment: f.comment.trim() }), "feedback was recorded."),
      });
    } else if (action === "return") {
      await confirmAction({
        tone: "caution",
        title: `Return ${target.name} to the shortlist?`,
        description: "The submission is closed and the candidate goes back to Shortlisting.",
        points: ["If the client could already see them, they are removed from the client's list.", "Your reason is added to the history."],
        confirmLabel: "Return to shortlist",
        onConfirm: () => go(() => returnToShortlist(target.id, { reason: f.reason.trim() }), "was returned to the shortlist."),
      });
    }
  }

  function start(target: ReviewTarget, action: ReviewAction) {
    setAsking({ target, action });
  }

  const dialog: ReactNode = asking ? (
    <ActionSheet
      key={`${asking.action}-${asking.target.id}`}
      target={asking.target}
      action={asking.action}
      onCancel={() => setAsking(null)}
      onSubmit={(f) => {
        const a = asking;
        setAsking(null);
        void run(a.target, a.action, f);
      }}
    />
  ) : null;

  return { start, dialog, busy };
}

function ActionSheet({ target, action, onCancel, onSubmit }: { target: ReviewTarget; action: ReviewAction; onCancel: () => void; onSubmit: (f: Fields) => void }) {
  const [f, setF] = useState<Fields>({ ...EMPTY, contactId: target.contacts.length === 1 ? target.contacts[0].id : "" });
  const set = (p: Partial<Fields>) => setF((x) => ({ ...x, ...p }));
  const reasonOk = f.reason.trim().length > 0;

  if (action === "submit") {
    return (
      <Sheet title={`Submit ${target.name} to the client`} description="Choose who at the client receives it. The client then sees the profile pack and can answer from their Recruitment page." onCancel={onCancel} onSubmit={() => onSubmit(f)} confirmLabel="Continue" ready={!!f.contactId}>
        <SelectField label="Client contact">
          {(id) => <SelectMenu id={id} value={f.contactId} placeholder="Choose a contact" options={target.contacts.map((c) => ({ value: c.id, label: `${c.name}, ${c.role}` }))} onChange={(v) => set({ contactId: v })} />}
        </SelectField>
        <TextField label="Note for the client" value={f.note} onChange={(v) => set({ note: v })} hint="Shown with the profile pack. Do not include private HR notes." rows={3} />
      </Sheet>
    );
  }
  if (action === "record") {
    return (
      <Sheet title={`Record client feedback for ${target.name}`} description={`Use this when the client answered outside the app, for example by phone. ${DISCLAIMER}`} onCancel={onCancel} onSubmit={() => onSubmit(f)} confirmLabel="Continue" ready={!!f.decision && reasonOk}>
        <SelectField label="Client's answer">
          {(id) => <SelectMenu id={id} value={f.decision} placeholder="Choose an answer" options={FEEDBACK_CHOICES.map((d) => ({ value: d, label: DECISION_LABEL[d] }))} onChange={(v) => set({ decision: v as ClientDecision })} />}
        </SelectField>
        <TextField label="Why is HR recording this?" required value={f.reason} onChange={(v) => set({ reason: v })} hint="Required. For example: client phoned the HR desk on Tuesday. Recorded in the history with your name and the time." rows={3} />
        <TextField label="Client's comment" value={f.comment} onChange={(v) => set({ comment: v })} rows={3} />
      </Sheet>
    );
  }
  const copy =
    action === "withdraw"
      ? { title: `Withdraw ${target.name}`, description: "The candidate is removed from the client's list. The record and history are kept.", label: "Reason for withdrawing", danger: true }
      : { title: `Return ${target.name} to the shortlist`, description: "The submission is closed and the candidate goes back to Shortlisting.", label: "Reason for returning", danger: false };
  return (
    <Sheet title={copy.title} description={copy.description} onCancel={onCancel} onSubmit={() => onSubmit(f)} confirmLabel="Continue" ready={reasonOk} danger={copy.danger}>
      <TextField label={copy.label} required value={f.reason} onChange={(v) => set({ reason: v })} hint="Required. Recorded in the history with your name and the time." />
    </Sheet>
  );
}

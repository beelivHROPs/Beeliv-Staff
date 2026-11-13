"use client";

/**
 * "Assign HR" sheet (bottom sheet on phones, side sheet from 768px). One idea:
 * pick the HR officer (name and what they carry now), add an optional note, save.
 * Reassigning asks for one explicit confirmation first. The success message is
 * NOT shown here: the sheet only reports `onDone` after the adapter confirms,
 * and the screen behind it says what happened. Conflict ("someone else just
 * changed this") never overwrites: it shows who holds the client now and lets
 * the person look again. Errors keep the choice and note.
 */
import { useId, useState } from "react";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { Check } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { assignHr, ConflictError, useAssignment } from "@/lib/admin/ops/assignments-hooks";
import { NOTE_MAX, type AssignmentDetail, type ClientChoice } from "@/lib/admin/ops/assignments-types";
import { plural } from "@/lib/client/format";
import { GROUP, MAIN_BTN, MUTED_NOTE, QUIET_BTN, ROW_LINE, Sheet } from "./kit";

export interface AssignDone {
  detail: AssignmentDetail;
  /** The client had an HR before. */
  reassigned: boolean;
  previousHr: string | null;
}

export function AssignSheet({ clientId: fixedId, choices, onClose, onDone }: { clientId?: string; choices?: ClientChoice[]; onClose: () => void; onDone: (r: AssignDone) => void }) {
  const uid = useId();
  const [clientId, setClientId] = useState(fixedId ?? choices?.[0]?.id ?? "");
  const live = useAssignment(clientId);
  const d = live.data;
  const [hrId, setHrId] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const current = d?.hr ?? null;
  const chosen = d?.hrOptions.find((o) => o.hr.id === hrId) ?? null;
  const isReassign = !!current && !!chosen && chosen.hr.id !== current.id;
  const canSave = !!chosen && chosen.hr.id !== current?.id && !busy;

  const resetFor = (id: string) => {
    setClientId(id);
    setHrId("");
    setNote("");
    setStep("pick");
    setError(null);
    setConflict(false);
  };

  async function save() {
    if (!d || !chosen) return;
    setBusy(true);
    setError(null);
    try {
      const next = await assignHr(d.id, { hrId: chosen.hr.id, note, expectedRevision: d.revision });
      onDone({ detail: next, reassigned: !!current, previousHr: current?.name ?? null });
    } catch (e) {
      setBusy(false);
      if (e instanceof ConflictError) {
        setConflict(true);
        setStep("pick");
        setHrId("");
      } else {
        setError("We could not save this. Nothing was changed. Check your connection and try again.");
        setStep("pick");
      }
    }
  }

  let footer;
  if (conflict) {
    footer = (
      <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
        <button type="button" onClick={onClose} className={QUIET_BTN}>
          Close
        </button>
        <button type="button" onClick={() => setConflict(false)} className={MAIN_BTN}>
          Look again
        </button>
      </div>
    );
  } else if (step === "confirm" && d && chosen) {
    footer = (
      <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
        <button type="button" disabled={busy} onClick={() => setStep("pick")} className={QUIET_BTN}>
          Back
        </button>
        <button type="button" disabled={busy} onClick={save} className={MAIN_BTN}>
          {busy ? "Saving..." : "Confirm reassign"}
        </button>
      </div>
    );
  } else {
    footer = (
      <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
        <button type="button" onClick={onClose} className={QUIET_BTN}>
          Cancel
        </button>
        <button type="button" disabled={!canSave} onClick={() => (isReassign ? setStep("confirm") : save())} className={MAIN_BTN}>
          {busy ? "Saving..." : isReassign ? "Reassign" : "Assign HR"}
        </button>
      </div>
    );
  }

  return (
    <Sheet title={current ? "Reassign HR" : "Assign HR"} subtitle={d && !choices ? d.name : undefined} onClose={onClose} busy={busy} footer={footer}>
      {choices && choices.length > 0 && !fixedId ? (
        <div className="mb-4">
          <label htmlFor={`${uid}-c`} className="mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
            Client
          </label>
          <SelectMenu id={`${uid}-c`} value={clientId} onChange={resetFor} options={choices.map((c) => ({ value: c.id, label: `${c.name}${c.hr ? "" : " (no HR)"}` }))} />
        </div>
      ) : null}

      {live.status === "error" || live.status === "restricted" ? (
        <p role="alert" className="py-4 text-[14px] text-(--ap-rose)">
          We could not load the HR officers.{" "}
          <button type="button" onClick={live.retry} className="font-bold underline">
            Try again
          </button>
        </p>
      ) : !d ? (
        <div role="status" aria-busy="true" aria-label="Loading HR officers" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ap-shimmer h-14 rounded-[12px]" />
          ))}
        </div>
      ) : conflict ? (
        <div role="alert" className="rounded-[14px] border border-(--ap-warn) bg-(--ap-warn-bg) p-4 text-[14px] leading-[1.55] text-(--ap-ink)">
          <b className="block text-[15px]">Someone else just changed this.</b>
          {d.hr ? `${d.name} is now with ${d.hr.name}.` : `${d.name} has no HR officer now.`} Your choice was not saved, so nothing was overwritten. Look at the latest and choose again if it is still needed.
        </div>
      ) : step === "confirm" && chosen && current ? (
        <div className="py-2 text-[14px] leading-[1.6] text-(--ap-ink-2)">
          <p className="text-[16px] font-semibold text-(--ap-ink)">
            Move {d.name} from {current.name} to {chosen.hr.name}?
          </p>
          <p className="mt-2">
            {current.name} will no longer be the HR officer for this client. {chosen.hr.name} will see this client, its staff and its requests. The change is saved in the client&apos;s history with your name.
          </p>
          {note.trim() ? <p className="mt-3 text-(--ap-muted)">Your note: {note.trim()}</p> : null}
        </div>
      ) : (
        <>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-[13px] font-semibold text-(--ap-ink-2)">Choose an HR officer</legend>
            <div role="radiogroup" aria-label="HR officers" className={GROUP}>
              {d.hrOptions.map((o) => {
                const on = o.hr.id === hrId;
                const isCurrent = o.hr.id === current?.id;
                return (
                  <button
                    key={o.hr.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={isCurrent}
                    onClick={() => setHrId(o.hr.id)}
                    className={`flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2 text-left transition-colors ${ROW_LINE} ${on ? "bg-(--ap-tint)" : "hover:bg-(--ap-tint-soft)"} disabled:cursor-default disabled:opacity-70`}
                  >
                    <AdminAvatar name={o.hr.name} photoUrl={o.hr.photoUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-(--ap-ink)">
                        {o.hr.name}
                        {isCurrent ? <span className="ml-2 text-[12px] font-medium text-(--ap-muted)">Current</span> : null}
                      </span>
                      <span className="block text-[12.5px] text-(--ap-muted)">
                        {plural(o.clients, "client")} · {o.openVacancies} open · {o.pendingItems} waiting
                      </span>
                    </span>
                    <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line)"}`}>
                      {on ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className={`mt-2 ${MUTED_NOTE}`}>Load is shown so you can balance the team. How much work counts as too much needs Beeliv confirmation.</p>

          <label htmlFor={`${uid}-n`} className="mt-4 mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
            Note <span className="font-normal text-(--ap-muted)">(optional)</span>
          </label>
          <textarea id={`${uid}-n`} className="ap-input" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this officer, or anything they should know" />
          <p className={`mt-1 text-right ${MUTED_NOTE}`}>
            {note.length}/{NOTE_MAX}
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-[14px] font-semibold text-(--ap-rose)">
              {error}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

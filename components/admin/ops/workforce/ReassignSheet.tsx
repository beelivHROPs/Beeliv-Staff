"use client";

/**
 * "Reassign" sheet (bottom sheet on phones, side sheet from 768px). One idea per
 * step. Step 1: pick the staff member (when opened from the main button), see
 * where they work now and where they worked before, then choose the new Client,
 * Outlet, Role and effective date (the app's own DatePicker) and an optional
 * note. Step 2: an explicit confirm. "Saved" is NOT shown here: the sheet only
 * reports `onDone` after the adapter confirms, and the screen behind it says
 * what happened. The same person stays; the earlier placement is kept as history.
 * Conflict ("Someone else just changed this") never overwrites. An error keeps
 * every input.
 */
import { useId, useState } from "react";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { GROUP, MAIN_BTN, MUTED_NOTE, QUIET_BTN, ROW_LINE, Sheet } from "@/components/admin/ops/assign/kit";
import { ConflictError, reassignStaff, useOpsStaffMember } from "@/lib/admin/ops/staffassign-hooks";
import { NOTE_MAX, type OpsStaffDetail, type StaffChoice, type StaffPlacement } from "@/lib/admin/ops/staffassign-types";
import { formatDate } from "@/lib/applicant/time";
import { todayISO } from "@/lib/client/format";
import { RULES_NOTE, rangeText } from "./parts";

export interface ReassignDone {
  detail: OpsStaffDetail;
  previous: StaffPlacement | null;
}

const place = (p: { client: string; outlet: string }) => `${p.client}, ${p.outlet}`;
const LABEL = "mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)";

export function ReassignSheet({ staffId: fixedId, choices, onClose, onDone }: { staffId?: string; choices?: StaffChoice[]; onClose: () => void; onDone: (r: ReassignDone) => void }) {
  const uid = useId();
  const [staffId, setStaffId] = useState(fixedId ?? choices?.[0]?.id ?? "");
  const live = useOpsStaffMember(staffId);
  const d = live.data;
  const [clientId, setClientId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const current = d?.current ?? null;
  const client = d?.options.clients.find((c) => c.id === clientId) ?? null;
  const outlet = client?.outlets.find((o) => o.id === outletId) ?? null;
  const minDate = current ? current.start.slice(0, 10) : undefined;
  const sameAsNow = !!current && current.outletId === outletId && current.role === role;
  const dateOk = !!date && (!minDate || date >= minDate);
  const ready = !!client && !!outlet && !!role && dateOk && !sameAsNow;

  const resetFor = (id: string) => {
    setStaffId(id);
    setClientId("");
    setOutletId("");
    setRole("");
    setDate(todayISO());
    setNote("");
    setStep("pick");
    setError(null);
    setConflict(false);
  };

  async function save() {
    if (!d || !client || !outlet) return;
    setBusy(true);
    setError(null);
    try {
      const next = await reassignStaff(d.id, { clientId, outletId, role, effectiveDate: date, note, expectedRevision: d.revision });
      onDone({ detail: next, previous: current });
    } catch (e) {
      setBusy(false);
      if (e instanceof ConflictError) {
        setConflict(true);
        setStep("pick");
      } else {
        setError("We could not save this. Nothing was changed. Check your connection and try again.");
        setStep("pick");
      }
    }
  }

  const actions = (cancel: { label: string; onClick: () => void }, main: { label: string; onClick: () => void; disabled?: boolean }) => (
    <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
      <button type="button" disabled={busy && cancel.label === "Back"} onClick={cancel.onClick} className={QUIET_BTN}>
        {cancel.label}
      </button>
      <button type="button" disabled={main.disabled || busy} onClick={main.onClick} className={MAIN_BTN}>
        {main.label}
      </button>
    </div>
  );

  let footer;
  if (conflict) footer = actions({ label: "Close", onClick: onClose }, { label: "Look again", onClick: () => setConflict(false) });
  else if (step === "confirm") footer = actions({ label: "Back", onClick: () => setStep("pick") }, { label: busy ? "Saving..." : "Confirm reassign", onClick: save });
  else footer = actions({ label: "Cancel", onClick: onClose }, { label: "Review", onClick: () => setStep("confirm"), disabled: !ready });

  const unplaced = !!d && !d.current;
  return (
    <Sheet title={unplaced ? "Assign to a client" : "Reassign"} subtitle={d && fixedId ? d.name : undefined} onClose={onClose} busy={busy} footer={footer} low>
      {choices && choices.length > 0 && !fixedId ? (
        <div className="mb-4">
          <label htmlFor={`${uid}-s`} className={LABEL}>
            Staff member
          </label>
          <SelectMenu id={`${uid}-s`} value={staffId} onChange={resetFor} options={choices.map((c) => ({ value: c.id, label: `${c.name}${c.placed ? "" : " (unassigned)"}` }))} />
        </div>
      ) : null}

      {live.status === "error" || live.status === "restricted" ? (
        <p role="alert" className="py-4 text-[14px] text-(--ap-rose)">
          We could not load this person.{" "}
          <button type="button" onClick={live.retry} className="font-bold underline">
            Try again
          </button>
        </p>
      ) : !d ? (
        <div role="status" aria-busy="true" aria-label="Loading staff member" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ap-shimmer h-14 rounded-[12px]" />
          ))}
        </div>
      ) : conflict ? (
        <div role="alert" className="rounded-[14px] border border-(--ap-warn) bg-(--ap-warn-bg) p-4 text-[14px] leading-[1.55] text-(--ap-ink)">
          <b className="block text-[15px]">Someone else just changed this.</b>
          {d.current ? `${d.name} is now at ${place(d.current)} as ${d.current.role} (${rangeText(d.current).toLowerCase()}).` : `${d.name} has no placement now.`} Your change was not saved, so nothing was overwritten. Look at the latest and choose again if it is still needed.
        </div>
      ) : step === "confirm" && client && outlet ? (
        <div className="py-2 text-[14px] leading-[1.6] text-(--ap-ink-2)">
          <p className="text-[16px] font-semibold text-(--ap-ink)">
            {current ? `Move ${d.name} to ${place({ client: client.name, outlet: outlet.name })}?` : `Place ${d.name} at ${place({ client: client.name, outlet: outlet.name })}?`}
          </p>
          <dl className={`${GROUP} mt-3 mb-0`}>
            {current ? <Row k="From" v={`${place(current)}, ${current.role}`} /> : null}
            <Row k="To" v={`${place({ client: client.name, outlet: outlet.name })}, ${role}`} />
            <Row k="Effective" v={formatDate(`${date}T09:00:00`)} />
          </dl>
          <p className="mt-3">{current ? "The earlier placement stays in their history. Nothing is deleted. " : ""}It is saved with your name and the date.</p>
          {note.trim() ? <p className="mt-2 text-(--ap-muted)">Your note: {note.trim()}</p> : null}
          <p className={`mt-3 ${MUTED_NOTE}`}>{RULES_NOTE}</p>
        </div>
      ) : (
        <>
          <p className="mb-1.5 text-[12px] font-semibold tracking-[.08em] text-(--ap-muted) uppercase">Now</p>
          <div className={`${GROUP} mb-4`}>
            <div className="px-4 py-3">
              {d.current ? (
                <>
                  <p className="text-[15px] leading-tight font-semibold text-(--ap-ink)">{place(d.current)}</p>
                  <p className={`mt-0.5 ${MUTED_NOTE}`}>
                    {d.current.role} · {rangeText(d.current).toLowerCase()}
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-(--ap-ink-2)">Not placed yet. Approved and waiting for a client.</p>
              )}
            </div>
            {d.history.slice(0, 2).map((h) => (
              <div key={h.id} className={`px-4 py-2.5 ${ROW_LINE}`}>
                <p className="text-[13.5px] leading-snug text-(--ap-ink-2)">
                  Before: {place(h)}, {h.role}
                </p>
                <p className={MUTED_NOTE}>{rangeText(h)}</p>
              </div>
            ))}
            {d.history.length > 2 ? <p className={`px-4 py-2.5 ${ROW_LINE} ${MUTED_NOTE}`}>{d.history.length - 2} more in their history.</p> : null}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor={`${uid}-c`} className={LABEL}>
                New client
              </label>
              <SelectMenu
                id={`${uid}-c`}
                value={clientId}
                placeholder="Choose a client"
                onChange={(v) => {
                  setClientId(v);
                  setOutletId("");
                }}
                options={d.options.clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-o`} className={LABEL}>
                Outlet
              </label>
              <SelectMenu id={`${uid}-o`} value={outletId} placeholder={client ? "Choose an outlet" : "Choose a client first"} onChange={setOutletId} options={(client?.outlets ?? []).map((o) => ({ value: o.id, label: o.name }))} />
            </div>
            <div>
              <label htmlFor={`${uid}-r`} className={LABEL}>
                Role
              </label>
              <SelectMenu id={`${uid}-r`} value={role} placeholder="Choose a role" onChange={setRole} options={d.options.roles} />
              {sameAsNow ? (
                <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
                  That is where they are now. Choose a different outlet or role.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${uid}-d`} className={LABEL}>
                Effective date
              </label>
              <DatePicker id={`${uid}-d`} value={date} onChange={setDate} min={minDate} title="Effective date" placeholder="Choose a date" invalid={!dateOk} describedBy={`${uid}-dn`} />
              <p id={`${uid}-dn`} className={`mt-1.5 ${MUTED_NOTE}`}>
                {dateOk ? RULES_NOTE : minDate ? `Choose ${formatDate(`${minDate}T09:00:00`)} or later: that is when the current placement started.` : "Choose a date."}
              </p>
            </div>
            <div>
              <label htmlFor={`${uid}-n`} className={LABEL}>
                Note <span className="font-normal text-(--ap-muted)">(optional)</span>
              </label>
              <textarea id={`${uid}-n`} className="ap-input" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why, or anything the next manager should know" />
              <p className={`mt-1 text-right ${MUTED_NOTE}`}>
                {note.length}/{NOTE_MAX}
              </p>
            </div>
          </div>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 px-4 py-2.5 ${ROW_LINE}`}>
      <dt className="text-[13px] text-(--ap-muted)">{k}</dt>
      <dd className="m-0 text-right text-[14px] text-(--ap-ink)">{v}</dd>
    </div>
  );
}


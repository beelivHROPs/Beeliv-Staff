"use client";

/**
 * Assign / Reassign sheet. Writes ONE StaffAssignment (the adapter ends the
 * previous record and starts the new one; nothing is copied). A reason is
 * required (spec section 7: history keeps the reason for ending / reassignment).
 * Phones: bottom sheet. Tablet and up: centred card. Esc / backdrop / Cancel close.
 * Reassignment mechanics after resignation / termination need Beeliv confirmation.
 */
import { useEffect, useId, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import type { AssignInput, AssignmentRow, StaffFacets } from "@/lib/admin/staff/types";
import { NeedsConfirmation } from "./parts";

const label = "mt-4 block text-[13px] font-bold text-(--ap-ink-2)";

export function AssignSheet({
  people,
  facets,
  initialStaffId,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  people: AssignmentRow[];
  facets: StaffFacets;
  initialStaffId: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: AssignInput) => void;
}) {
  const isClient = useIsClient();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(busy ? undefined : onCancel);
  const dateId = useId();
  const reasonId = useId();
  const initial = people.find((p) => p.staffId === initialStaffId);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [clientId, setClientId] = useState(initial?.current?.clientId ?? "");
  const [outletId, setOutletId] = useState(initial?.current?.outletId ?? "");
  const [role, setRole] = useState(initial?.current?.role ?? "");
  const [department, setDepartment] = useState(initial?.current?.department ?? "");
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const person = people.find((p) => p.staffId === staffId);
  const reassigning = !!person?.current;
  const ready = !!(staffId && clientId && outletId && role && department && start && reason.trim()) && !busy;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!isClient) return null;
  return createPortal(
    <div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] min-[768px]:w-[540px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {reassigning ? "Reassign staff member" : "Assign staff member"}
        </h2>
        <p className="mt-2 text-[14px] leading-[1.55] text-(--ap-muted)">The current assignment ends and a new one starts on the date you choose. History keeps both, with your reason.</p>

        <span className={label}>Staff member</span>
        <SelectMenu label="Staff member" value={staffId} placeholder="Choose a person" onChange={setStaffId} options={people.map((p) => ({ value: p.staffId, label: `${p.name}${p.current ? "" : " (awaiting assignment)"}` }))} className="mt-1.5" />
        <span className={label}>Client</span>
        <SelectMenu
          label="Client"
          value={clientId}
          placeholder="Choose a client"
          onChange={(v) => {
            setClientId(v);
            setOutletId("");
          }}
          options={facets.clients.map((c) => ({ value: c.id, label: c.name }))}
          className="mt-1.5"
        />
        <span className={label}>Outlet</span>
        <SelectMenu label="Outlet" value={outletId} placeholder={clientId ? "Choose an outlet" : "Choose a client first"} onChange={setOutletId} options={facets.outlets.filter((o) => o.clientId === clientId).map((o) => ({ value: o.id, label: o.name }))} className="mt-1.5" />
        <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
          <div>
            <span className={label}>Role</span>
            <SelectMenu label="Role" value={role} placeholder="Choose a role" onChange={setRole} options={facets.roles.map((r) => ({ value: r, label: r }))} className="mt-1.5" />
          </div>
          <div>
            <span className={label}>Department</span>
            <SelectMenu label="Department" value={department} placeholder="Choose a department" onChange={setDepartment} options={facets.departments.map((d) => ({ value: d, label: d }))} className="mt-1.5" />
          </div>
        </div>
        <label htmlFor={dateId} className={label}>
          Start date
        </label>
        <div className="mt-1.5"><DatePicker id={dateId} title="Start date" value={start} onChange={setStart} placeholder="Choose a date" /></div>
        <label htmlFor={reasonId} className={label}>
          Reason (required)
        </label>
        <textarea id={reasonId} className="ap-input mt-1.5" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-3">
          <NeedsConfirmation>Reassignment after resignation or termination needs Beeliv confirmation.</NeedsConfirmation>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-[14px] font-semibold text-[#C8102E]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" disabled={busy} onClick={onCancel} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button type="button" disabled={!ready} onClick={() => onSubmit({ staffId, clientId, outletId, role, department, start, reason: reason.trim() })} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
            {busy ? "Working..." : reassigning ? "Reassign" : "Assign"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

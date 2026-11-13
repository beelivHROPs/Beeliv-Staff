"use client";

import { useRef, useState } from "react";
import { Plus } from "@/components/applicant/icons";
import { Field } from "@/components/applicant/apply/parts";
import { DatePicker } from "@/components/applicant/form-fields";
import { invalidAttrs, useFlagInvalid } from "@/components/applicant/form-feedback";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { toast } from "@/components/ui/toast";
import { useWorkforceRequestReasons } from "@/lib/client/hooks";
import { todayISO } from "@/lib/client/format";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER } from "@/lib/client/labels";
import { useOutletScope, useOutletState } from "@/lib/client/outlet";
import * as service from "@/lib/client/service";
import type { DepartmentId, WorkforceRequest } from "@/lib/client/types";

const MAX_COUNT = 50;

type Errors = { outlet?: string; role?: string; department?: string; count?: string; date?: string; reason?: string };

/**
 * "Request staff" (brief section 16). Collects what the Client needs and sends
 * it to Beeliv HR for review. It creates a Workforce Request - it never
 * publishes a vacancy, and Beeliv decides what happens next. Reason options
 * come from the backend fixture and are TBD (taxonomy not approved by Beeliv).
 */
export function RequestForm({ onDone, onCancel }: { onDone: (r: WorkforceRequest) => void; onCancel: () => void }) {
  const scope = useOutletScope();
  const { outlets } = useOutletState();
  const reasons = useWorkforceRequestReasons();

  const [outletId, setOutletId] = useState(() => (scope && scope !== "all" ? scope : outlets.length === 1 ? outlets[0].id : ""));
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState<DepartmentId | "">("");
  const [count, setCount] = useState("1");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  const n = Number(count);
  const setN = (v: number) => {
    setCount(String(Math.min(MAX_COUNT, Math.max(1, v))));
    clear("count");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!outletId) next.outlet = "Choose the outlet that needs staff.";
    if (!role.trim()) next.role = "Enter the role you need.";
    if (!department) next.department = "Choose a department.";
    if (!Number.isInteger(n) || n < 1) next.count = "Enter how many people you need (at least 1).";
    if (!date) next.date = "Choose the date you would like them to start.";
    else if (date < todayISO()) next.date = "The start date can't be in the past.";
    if (!reason) next.reason = "Choose a reason.";
    setErrors(next);
    if (Object.keys(next).length > 0 || scope === null || !department) {
      flag();
      return;
    }
    setBusy(true);
    try {
      const created = await service.createWorkforceRequest(scope, { outletId, role: role.trim(), departmentId: department, count: n, resumptionDate: date, reason, notes: notes.trim() });
      toast.add({ title: "Request sent to Beeliv", description: `${created.publicId} - Beeliv HR will review it.`, type: "success" });
      onDone(created);
    } catch {
      toast.add({ title: "We couldn't send your request", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const outletOptions = outlets.map((o) => ({ value: o.id, label: o.name }));
  const deptOptions = DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }));

  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-labelledby="ap-request-staff" className="flex flex-col gap-4">
      <p className="text-[14px] text-(--ap-muted)">Tell Beeliv what you need. Beeliv HR reviews every request and takes care of the recruitment - this does not publish a vacancy.</p>
      <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
        <Field label="Outlet" htmlFor="rq-outlet" error={errors.outlet}>
          <SelectMenu id="rq-outlet" invalid={!!errors.outlet} describedBy={errors.outlet ? "rq-outlet-err" : undefined} value={outletId} options={outletOptions} onChange={(v) => { setOutletId(v); clear("outlet"); }} placeholder="Select an outlet" />
        </Field>
        <Field label="Role" htmlFor="rq-role" error={errors.role}>
          <input id="rq-role" className="ap-input" aria-invalid={errors.role ? true : undefined} aria-describedby={errors.role ? "rq-role-err" : undefined} value={role} maxLength={80} placeholder="For example: Waiter" onChange={(e) => { setRole(e.target.value); clear("role"); }} />
        </Field>
        <Field label="Department" htmlFor="rq-dept" error={errors.department}>
          <SelectMenu id="rq-dept" invalid={!!errors.department} describedBy={errors.department ? "rq-dept-err" : undefined} value={department} options={deptOptions} onChange={(v) => { setDepartment(v as DepartmentId); clear("department"); }} placeholder="Select a department" />
        </Field>
        <Field label="Number required" htmlFor="rq-count" error={errors.count}>
          <div role="group" aria-label="Number required" {...invalidAttrs(!!errors.count)} className="flex items-center gap-2">
            <button type="button" aria-label="One fewer" disabled={n <= 1} onClick={() => setN((Number.isFinite(n) ? n : 1) - 1)} className="ap-btn ap-btn-s size-12 shrink-0 p-0">
              <span className="block h-0.5 w-3.5 rounded bg-current" aria-hidden="true" />
            </button>
            <input
              id="rq-count"
              inputMode="numeric"
              autoComplete="off"
              className="ap-input min-w-0 text-center font-bold tabular-nums"
              value={count}
              aria-invalid={errors.count ? true : undefined}
              aria-describedby={errors.count ? "rq-count-err" : undefined}
              onChange={(e) => {
                setCount(e.target.value.replace(/\D/g, "").slice(0, 2));
                clear("count");
              }}
            />
            <button type="button" aria-label="One more" disabled={n >= MAX_COUNT} onClick={() => setN((Number.isFinite(n) ? n : 0) + 1)} className="ap-btn ap-btn-s size-12 shrink-0 p-0">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </Field>
        <Field label="Desired resumption date" htmlFor="rq-date" error={errors.date}>
          <DatePicker id="rq-date" title="Desired resumption date" invalid={!!errors.date} describedBy={errors.date ? "rq-date-err" : undefined} value={date} min={todayISO()} onChange={(v) => { setDate(v); clear("date"); }} placeholder="Choose a date" />
        </Field>
        <Field label="Reason" htmlFor="rq-reason" error={errors.reason}>
          <SelectMenu id="rq-reason" invalid={!!errors.reason} describedBy={errors.reason ? "rq-reason-err" : undefined} value={reason} options={reasons.data ?? []} onChange={(v) => { setReason(v); clear("reason"); }} placeholder={reasons.status === "loading" ? "Loading..." : "Select a reason"} />
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="rq-notes">
        <textarea id="rq-notes" rows={3} maxLength={500} className="ap-input" placeholder="Anything Beeliv should know, such as shift pattern or skills you value" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="ap-btn ap-btn-s h-12 w-full min-[768px]:w-auto">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="ap-btn ap-btn-p h-12 w-full text-white! min-[768px]:w-auto">
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : null}
          {busy ? "Sending..." : "Send request to Beeliv"}
        </button>
      </div>
    </form>
  );
}

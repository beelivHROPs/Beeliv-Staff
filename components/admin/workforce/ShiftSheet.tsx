"use client";

/**
 * Create / edit one shift. Validation is for helpfulness only (the backend
 * re-validates). The conflict check is ADVISORY: it warns about double-booking
 * and approved-leave overlap but does not block (whether conflicts should
 * block needs Beeliv confirmation). Rest time between shifts is NOT checked:
 * the rule is unknown and needs Beeliv confirmation. Overnight shifts (end
 * before start) are not offered until Beeliv confirms how they work.
 * Reused: SelectMenu, DatePicker, Disc, ConflictList style from Interviews.
 */
import { useEffect, useId, useState } from "react";
import { Disc } from "@/components/admin/overview/Disc";
import { DatePicker } from "@/components/applicant/form-fields";
import { TimePicker } from "@/components/admin/TimePicker";
import { Exclaim } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { addDays } from "@/lib/client/format";
import { checkShiftConflicts, saveShift } from "@/lib/admin/workforce/hooks";
import type { ShiftConflict, ShiftInput, ShiftRow, WeekRoster } from "@/lib/admin/workforce/types";
import { FieldError, LABEL, SHEET_BTN, Sheet, stamp } from "./parts";

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function ShiftSheet({
  roster,
  shift,
  defaultDate,
  onClose,
  onSaved,
  onFailed,
}: {
  roster: WeekRoster;
  /** Null = create. */
  shift: ShiftRow | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (r: WeekRoster, text: string) => void;
  onFailed: (text: string) => void;
}) {
  const uid = useId();
  const [staffId, setStaffId] = useState(shift?.staff.id ?? "");
  const [date, setDate] = useState(shift?.date ?? defaultDate);
  const [role, setRole] = useState(shift?.role ?? "");
  const [section, setSection] = useState(shift?.section ?? "");
  const [start, setStart] = useState(shift?.start ?? "");
  const [end, setEnd] = useState(shift?.end ?? "");
  const [breakMins, setBreak] = useState(String(shift?.breakMins ?? 30));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ key: string; list: ShiftConflict[] } | null>(null);

  const weekEnd = addDays(roster.weekStart, 6);
  const brk = Number(breakMins);
  const errors: Record<string, string> = {};
  if (!staffId) errors.staff = "Choose a staff member.";
  if (!date) errors.date = "Choose a date.";
  else if (date < roster.weekStart || date > weekEnd) errors.date = "The date must fall in the week you are scheduling.";
  if (!role) errors.role = "Choose a role.";
  if (!section) errors.section = "Choose a section.";
  if (!start) errors.start = "Add a start time.";
  if (!end) errors.end = "Add an end time.";
  if (start && end && end <= start) errors.end = "End must be after the start (overnight shifts need Beeliv confirmation).";
  if (breakMins === "" || !Number.isInteger(brk) || brk < 0) errors.break = "Enter the break in whole minutes (0 or more).";
  else if (start && end && end > start && brk >= mins(end) - mins(start)) errors.break = "The break must be shorter than the shift.";
  const invalid = Object.keys(errors).length > 0;
  const show = (k: string) => (tried ? errors[k] : undefined);

  const key = staffId && date && start && end && end > start ? `${staffId}|${date}|${start}|${end}` : null;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    checkShiftConflicts(roster.outletId, shift?.id ?? null, { staffId, date, role, section, start, end, breakMins: 0 }).then(
      (list) => !cancelled && setFound({ key, list }),
      () => !cancelled && setFound({ key, list: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, roster.outletId, shift?.id, staffId, date, role, section, start, end]);
  const conflicts = found && found.key === key ? found.list : [];

  function pickStaff(id: string) {
    setStaffId(id);
    const p = roster.staff.find((s) => s.id === id);
    if (p) {
      setRole((r) => r || p.role);
      setSection((s) => s || p.section);
    }
  }

  async function save() {
    setTried(true);
    if (invalid) return;
    setBusy(true);
    const input: ShiftInput = { staffId, date, role, section, start, end, breakMins: brk };
    try {
      const r = await saveShift(roster.outletId, shift?.id ?? null, input);
      onSaved(r, shift ? "The shift was updated. It stays out of staff view until the week is published." : "The shift was added as a draft. Staff see it once the week is published.");
    } catch {
      onFailed("We could not save the shift. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={shift ? `Edit shift: ${shift.staff.name}` : "Add shift"}
      description={`${roster.outlet}, ${roster.client}. Saved as a draft; staff only see published shifts.`}
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>
            {busy ? "Saving..." : shift ? "Save changes" : "Add shift"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
          <div>
            <span className={LABEL}>Staff member</span>
            <SelectMenu label="Staff member" placeholder="Choose staff" value={staffId} onChange={pickStaff} options={roster.staff.map((s) => ({ value: s.id, label: s.name }))} invalid={!!show("staff")} />
            <FieldError>{show("staff")}</FieldError>
          </div>
          <div>
            <label htmlFor={`${uid}-d`} className={LABEL}>
              Date
            </label>
            <DatePicker id={`${uid}-d`} title="Shift date" value={date} min={roster.weekStart} max={weekEnd} onChange={setDate} invalid={!!show("date")} />
            <FieldError>{show("date")}</FieldError>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
          <div>
            <span className={LABEL}>Role</span>
            <SelectMenu label="Role" placeholder="Choose a role" value={role} onChange={setRole} options={roster.roles} invalid={!!show("role")} />
            <FieldError>{show("role")}</FieldError>
          </div>
          <div>
            <span className={LABEL}>Section</span>
            <SelectMenu label="Section" placeholder="Choose a section" value={section} onChange={setSection} options={roster.sections} invalid={!!show("section")} />
            <FieldError>{show("section")}</FieldError>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-s`} className={LABEL}>
              Start
            </label>
            <TimePicker id={`${uid}-s`} label="Shift start" value={start} onChange={setStart} invalid={!!show("start")} />
            <FieldError>{show("start")}</FieldError>
          </div>
          <div>
            <label htmlFor={`${uid}-e`} className={LABEL}>
              End
            </label>
            <TimePicker id={`${uid}-e`} label="Shift end" value={end} onChange={setEnd} invalid={!!show("end")} />
            <FieldError>{show("end")}</FieldError>
          </div>
          <div>
            <label htmlFor={`${uid}-b`} className={LABEL}>
              Break (minutes)
            </label>
            <input id={`${uid}-b`} type="number" inputMode="numeric" min={0} className="ap-input" value={breakMins} onChange={(e) => setBreak(e.target.value)} aria-invalid={!!show("break")} />
            <FieldError>{show("break")}</FieldError>
          </div>
        </div>

        {conflicts.length > 0 ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-(--ap-line) bg-(--ap-warn-bg) p-3.5">
            <Disc icon={Exclaim} tone="pending" />
            <div className="min-w-0 text-[14px] leading-snug text-(--ap-ink)">
              <b className="block text-[15px]">Possible conflict</b>
              <ul className="m-0 mt-1 list-disc pl-5">
                {conflicts.map((c) => (
                  <li key={`${c.kind}-${c.id}`}>
                    {c.kind === "double-booking" ? "Double-booking: " : "Leave: "}
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-(--ap-muted)">You can still save this shift. Whether conflicts should be blocked needs Beeliv confirmation.</p>
            </div>
          </div>
        ) : null}
        {shift ? <p className="text-[13px] text-(--ap-muted)">Created by {shift.createdBy}. Last edited by {shift.lastEditedBy}, {stamp(shift.lastEditedAt)}.</p> : null}
        <p className="text-[13px] text-(--ap-muted)">Minimum rest time between shifts is not checked: the rule needs Beeliv confirmation.</p>
      </div>
    </Sheet>
  );
}

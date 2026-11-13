"use client";

import { periodToRange, rangeToPeriod } from "@/lib/applicant/documentation";
import { useState } from "react";
import { Plus, X } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "../SelectMenu";
import { confirmAction } from "../ConfirmDialog";
import { SALARY_BANDS, SECTOR_OPTIONS } from "@/lib/applicant/reference-data";
import { saveProfile, useApplicantStore } from "@/lib/applicant/service";
import type { ApplyFormData, EmploymentEntry } from "@/lib/applicant/types";
import { BTN, Field, FormGrid, INPUT_CLS, LINK_CLS, Pick, STROKE, Segmented, SubHead } from "./parts";

type SetForm = <K extends keyof ApplyFormData>(k: K, v: ApplyFormData[K]) => void;

// Wireframe option lists (stepBody() s===1), verbatim.
const YEARS = ["1–2 years", "3–4 years", "5–7 years", "8+ years"];
const AVAILABILITY = ["Immediately", "Available in 2 weeks", "Available in 1 month"];
const LOCATIONS = ["Abuja", "Lagos", "Either"];
const YES_NO = ["Yes", "No"] as const;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(v: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m ? `${MON[Number(m[2]) - 1]} ${m[1]}` : v;
}

type NewRole = { key: number; position: string; employer: string; start: string; end: string; reason: string };

/** `.entry` card shell. */
function Entry({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-(--ap-line-2) py-4 first:pt-0">{children}</div>;
}

/** Select with a placeholder only when nothing is chosen yet (fresh drafts), so seeded values render exactly like the wireframe. */
function Select({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <SelectMenu id={id} value={value} options={options} onChange={onChange} />;
}

function ProfileEntry({ entry, index, history }: { entry: EmploymentEntry; index: number; history: EmploymentEntry[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry);
  // Dates are picked on the calendar; `period` stays the saved text, e.g. "Mar 2019 – Present".
  const [range, setRange] = useState(() => periodToRange(entry.period));
  const changeRange = (r: { start: string; end: string }) => {
    setRange(r);
    setDraft((d) => ({ ...d, period: rangeToPeriod(r) || d.period }));
  };

  if (editing) {
    return (
      <Entry>
        <FormGrid>
          <Field label="Position" htmlFor={`ph-r-${index}`}>
            <input id={`ph-r-${index}`} className={INPUT_CLS} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </Field>
          <Field label="Employer" htmlFor={`ph-c-${index}`}>
            <input id={`ph-c-${index}`} className={INPUT_CLS} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          </Field>
          <Field label="Start date" htmlFor={`ph-s-${index}`}>
            <DatePicker id={`ph-s-${index}`} title="Start date" mode="month" max={range.end || undefined} value={range.start} onChange={(v) => changeRange({ ...range, start: v })} />
          </Field>
          <Field label="End date" htmlFor={`ph-e-${index}`} hint="Leave empty if you still work here">
            <DatePicker id={`ph-e-${index}`} title="End date" mode="month" min={range.start || undefined} placeholder="Present" value={range.end} onChange={(v) => changeRange({ ...range, end: v })} />
          </Field>
          <Field label="Reason for leaving" htmlFor={`ph-rl-${index}`} full hint="Leave empty if you still work here">
            <input
              id={`ph-rl-${index}`}
              className={INPUT_CLS}
              value={draft.reasonForLeaving ?? ""}
              onChange={(e) => setDraft({ ...draft, reasonForLeaving: e.target.value })}
            />
          </Field>
        </FormGrid>
        <div className="mt-3.5 flex justify-end gap-2.5">
          <button type="button" className={`${BTN} ap-btn-sm ap-btn-s`} onClick={() => { setDraft(entry); setRange(periodToRange(entry.period)); setEditing(false); }}>
            Cancel
          </button>
          <button
            type="button"
            className={`${BTN} ap-btn-sm ap-btn-p`}
            disabled={!draft.role.trim() || !draft.company.trim()}
            onClick={async () => {
              const reason = draft.reasonForLeaving?.trim();
              const saved: EmploymentEntry = { role: draft.role.trim(), company: draft.company.trim(), period: draft.period.trim(), ...(reason ? { reasonForLeaving: reason } : {}) };
              await saveProfile({ employmentHistory: history.map((h, i) => (i === index ? saved : h)) });
              setEditing(false);
              toast.add({ title: "Role updated on your profile" });
            }}
          >
            Save role
          </button>
        </div>
      </Entry>
    );
  }

  return (
    <Entry>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <b className="block text-[15px]">{entry.role}</b>
          <span className="ap-sm">
            {entry.company} · {entry.period}
          </span>
          {entry.reasonForLeaving ? <span className="ap-sm block">Reason for leaving: {entry.reasonForLeaving}</span> : null}
        </div>
        <button type="button" className={LINK_CLS} onClick={() => { setDraft(entry); setEditing(true); }} aria-label={`Edit ${entry.role}`}>
          Edit
        </button>
      </div>
      <span className="ap-sm">From your profile</span>
    </Entry>
  );
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

export function StepExperience({ form, set, toggleSector }: { form: ApplyFormData; set: SetForm; toggleSector: (s: string) => void }) {
  const store = useApplicantStore();
  const history = store.profile.employmentHistory;
  const [newRoles, setNewRoles] = useState<NewRole[]>([]);

  function patchRole(key: number, patch: Partial<NewRole>) {
    setNewRoles((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  async function saveRole(r: NewRole) {
    const period = `${monthLabel(r.start) || "Start date not set"} – ${r.end ? monthLabel(r.end) : "Present"}`;
    // "Reason for leaving" (Module 1 §2) is saved on the profile's employment
    // entry (EmploymentEntry.reasonForLeaving) — localStorage mock only.
    const reason = r.reason.trim();
    await saveProfile({
      employmentHistory: [...history, { role: r.position.trim(), company: r.employer.trim(), period, ...(reason ? { reasonForLeaving: reason } : {}) }],
    });
    setNewRoles((rs) => rs.filter((x) => x.key !== r.key));
    toast.add({ title: "Role added to your profile" });
  }

  return (
    <div>
      <FormGrid>
        <Field label="Hospitality experience" htmlFor="ap-years">
          <Select id="ap-years" value={form.yearsExperience} options={YEARS} onChange={(v) => set("yearsExperience", v)} />
        </Field>
        <Field label="Expected salary (monthly)" htmlFor="ap-salary">
          <Select id="ap-salary" value={form.expectedSalary} options={SALARY_BANDS} onChange={(v) => set("expectedSalary", v)} />
        </Field>
      </FormGrid>

      <SubHead className="mt-6">Employment history</SubHead>
      {history.length === 0 && newRoles.length === 0 ? (
        <p className="ap-sm">No roles yet. Add your hospitality roles once and they carry over to every application.</p>
      ) : null}
      {history.map((entry, i) => (
        <ProfileEntry key={`${entry.role}-${entry.company}-${i}`} entry={entry} index={i} history={history} />
      ))}
      {newRoles.map((r) => (
        <Entry key={r.key}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <b className="text-[15px]">New role</b>
            <button
              type="button"
              onClick={async () => {
                const ok = await confirmAction({
                  tone: "danger",
                  title: "Remove this role?",
                  description: "What you typed for this role will be cleared. Your saved roles are not affected.",
                  confirmLabel: "Remove role",
                  cancelLabel: "Keep it",
                });
                if (ok) setNewRoles((rs) => rs.filter((x) => x.key !== r.key));
              }}
              className="inline-flex size-12 items-center justify-center rounded-[10px] text-(--ap-muted) hover:bg-(--ap-line-2) hover:text-(--ap-ink)"
              aria-label="Remove this role"
            >
              <X className="size-4.5" strokeWidth={STROKE} aria-hidden="true" />
            </button>
          </div>
          <FormGrid>
            <Field label="Position" htmlFor={`nr-p-${r.key}`}>
              <input id={`nr-p-${r.key}`} className={INPUT_CLS} placeholder="e.g. Line Cook" value={r.position} onChange={(e) => patchRole(r.key, { position: e.target.value })} />
            </Field>
            <Field label="Employer" htmlFor={`nr-e-${r.key}`}>
              <input id={`nr-e-${r.key}`} className={INPUT_CLS} placeholder="e.g. Grand Palm Hotel" value={r.employer} onChange={(e) => patchRole(r.key, { employer: e.target.value })} />
            </Field>
            <Field label="Start date" htmlFor={`nr-s-${r.key}`}>
              <DatePicker id={`nr-s-${r.key}`} title="Start date" mode="month" max={r.end || undefined} value={r.start} onChange={(v) => patchRole(r.key, { start: v })} />
            </Field>
            <Field label="End date" htmlFor={`nr-d-${r.key}`} hint="Leave empty if you still work here">
              <DatePicker id={`nr-d-${r.key}`} title="End date" mode="month" min={r.start || undefined} placeholder="Present" value={r.end} onChange={(v) => patchRole(r.key, { end: v })} />
            </Field>
            <Field label="Reason for leaving" htmlFor={`nr-r-${r.key}`} full hint="Leave empty if you still work here">
              <input id={`nr-r-${r.key}`} className={INPUT_CLS} value={r.reason} onChange={(e) => patchRole(r.key, { reason: e.target.value })} />
            </Field>
          </FormGrid>
          <div className="mt-3.5 flex justify-end">
            <button type="button" className={`${BTN} ap-btn-sm ap-btn-p`} disabled={!r.position.trim() || !r.employer.trim()} onClick={() => saveRole(r)}>
              Save role
            </button>
          </div>
        </Entry>
      ))}
      <button
        type="button"
        onClick={() => setNewRoles((rs) => [...rs, { key: Date.now(), position: "", employer: "", start: "", end: "", reason: "" }])}
        className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cbbd9f] bg-transparent text-[14px] font-semibold text-(--ap-violet) hover:bg-(--ap-tint)"
      >
        <Plus className="size-5" strokeWidth={STROKE} aria-hidden="true" />
        Add another role
      </button>

      <SubHead className="mt-6">Availability</SubHead>
      <FormGrid>
        <Field label="Availability" htmlFor="ap-avail">
          <Select id="ap-avail" value={form.availability} options={AVAILABILITY} onChange={(v) => set("availability", v)} />
        </Field>
        <Field label="Earliest start date" htmlFor="ap-start">
          <DatePicker id="ap-start" title="Earliest start date" min={todayIso()} value={form.earliestStart} onChange={(v) => set("earliestStart", v)} />
        </Field>
        <Field label="Preferred location" htmlFor="ap-loc">
          <Select id="ap-loc" value={form.preferredLocation} options={LOCATIONS} onChange={(v) => set("preferredLocation", v)} />
        </Field>
        <div className="max-[640px]:hidden" />
        <Field label="Willing to work shifts">
          <Segmented label="Willing to work shifts" value={form.willingShifts} options={YES_NO} onChange={(v) => set("willingShifts", v)} />
        </Field>
        <Field label="Weekends">
          <Segmented label="Weekends" value={form.willingWeekends} options={YES_NO} onChange={(v) => set("willingWeekends", v)} />
        </Field>
        <Field label="Public holidays">
          <Segmented label="Public holidays" value={form.willingHolidays} options={YES_NO} onChange={(v) => set("willingHolidays", v)} />
        </Field>
      </FormGrid>

      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-[14px] font-semibold text-(--ap-ink-2)" id="ap-sectors">
          Hospitality sectors you&apos;ve worked in
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ap-sectors">
          {SECTOR_OPTIONS.map((s) => (
            <Pick key={s} pressed={form.sectors.includes(s)} onClick={() => toggleSector(s)}>
              {s}
            </Pick>
          ))}
        </div>
      </div>
    </div>
  );
}

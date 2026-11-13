"use client";

/**
 * Add / edit sheet for one list item. Same shell as the Admin NoteSheet (bottom sheet on phones,
 * centred card from 768px; Esc, backdrop and Cancel close). Fields change with the list.
 * The "Remove" link only appears for an item that is used nowhere; everything else is deactivated from the row.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { newsreader } from "@/components/applicant/fonts";
import { useIsClient } from "@/components/applicant/motion";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { docTypeOptions, nameOf, usageOf, useListsData } from "@/lib/admin/lists/store";
import { DOC_FORMATS, DOC_STAGES, DOC_STAGE_LABEL, type DocFormat, type DocStage, type ItemByKey, type ListKey, type SaveResult } from "@/lib/admin/lists/types";

const ALL_ROLES = "__all";

export interface SheetTarget {
  key: ListKey;
  noun: string;
  /** Null = adding. */
  item: ItemByKey[ListKey] | null;
}

export type AnyDraft = Record<string, unknown>;

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mt-4">
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-(--ap-ink-2)">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1.5 text-[12px] text-(--ap-muted)">{hint}</p> : null}
    </div>
  );
}

function YesNo({ label, value, onChange, yes = "Yes", no = "No" }: { label: string; value: boolean; onChange: (v: boolean) => void; yes?: string; no?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-(--ap-line) p-1">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-9 rounded-[9px] px-4 text-[14px] font-semibold ${value === v ? "bg-(--ap-violet) text-white" : "text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
        >
          {v ? yes : no}
        </button>
      ))}
    </div>
  );
}

function initialDraft(target: SheetTarget, firstDept: string): AnyDraft {
  const it = target.item as unknown as AnyDraft | null;
  switch (target.key) {
    case "roles":
      return { name: it?.name ?? "", departmentId: it?.departmentId ?? firstDept };
    case "leaveTypes":
      return { name: it?.name ?? "", paid: it?.paid ?? true, defaultDays: it?.defaultDays ?? 0, needsApproval: it?.needsApproval ?? true };
    case "interviewStages":
      return { name: it?.name ?? "", onlyWhereRequired: it?.onlyWhereRequired ?? false, defaultInterviewerRole: it?.defaultInterviewerRole ?? null };
    case "scoringCriteria":
      return { name: it?.name ?? "", hint: it?.hint ?? null, scaleMax: 5, weight: it?.weight ?? null };
    case "requiredDocuments":
      return { roleId: it ? it.roleId : null, docTypeKey: it?.docTypeKey ?? "cv", stage: it?.stage ?? "application", required: it?.required ?? true, formats: it?.formats ?? ["PDF"], maxMb: it?.maxMb ?? 5 };
    default:
      return { name: it?.name ?? "" };
  }
}

export function ItemSheet({
  target,
  onClose,
  onSave,
  onRemove,
}: {
  target: SheetTarget;
  onClose: () => void;
  onSave: (draft: AnyDraft) => Promise<SaveResult>;
  onRemove: () => Promise<SaveResult>;
}) {
  const isClient = useIsClient();
  const d = useListsData();
  const titleId = useId();
  const id = useId();
  const { key, item } = target;
  const [draft, setDraft] = useState<AnyDraft>(() => initialDraft(target, d.departments.find((x) => x.active)?.id ?? d.departments[0]?.id ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialogFocus<HTMLFormElement>(busy ? undefined : onClose);
  const set = (patch: AnyDraft) => {
    setDraft((x) => ({ ...x, ...patch }));
    setError(null);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!isClient) return null;
  const itemId = (item as { id: string } | null)?.id ?? null;
  const used = itemId ? usageOf(key, itemId, d) : 0;
  const text = (k: string) => (typeof draft[k] === "string" ? (draft[k] as string) : "");

  async function submit() {
    setBusy(true);
    const r = await onSave(draft);
    setBusy(false);
    if (!r.ok) setError(r.error);
  }
  async function remove() {
    setBusy(true);
    const r = await onRemove();
    setBusy(false);
    if (!r.ok) setError(r.error);
  }

  const roleOptions = [{ value: ALL_ROLES, label: "All roles" }, ...d.roles.filter((r) => r.active || r.id === draft.roleId).map((r) => ({ value: r.id, label: r.name }))];
  const formats = (draft.formats as DocFormat[] | undefined) ?? [];
  const heading = `${item ? "Edit" : "Add"} ${target.noun}`;

  return createPortal(
    <div
      className={`applicant-shell ${newsreader.variable} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        ref={dialogRef} tabIndex={-1} role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] min-[768px]:w-[520px] min-[768px]:rounded-[22px] min-[768px]:p-7"
      >
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          {heading}
        </h2>
        {item && used > 0 ? (
          <p className="mt-2 text-[13px] text-(--ap-muted)">
            Used in {used} {used === 1 ? "place" : "places"}. Renaming it changes how it reads wherever it is picked.
          </p>
        ) : null}

        {key !== "requiredDocuments" ? (
          <Field label="Name" htmlFor={`${id}-name`}>
            <input id={`${id}-name`} autoFocus className="ap-input" value={text("name")} maxLength={60} aria-invalid={Boolean(error)} onChange={(e) => set({ name: e.target.value })} />
          </Field>
        ) : null}

        {key === "roles" ? (
          <Field label="Department" hint="Vacancies and staff pick a role from its department.">
            <SelectMenu label="Department" value={text("departmentId")} onChange={(v) => set({ departmentId: v })} options={d.departments.filter((x) => x.active || x.id === draft.departmentId).map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
        ) : null}

        {key === "leaveTypes" ? (
          <>
            <Field label="Paid leave?">
              <YesNo label="Paid leave" value={draft.paid as boolean} onChange={(v) => set({ paid: v })} />
            </Field>
            <Field label="Default days per year" htmlFor={`${id}-days`}>
              <input id={`${id}-days`} className="ap-input w-32" inputMode="numeric" value={Number.isNaN(draft.defaultDays) ? "" : String(draft.defaultDays)} onChange={(e) => set({ defaultDays: e.target.value === "" ? Number.NaN : Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
            <Field label="Needs approval?" hint="Choose No only for leave that is recorded without a decision.">
              <YesNo label="Needs approval" value={draft.needsApproval as boolean} onChange={(v) => set({ needsApproval: v })} />
            </Field>
          </>
        ) : null}

        {key === "interviewStages" ? (
          <>
            <Field label="Only where required?" hint="Yes: the stage is skipped unless the vacancy or client asks for it.">
              <YesNo label="Only where required" value={draft.onlyWhereRequired as boolean} onChange={(v) => set({ onlyWhereRequired: v })} />
            </Field>
            <Field label="Default interviewer role (optional)" htmlFor={`${id}-iv`}>
              <input id={`${id}-iv`} className="ap-input" value={(draft.defaultInterviewerRole as string | null) ?? ""} maxLength={60} onChange={(e) => set({ defaultInterviewerRole: e.target.value.trim() ? e.target.value : null })} />
            </Field>
          </>
        ) : null}

        {key === "scoringCriteria" ? (
          <>
            <Field label="Helper text (optional)" htmlFor={`${id}-hint`}>
              <input id={`${id}-hint`} className="ap-input" value={(draft.hint as string | null) ?? ""} maxLength={120} onChange={(e) => set({ hint: e.target.value.trim() ? e.target.value : null })} />
            </Field>
            <Field label="Scale" hint="Interviewers score from 1 to 5.">
              <p className="text-[15px] font-semibold text-(--ap-ink)">1 to 5</p>
            </Field>
            <Field label="Weight (optional)" htmlFor={`${id}-w`} hint="Leave blank to count every criterion equally.">
              <input id={`${id}-w`} className="ap-input w-32" inputMode="numeric" value={draft.weight === null || draft.weight === undefined ? "" : String(draft.weight)} onChange={(e) => set({ weight: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
          </>
        ) : null}

        {key === "requiredDocuments" ? (
          <>
            <Field label="Role">
              <SelectMenu label="Role" value={(draft.roleId as string | null) ?? ALL_ROLES} onChange={(v) => set({ roleId: v === ALL_ROLES ? null : v })} options={roleOptions} />
            </Field>
            <Field label="Document">
              <SelectMenu label="Document" value={text("docTypeKey")} onChange={(v) => set({ docTypeKey: v })} options={docTypeOptions()} />
            </Field>
            <Field label="When it is needed">
              <SelectMenu label="When it is needed" value={text("stage")} onChange={(v) => set({ stage: v as DocStage })} options={DOC_STAGES.map((s) => ({ value: s, label: DOC_STAGE_LABEL[s] }))} />
            </Field>
            <Field label="Required or optional?">
              <YesNo label="Required" value={draft.required as boolean} onChange={(v) => set({ required: v })} yes="Required" no="Optional" />
            </Field>
            <Field label="Accepted formats">
              <div role="group" aria-label="Accepted formats" className="flex gap-2">
                {DOC_FORMATS.map((f) => {
                  const on = formats.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ formats: on ? formats.filter((x) => x !== f) : DOC_FORMATS.filter((x) => x === f || formats.includes(x)) })}
                      className={`h-10 rounded-full border px-4 text-[14px] font-semibold ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Largest file size (MB)" htmlFor={`${id}-mb`}>
              <input id={`${id}-mb`} className="ap-input w-32" inputMode="numeric" value={Number.isNaN(draft.maxMb) ? "" : String(draft.maxMb)} onChange={(e) => set({ maxMb: e.target.value === "" ? Number.NaN : Number(e.target.value.replace(/\D/g, "")) })} />
            </Field>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-(--ap-rose)">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:items-center">
          {item && used === 0 ? (
            <button type="button" disabled={busy} onClick={() => void remove()} className="h-11 text-left text-[14px] font-semibold text-(--ap-rose) hover:underline min-[768px]:mr-auto">
              Remove {nameOf(key, item, d)}
            </button>
          ) : (
            <span className="min-[768px]:mr-auto" />
          )}
          <button type="button" disabled={busy} onClick={onClose} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! min-[768px]:h-11 min-[768px]:w-auto">
            {busy ? "Saving..." : item ? "Save changes" : `Add ${target.noun}`}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

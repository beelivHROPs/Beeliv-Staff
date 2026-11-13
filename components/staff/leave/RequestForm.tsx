"use client";

import { useRef, useState } from "react";
import { Check, Plus, Upload, X } from "@/components/applicant/icons";
import { Field } from "@/components/applicant/apply/parts";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { FieldError, useFlagInvalid } from "@/components/applicant/form-feedback";
import { toast } from "@/components/ui/toast";
import { requestLeave } from "@/lib/staff/service";
import { ACCEPT, fileProblem, FORMATS } from "../documents/file-rules";
import { ActionPill, confirmAction } from "../kit";
import { LEAVE_TYPE_OPTIONS } from "./leave-meta";

/**
 * Request Leave form. It only collects and checks the basics (type, dates in
 * order); entitlement, notice period and approval are backend decisions (brief
 * section 9), so nothing here validates against them.
 * `bare` is the phone version inside the sheet: no card or title of its own,
 * the shared action pill for the submit button, and its own field ids.
 */
export function RequestForm({ onDone, bare = true }: { onDone: () => void; bare?: boolean }) {
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ type?: string; start?: string; end?: string; file?: string }>({});
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const P = bare ? "lvp" : "lv";

  function pick(f: File | undefined) {
    if (!f) return;
    const problem = fileProblem(f);
    setErrors((e) => ({ ...e, file: problem ?? undefined }));
    setFile(problem ? null : f);
  }

  async function removeFile() {
    const ok = await confirmAction({
      tone: "danger",
      title: "Remove this attachment?",
      description: "It won't be sent with your leave request. You can attach another file.",
      confirmLabel: "Remove attachment",
      cancelLabel: "Keep it",
    });
    if (ok) setFile(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!type) next.type = "Choose a leave type.";
    if (!start) next.start = "Choose the first day.";
    if (!end) next.end = "Choose the last day.";
    else if (start && end < start) next.end = "The last day can't be before the first day.";
    if (errors.file) next.file = errors.file;
    setErrors(next);
    if (Object.keys(next).length) {
      flag();
      return;
    }

    setBusy(true);
    try {
      await requestLeave({ type, startDate: start, endDate: end, reason: reason.trim(), attachment: file });
      toast.add({ title: "Leave request sent", description: "You'll see its status here once Beeliv responds.", type: "success" });
      setType(""); setStart(""); setEnd(""); setReason(""); setFile(null); setErrors({});
      onDone();
    } catch {
      toast.add({ title: "We couldn't send your request", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4" aria-label="Request leave">
      <Field label="Leave type" htmlFor={`${P}-type`}>
        <SelectMenu id={`${P}-type`} invalid={!!errors.type} describedBy={errors.type ? `${P}-type-err` : undefined} value={type} options={LEAVE_TYPE_OPTIONS} onChange={(v) => { setType(v); setErrors((x) => ({ ...x, type: undefined })); }} placeholder="Select a leave type" />
        <FieldError id={`${P}-type-err`}>{errors.type}</FieldError>
      </Field>
      <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
        <Field label="Start date" htmlFor={`${P}-start`}>
          <DatePicker id={`${P}-start`} invalid={!!errors.start} describedBy={errors.start ? `${P}-start-err` : undefined} title="Start date" value={start} onChange={(v) => { setStart(v); setErrors((x) => ({ ...x, start: undefined, end: undefined })); }} placeholder="Choose a date" />
          <FieldError id={`${P}-start-err`}>{errors.start}</FieldError>
        </Field>
        <Field label="End date" htmlFor={`${P}-end`}>
          <DatePicker id={`${P}-end`} invalid={!!errors.end} describedBy={errors.end ? `${P}-end-err` : undefined} title="End date" value={end} min={start || undefined} onChange={(v) => { setEnd(v); setErrors((x) => ({ ...x, end: undefined })); }} placeholder="Choose a date" />
          <FieldError id={`${P}-end-err`}>{errors.end}</FieldError>
        </Field>
      </div>
      <Field label="Reason (optional)" htmlFor={`${P}-reason`}>
        <textarea id={`${P}-reason`} rows={3} maxLength={500} className="ap-input" placeholder="Anything Beeliv should know" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label="Attachment (optional)" hint={FORMATS}>
        {file ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-(--ap-line) bg-(--ap-surface,#fff) py-1.5 pr-1.5 pl-3.5">
            <Check className="size-4 shrink-0 text-(--ap-ok)" aria-hidden="true" />
            <span className="ap-sm min-w-0 flex-1 truncate font-semibold text-(--ap-ink)">{file.name}</span>
            <button type="button" onClick={() => void removeFile()} aria-label="Remove attachment" className="flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-muted) hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ActionPill icon={Upload} variant="outline" compact arrow={false} onClick={() => picker.current?.click()} className="self-start" ariaLabel="Attach a file">
            Attach a file
          </ActionPill>
        )}
        <input ref={picker} type="file" accept={ACCEPT} className="hidden" tabIndex={-1} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <FieldError id={`${P}-file-err`}>{errors.file}</FieldError>
      </Field>
      <ActionPill type="submit" icon={Plus} variant="dark" loading={busy} fit className="max-[767px]:w-full">
        {busy ? "Sending..." : "Send request"}
      </ActionPill>
    </form>
  );
}

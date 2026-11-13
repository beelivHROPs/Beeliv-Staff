"use client";

/**
 * Schedule / Reschedule sheet and Cancel flow, shared by the interviews list
 * and the interview detail. Validation is for helpfulness only (the backend
 * re-validates). The conflict check is ADVISORY: it warns, it does not block
 * (whether conflicts should block needs Beeliv confirmation).
 */
import type { SoundName } from "@/lib/admin/sound";
import { useEffect, useId, useState } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { DatePicker } from "@/components/applicant/form-fields";
import { TimePicker } from "@/components/admin/TimePicker";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { Disc } from "@/components/admin/overview/Disc";
import { Exclaim } from "@/components/applicant/icons";
import { cancelInterview, checkInterviewConflicts, rescheduleInterview, scheduleInterview } from "@/lib/admin/interviews/hooks";
import { METHOD_LABEL, type Conflict, type InterviewDetail, type InterviewMethod, type InterviewRow, type PersonRef } from "@/lib/admin/interviews/types";
import { NoteSheet, SHEET_BTN, Sheet } from "./ui";

export type Intent = { kind: "schedule" | "reschedule" | "cancel"; row: InterviewRow | null };

const DURATIONS = [30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} minutes` }));
const METHODS = (Object.keys(METHOD_LABEL) as InterviewMethod[]).map((m) => ({ value: m, label: METHOD_LABEL[m] }));

const pad = (n: number) => String(n).padStart(2, "0");
const dateOf = (iso: string | null) => (iso ? `${new Date(iso).getFullYear()}-${pad(new Date(iso).getMonth() + 1)}-${pad(new Date(iso).getDate())}` : "");
const timeOf = (iso: string | null) => (iso ? `${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}` : "");
const isoOf = (date: string, time: string) => (date && time ? new Date(`${date}T${time}`) : null);

export function InterviewDialogs({
  intent,
  interviewers,
  schedulable,
  onClose,
  onSaved,
  onFailed,
}: {
  intent: Intent;
  interviewers: PersonRef[];
  /** Interviews with no time yet; used when scheduling without a chosen row. */
  schedulable: { id: string; label: string; defaults: InterviewRow["defaults"] }[];
  onClose: () => void;
  onSaved: (detail: InterviewDetail, text: string, sound?: SoundName) => void;
  onFailed: (text: string) => void;
}) {
  if (intent.kind === "cancel" && intent.row) return <CancelFlow row={intent.row} onClose={onClose} onSaved={onSaved} onFailed={onFailed} />;
  return <ScheduleForm intent={intent} interviewers={interviewers} schedulable={schedulable} onClose={onClose} onSaved={onSaved} onFailed={onFailed} />;
}

function CancelFlow({ row, onClose, onSaved, onFailed }: { row: InterviewRow; onClose: () => void; onSaved: (d: InterviewDetail, t: string, sound?: SoundName) => void; onFailed: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <NoteSheet
      title={`Cancel ${row.stageName} for ${row.candidateName}`}
      description="The interview is kept in history as cancelled. A reason is required."
      label="Reason for cancelling"
      confirmLabel="Continue"
      danger
      busy={busy}
      onCancel={onClose}
      onSubmit={async (reason) => {
        const ok = await confirmAction({ tone: "danger", title: "Cancel this interview?", description: "The candidate stays at this stage until you reschedule or close it. Your reason is written to the history.", confirmLabel: "Cancel interview", cancelLabel: "Keep interview" });
        if (!ok) return;
        setBusy(true);
        try {
          const d = await cancelInterview(row.id, { reason });
          onSaved(d, `The ${row.stageName} for ${row.candidateName} was cancelled.`, "rejected");
        } catch {
          onFailed("We could not cancel the interview. Nothing was changed. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

function ScheduleForm({ intent, interviewers, schedulable, onClose, onSaved, onFailed }: { intent: Intent; interviewers: PersonRef[]; schedulable: { id: string; label: string; defaults: InterviewRow["defaults"] }[]; onClose: () => void; onSaved: (d: InterviewDetail, t: string) => void; onFailed: (t: string) => void }) {
  const resched = intent.kind === "reschedule";
  const cur = intent.row;
  const [targetId, setTargetId] = useState(cur?.id ?? "");
  const [date, setDate] = useState(dateOf(cur?.at ?? null));
  const [time, setTime] = useState(timeOf(cur?.at ?? null));
  // Length and method start from the stage's usual values in the vacancy's journey (when it has this stage).
  const [duration, setDuration] = useState(String(cur?.defaults && cur.status === "to-schedule" ? cur.defaults.minutes : (cur?.durationMins ?? 45)));
  const [interviewerId, setInterviewerId] = useState(cur?.interviewer?.id ?? "");
  const [method, setMethod] = useState<InterviewMethod | "">(cur?.method ?? cur?.defaults?.method ?? "");
  const [location, setLocation] = useState(cur?.location ?? "");
  const [link, setLink] = useState(cur?.link ?? "");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<{ key: string; list: Conflict[] } | null>(null);
  const uid = useId();
  const [openedAt] = useState(() => Date.now());

  const when = isoOf(date, time);
  const whenIso = when && !Number.isNaN(when.getTime()) ? when.toISOString() : null;
  const errors: Record<string, string> = {};
  if (!targetId) errors.target = "Choose the candidate and stage.";
  if (!date) errors.date = "Choose a date.";
  if (!time) errors.time = "Choose a time.";
  if (whenIso && new Date(whenIso).getTime() < openedAt) errors.date = "The interview must be in the future.";
  if (!interviewerId) errors.interviewer = "Choose an interviewer.";
  if (!method) errors.method = "Choose how it will be held.";
  if (method === "in-person" && !location.trim()) errors.location = "Add the place.";
  // Optional. When given: https only, plain text, at most 300 characters.
  if (method === "video" && link.trim() && !/^https:\/\/\S+$/i.test(link.trim())) errors.link = "Use a link that starts with https://";
  if (resched && !reason.trim()) errors.reason = "A reason is required.";
  const invalid = Object.keys(errors).length > 0;
  const show = (k: string) => (tried ? errors[k] : undefined);

  const key = whenIso && interviewerId && targetId ? `${targetId}|${whenIso}|${duration}|${interviewerId}` : null;
  useEffect(() => {
    if (!key || !whenIso) return;
    let cancelled = false;
    checkInterviewConflicts({ interviewId: targetId, at: whenIso, durationMins: Number(duration), interviewerId }).then(
      (list) => !cancelled && setFound({ key, list }),
      () => !cancelled && setFound({ key, list: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, targetId, whenIso, duration, interviewerId]);
  const conflicts = found && found.key === key ? found.list : [];

  async function save() {
    setTried(true);
    if (invalid || !whenIso || !method) return;
    setBusy(true);
    const input = { at: whenIso, durationMins: Number(duration), interviewerId, method, location: location.trim(), link: link.trim(), reason: reason.trim() };
    const row = cur ?? null;
    try {
      const d = resched ? await rescheduleInterview(targetId, input) : await scheduleInterview(targetId, input);
      onSaved(d, `${d.stageName} for ${d.candidateName} is ${resched ? "rescheduled" : "scheduled"}. The change is in their history.`);
    } catch {
      onFailed(`We could not ${resched ? "reschedule" : "schedule"} ${row ? `${row.candidateName}'s interview` : "the interview"}. Nothing was changed. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => (show(k) ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">{show(k)}</p> : null);
  const label = "mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)";

  return (
    <Sheet
      title={resched ? `Reschedule ${cur?.candidateName ?? "interview"}` : "Schedule interview"}
      description={resched ? "Pick the new time. A reason is required and is added to the history." : "Set the time, interviewer and place. The candidate is notified once the backend is connected."}
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>
            {busy ? "Saving..." : resched ? "Reschedule" : "Schedule"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!cur ? (
          <div>
            <span className={label}>Candidate and stage</span>
            <SelectMenu
              label="Candidate and stage"
              placeholder={schedulable.length ? "Choose who to schedule" : "No one is waiting to be scheduled"}
              value={targetId}
              onChange={(v) => {
                setTargetId(v);
                const d = schedulable.find((x) => x.id === v)?.defaults;
                if (d) {
                  setMethod(d.method);
                  setDuration(String(d.minutes));
                }
              }}
              options={schedulable.map((s) => ({ value: s.id, label: s.label }))} invalid={!!show("target")} />
            {err("target")}
          </div>
        ) : (
          <p className="text-[15px] font-semibold text-(--ap-ink)">
            {cur.candidateName}, {cur.stageName} <span className="font-normal text-(--ap-muted)">({cur.vacancy})</span>
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-d`} className={label}>
              Date
            </label>
            <DatePicker id={`${uid}-d`} title="Interview date" value={date} onChange={setDate} invalid={!!show("date")} placeholder="Choose a date" />
            {err("date")}
          </div>
          <div>
            <label htmlFor={`${uid}-t`} className={label}>
              Time
            </label>
            <TimePicker id={`${uid}-t`} label="Interview time" value={time} onChange={setTime} invalid={!!show("time")} />
            {err("time")}
          </div>
          <div>
            <span className={label}>Length</span>
            <SelectMenu label="Length" value={duration} onChange={setDuration} options={DURATIONS} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2">
          <div>
            <span className={label}>Interviewer</span>
            <SelectMenu label="Interviewer" placeholder="Choose an interviewer" value={interviewerId} onChange={setInterviewerId} options={interviewers.map((p) => ({ value: p.id, label: p.name }))} invalid={!!show("interviewer")} />
            {err("interviewer")}
          </div>
          <div>
            <span className={label}>How</span>
            <SelectMenu label="Method" placeholder="Choose a method" value={method} onChange={(v) => setMethod(v as InterviewMethod)} options={METHODS} invalid={!!show("method")} />
            {err("method")}
          </div>
        </div>
        {method === "in-person" ? (
          <div>
            <label htmlFor={`${uid}-l`} className={label}>
              Place
            </label>
            <input id={`${uid}-l`} className="ap-input" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} placeholder="Address or room" aria-invalid={!!show("location")} />
            {err("location")}
          </div>
        ) : null}
        {method === "video" ? (
          <div>
            <label htmlFor={`${uid}-k`} className={label}>
              Meeting link <span className="font-normal text-(--ap-muted)">(optional)</span>
            </label>
            <input id={`${uid}-k`} className="ap-input" value={link} maxLength={300} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" autoComplete="off" aria-invalid={!!show("link")} />
            {err("link") ?? <p className="mt-1 text-[13px] text-(--ap-muted)">Paste a Meet or Zoom link. The candidate sees a Join button 15 minutes before the start.</p>}
          </div>
        ) : null}
        {resched ? (
          <div>
            <label htmlFor={`${uid}-r`} className={label}>
              Reason for rescheduling
            </label>
            <textarea id={`${uid}-r`} className="ap-input" rows={3} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} aria-invalid={!!show("reason")} />
            {err("reason")}
          </div>
        ) : null}
        {conflicts.length > 0 ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-(--ap-line) bg-(--ap-warn-bg) p-3.5">
            <Disc icon={Exclaim} tone="pending" />
            <div className="min-w-0 text-[14px] leading-snug text-(--ap-ink)">
              <b className="block text-[15px]">Possible clash</b>
              <ul className="m-0 mt-1 list-disc pl-5">
                {conflicts.map((c) => (
                  <li key={c.interviewId}>{c.label}</li>
                ))}
              </ul>
              <p className="mt-1 text-(--ap-muted)">You can still book this time. Whether clashes should be blocked needs Beeliv confirmation.</p>
            </div>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

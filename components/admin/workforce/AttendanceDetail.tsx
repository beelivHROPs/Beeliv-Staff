"use client";

/**
 * One attendance record: facts, any pending correction, and the activity
 * history. HR can REQUEST a correction (reason required, confirmed through
 * confirmAction); the request is recorded in the history and the times stay as
 * recorded until it is processed. Who may correct, and who processes the
 * request, needs Beeliv confirmation. Hiding a button is presentation only;
 * the backend re-checks every write.
 * Reused: confirmAction, EmptyState, ErrorPanel, Disc, NoticeBanner (interviews), StatusChip.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { NoticeBanner, type Notice } from "@/components/admin/interviews/ui";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { TimePicker } from "@/components/admin/TimePicker";
import { ChevronLeft, Clock3, Pencil } from "@/components/applicant/icons";
import { DETAIL_TITLE } from "@/components/applicant/primitives";
import { Disc } from "@/components/admin/overview/Disc";
import { requestCorrection, useAttendanceRecord } from "@/lib/admin/workforce/hooks";
import type { AttendanceDetail as Detail } from "@/lib/admin/workforce/types";
import { formatClock, fullDay } from "@/lib/client/format";
import { ATTENDANCE_HREF, AttendanceStatusChip, CARD, DT, Field, FieldError, FlagChips, H2, HistoryList, LABEL, SHEET_BTN, Sheet, StaffCell, clockOf, range, stamp } from "./parts";
import { DetailSkeleton, EmptyCard } from "./states";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { RestrictedPanel } from "@/components/admin/interviews/ui";

export function AttendanceDetail({ id }: { id: string }) {
  const live = useAttendanceRecord(id);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (live.status === "restricted") return <><Back /><RestrictedPanel title="Attendance record" what="This record" /></>;
  if (live.status === "error") return <><Back /><ErrorPanel title="We could not load this record" retry={live.retry} /></>;
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <EmptyCard icon={Clock3} title="Record not found" description="This attendance record does not exist or is outside your access." />
      </>
    );
  }
  const d = live.data;
  if (!d) return <DetailSkeleton label="Loading attendance record" />;

  return (
    <div>
      <Back />
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <header className={`${CARD} mb-4 flex flex-wrap items-center gap-4`}>
        <Disc icon={Clock3} className="size-12" />
        <div className="min-w-0 flex-1">
          <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.staff.name}</h1>
          <p className="mt-1 text-[14px] text-(--ap-muted)">
            {fullDay(d.date)}, {d.shiftLabel} shift at {d.outlet}
          </p>
        </div>
        <AttendanceStatusChip status={d.status} />
      </header>

      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {d.pendingCorrection ? (
            <section className={CARD} aria-labelledby="corr-h">
              <h2 id="corr-h" className={`${H2} mb-3`}>
                Correction requested
              </h2>
              <p className="text-[14px] text-(--ap-ink-2)">{d.pendingCorrection.reason}</p>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-[14px] min-[520px]:grid-cols-3">
                <Field label="Proposed check-in" value={d.pendingCorrection.proposedCheckIn ? formatClock(d.pendingCorrection.proposedCheckIn) : "No change"} />
                <Field label="Proposed check-out" value={d.pendingCorrection.proposedCheckOut ? formatClock(d.pendingCorrection.proposedCheckOut) : "No change"} />
                <Field label="Requested" value={`${d.pendingCorrection.requestedBy}, ${stamp(d.pendingCorrection.at)}`} />
              </dl>
              <p className="mt-3 text-[13px] text-(--ap-muted)">The recorded times stay as they are until the request is processed. Who processes it needs Beeliv confirmation.</p>
            </section>
          ) : null}

          <section className={CARD} aria-labelledby="history-h">
            <h2 id="history-h" className={`${H2} mb-3`}>
              Activity history
            </h2>
            <HistoryList history={d.history} empty="Nothing has happened to this record yet." />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className={CARD} aria-labelledby="actions-h">
            <h2 id="actions-h" className={`${H2} mb-3`}>
              Actions
            </h2>
            <div className="flex flex-col gap-2.5">
              {d.canRequestCorrection ? (
                <button type="button" onClick={() => setSheet(true)} className="ap-btn ap-btn-p h-11 text-white!">
                  <Pencil className="size-4" aria-hidden="true" /> Request a correction
                </button>
              ) : (
                <p className="text-[14px] text-(--ap-muted)">{d.pendingCorrection ? "A correction is already waiting on this record." : "No actions are available for this record."}</p>
              )}
              <p className="text-[13px] text-(--ap-muted)">Who may correct attendance needs Beeliv confirmation.</p>
            </div>
          </section>

          <section className={CARD} aria-labelledby="details-h">
            <h2 id="details-h" className={`${H2} mb-3`}>
              Details
            </h2>
            <div className="mb-4">
              <StaffCell staff={d.staff} sub={d.role} />
            </div>
            <dl className="grid grid-cols-1 gap-3 text-[14px] min-[520px]:grid-cols-2 min-[1100px]:grid-cols-1 min-[1280px]:grid-cols-2">
              <Field label="Status" value={<AttendanceStatusChip status={d.status} />} />
              <Field label="Reference" value={d.reference} />
              <Field label="Client" value={d.client} />
              <Field label="Outlet" value={d.outlet} />
              <Field label="Shift" value={`${d.shiftLabel}, ${range(d.shiftStart, d.shiftEnd)}`} />
              <Field label="Check-in" value={clockOf(d.checkIn) ?? "Not recorded"} />
              <Field label="Check-out" value={clockOf(d.checkOut) ?? "Not recorded"} />
              <Field label="Flags" value={<FlagChips flags={d.flags} />} />
            </dl>
            <div className="mt-4 border-t border-(--ap-line-2) pt-3">
              <p className={DT}>Notes</p>
              <p className="mt-1 text-[14px] text-(--ap-ink-2)">{d.note ?? "No notes."}</p>
            </div>
          </section>
        </aside>
      </div>

      {sheet ? (
        <CorrectionSheet
          d={d}
          onClose={() => setSheet(false)}
          onDone={(fresh) => {
            live.setData(fresh);
            setSheet(false);
            setNotice({ kind: "ok", text: "The correction request was recorded in the history." });
          }}
          onFailed={() => setNotice({ kind: "error", text: "We could not send the request. Nothing was changed. Please try again." })}
        />
      ) : null}
    </div>
  );
}

function CorrectionSheet({ d, onClose, onDone, onFailed }: { d: Detail; onClose: () => void; onDone: (d: Detail) => void; onFailed: () => void }) {
  const uid = useId();
  const [inTime, setIn] = useState("");
  const [outTime, setOut] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors: { time?: string; reason?: string } = {};
  if (!inTime && !outTime) errors.time = "Enter the check-in time, the check-out time, or both.";
  if (inTime && outTime && outTime <= inTime) errors.time = "Check-out must be after check-in.";
  if (!reason.trim()) errors.reason = "A reason is required.";
  const show = (k: "time" | "reason") => (tried ? errors[k] : undefined);

  async function submit() {
    setTried(true);
    if (errors.time || errors.reason) return;
    const ok = await confirmAction({
      tone: "caution",
      title: `Request a correction for ${d.staff.name}?`,
      description: "The request is recorded; the attendance times do not change until it is processed.",
      points: ["Your reason is written to the activity history.", "Your name and the time are recorded."],
      confirmLabel: "Send request",
    });
    if (!ok) return;
    setBusy(true);
    try {
      onDone(await requestCorrection(d.id, { reason: reason.trim(), proposedCheckIn: inTime, proposedCheckOut: outTime }));
    } catch {
      onFailed();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Request a correction"
      description="Say what the times should be and why. This does not change the record by itself."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" disabled={busy} onClick={onClose} className={`ap-btn ap-btn-s ${SHEET_BTN}`}>
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={() => void submit()} className={`ap-btn ap-btn-p text-white! ${SHEET_BTN}`}>
            {busy ? "Sending..." : "Continue"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${uid}-i`} className={LABEL}>
              Correct check-in
            </label>
            <TimePicker id={`${uid}-i`} label="Check-in time" value={inTime} onChange={setIn} invalid={!!show("time")} />
          </div>
          <div>
            <label htmlFor={`${uid}-o`} className={LABEL}>
              Correct check-out
            </label>
            <TimePicker id={`${uid}-o`} label="Check-out time" value={outTime} onChange={setOut} invalid={!!show("time")} />
          </div>
        </div>
        <FieldError>{show("time")}</FieldError>
        <div>
          <label htmlFor={`${uid}-r`} className={LABEL}>
            Reason
          </label>
          <textarea id={`${uid}-r`} autoFocus className="ap-input" rows={4} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} aria-invalid={!!show("reason")} />
          <FieldError>{show("reason")}</FieldError>
          <p className="mt-1.5 text-[13px] text-(--ap-muted)">Required. Recorded in the history with your name and the time.</p>
        </div>
      </div>
    </Sheet>
  );
}

function Back() {
  return (
    <Link href={ATTENDANCE_HREF} className="mb-3 inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-(--ap-muted) hover:text-(--ap-ink)">
      <ChevronLeft className="size-4" aria-hidden="true" /> Attendance
    </Link>
  );
}

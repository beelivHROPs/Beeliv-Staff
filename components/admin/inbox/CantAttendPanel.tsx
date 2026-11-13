"use client";

/**
 * Shown at the top of a "Can't attend" case: the candidate's reason and note, the time they were
 * given, and the action HR needs: Reschedule, which opens the SAME reschedule sheet as the
 * Interviews screen for that interview. The time never changes by itself; only HR's reschedule
 * (or cancel) does, and the candidate then gets the new time (mock bridge, see
 * lib/bridge/interview-requests.ts).
 */
import Link from "next/link";
import { useState } from "react";
import { Calendar, Check } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { InterviewDialogs, type Intent } from "@/components/admin/interviews/InterviewDialogs";
import { useInterview } from "@/lib/admin/interviews/hooks";
import type { InterviewRequestInfo } from "@/lib/admin/inbox/types";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

export function CantAttendPanel({ info }: { info: InterviewRequestInfo }) {
  const live = useInterview(info.interviewId);
  const [intent, setIntent] = useState<Intent | null>(null);
  const d = live.data;
  const open = info.status === "open";
  const canReschedule = !!d && d.capabilities.canReschedule;

  return (
    <section aria-label="Interview request" className="rounded-2xl border border-(--ap-line) bg-white p-4 shadow-[0_1px_1px_rgba(0,0,0,.04)]">
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${open ? "bg-(--ap-warn-bg) text-(--ap-warn)" : "bg-(--ap-ok-bg) text-(--ap-ok)"}`}>
          {open ? <Calendar className="size-[18px]" aria-hidden="true" /> : <Check className="size-[18px]" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-[15px] font-bold">{open ? "Candidate cannot make this time" : info.status === "withdrawn" ? "Applicant withdrew the request" : info.status === "cancelled" ? "Interview cancelled" : "Interview rescheduled"}</h3>
          <p className="m-0 mt-0.5 text-[14px] text-(--ap-ink-2) wrap-anywhere">{info.interviewLabel}</p>
          <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[14px]">
            <dt className="text-(--ap-muted)">Given time</dt>
            <dd className="m-0">{when(info.originalAt)}</dd>
            <dt className="text-(--ap-muted)">Reason</dt>
            <dd className="m-0 wrap-anywhere">{info.reason}</dd>
            {info.note ? (
              <>
                <dt className="text-(--ap-muted)">Note</dt>
                <dd className="m-0 wrap-anywhere whitespace-pre-wrap">{info.note}</dd>
              </>
            ) : null}
          </dl>
          <p className="m-0 mt-2.5 text-[13px] text-(--ap-muted)">
            {open
              ? "The candidate has been told you have their message. The interview time stays as it is until you reschedule."
              : info.status === "withdrawn"
                ? "The applicant took the request back. The interview stays at its original time and nothing more is needed."
                : info.status === "cancelled"
                  ? "The candidate has been told the interview was cancelled."
                  : "The candidate has been sent the new time."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {open ? (
              <button
                type="button"
                disabled={!canReschedule}
                onClick={() => d && setIntent({ kind: "reschedule", row: d })}
                className="ap-btn ap-btn-p h-11 px-5 text-white! disabled:opacity-50"
              >
                Reschedule
              </button>
            ) : null}
            <Link href={`/admin/recruitment/interviews/${info.interviewId}`} className="ap-btn ap-btn-s h-11 px-5">
              Open interview
            </Link>
          </div>
        </div>
      </div>

      {intent && d ? (
        <InterviewDialogs
          key={`${intent.kind}-${intent.row?.id}`}
          intent={intent}
          interviewers={d.interviewerOptions}
          schedulable={[]}
          onClose={() => setIntent(null)}
          onSaved={(next, text) => {
            setIntent(null);
            live.setData(next);
            toast.add({ title: "Interview rescheduled", description: `${text} The candidate has the new time.`, type: "success" });
          }}
          onFailed={(text) => {
            setIntent(null);
            toast.add({ title: "Could not reschedule", description: text, type: "error" });
          }}
        />
      ) : null}
    </section>
  );
}

"use client";

import { useMemo } from "react";
import { CircleAlert, Search } from "@/components/applicant/icons";
import { addDays, formatClockRange, formatDateTimeClock, todayISO } from "@/lib/staff/format";
import { useAttendanceHistory, useSchedule } from "@/lib/staff/hooks";
import type { AttendanceRecord, Shift } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Facts, HERO_SURFACE, HeroDeco, Panel, Sk, StateCard } from "../kit";
import { BackCrumb, fullDateLong } from "../schedule/parts";

const STATE = {
  recorded: { word: "Recorded", dot: "bg-[#86efac]" },
  attention: { word: "Needs a look", dot: "bg-[#fcd34d]" },
  "no-shift": { word: "No shift", dot: "bg-white/60" },
} as const;

/** Attendance record detail: the day, check-in/out times and its shift (when known). */
export function AttendanceDetailBody({ recordId }: { recordId: string }) {
  const today = todayISO();
  const range = useMemo(() => ({ from: addDays(today, -60), to: addDays(today, 90) }), [today]);
  const history = useAttendanceHistory();
  const schedule = useSchedule(range);

  const record = history.data?.find((r) => r.id === recordId) ?? null;
  // The shift is optional context: a missing one never blocks the record.
  const shift = schedule.data?.find((s) => s.id === record?.shiftId) ?? null;

  return (
    <div className="w-full pt-1 pb-2">
      <BackCrumb href="/staff/attendance">Attendance</BackCrumb>
      {history.status === "loading" ? (
        <AttendanceDetailSkeleton />
      ) : history.status === "error" ? (
        <ErrorPanel title="We couldn't load this record" retry={history.retry} />
      ) : !record ? (
        <StateCard
          icon={Search}
          title="Record not found"
          text="This attendance record doesn't exist, or it isn't part of your history."
          action={
            <ActionPill href="/staff/attendance" variant="purple" compact arrow={false} className="w-full justify-center">
              Back to Attendance
            </ActionPill>
          }
        />
      ) : (
        <Detail r={record} shift={shift} />
      )}
    </div>
  );
}

function Detail({ r, shift }: { r: AttendanceRecord; shift: Shift | null }) {
  const st = STATE[r.status];
  return (
    <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8">
      <section aria-label="Attendance record" className={`${HERO_SURFACE} p-5 min-[768px]:p-6`}>
        <HeroDeco />
        <p className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">
          <span className={`size-2 rounded-full ${st.dot}`} aria-hidden="true" />
          {st.word}
        </p>
        <h1 className="mt-3 text-[26px] leading-tight font-bold min-[768px]:text-[30px]">{fullDateLong(r.date)}</h1>
        {r.status === "attention" ? (
          <p className="mt-3 flex items-start gap-2 text-[16px] text-white/90">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> This record needs a quick look. Contact Beeliv if you&apos;re unsure what is needed.
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/18 pt-4">
          <div>
            <dt className="text-[14px] text-white/72">Checked in</dt>
            <dd className="text-[20px] font-bold tabular-nums">{r.checkedInAt ? formatDateTimeClock(r.checkedInAt) : "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-[14px] text-white/72">Checked out</dt>
            <dd className="text-[20px] font-bold tabular-nums">{r.checkedOutAt ? formatDateTimeClock(r.checkedOutAt) : "Not recorded"}</dd>
          </div>
        </dl>
      </section>

      <Panel title="Shift">
        {shift ? (
          <div className="flex flex-col gap-5">
            <Facts
              rows={[
                ["Scheduled", formatClockRange(shift.startTime, shift.endTime)],
                ["Outlet", shift.outlet],
                ["Role", shift.role],
              ]}
            />
            <ActionPill href={`/staff/schedule/${shift.id}`} variant="outline" compact className="max-[767px]:w-full">
              View shift
            </ActionPill>
          </div>
        ) : (
          <p className="text-[16px] text-(--ap-muted)">{r.shiftId ? "Shift details aren't available for this record." : "This record isn't linked to a scheduled shift."}</p>
        )}
      </Panel>
      {r.status === "attention" ? (
        <ActionPill href="/staff/help" variant="dark" fit className="max-[767px]:w-full">
          Contact Beeliv
        </ActionPill>
      ) : null}
    </div>
  );
}

export function AttendanceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading record">
      <Sk className="h-[220px] rounded-[26px]" />
      <Sk className="h-[200px]" />
    </div>
  );
}

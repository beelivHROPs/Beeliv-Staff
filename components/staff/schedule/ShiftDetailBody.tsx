"use client";

import { useMemo } from "react";
import { CircleAlert, Search } from "@/components/applicant/icons";
import { addDays, formatClockRange, todayISO } from "@/lib/staff/format";
import { useSchedule } from "@/lib/staff/hooks";
import type { Shift } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { LogIn } from "../icons";
import { ActionPill, Facts, HERO_SURFACE, HeroDeco, Panel, Sk, StateCard } from "../kit";
import { BackCrumb, ShiftTimeline, fullDateLong } from "./parts";

const WORD: Record<Shift["status"], { word: string; dot: string }> = {
  scheduled: { word: "Scheduled", dot: "bg-[#c4b8ff]" },
  updated: { word: "Updated", dot: "bg-[#fcd34d]" },
  cancelled: { word: "Cancelled", dot: "bg-[#fda4af]" },
  completed: { word: "Completed", dot: "bg-[#86efac]" },
};

/** Shift detail (brief section 7): date, time, outlet, location, role, instructions, plus the shift's events. */
export function ShiftDetailBody({ shiftId }: { shiftId: string }) {
  const today = todayISO();
  // Same window as the Schedule page; the shift is looked up client-side.
  const range = useMemo(() => ({ from: addDays(today, -60), to: addDays(today, 90) }), [today]);
  const { data, status, retry } = useSchedule(range);
  const shift: Shift | null = data?.find((s) => s.id === shiftId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1120px] pt-1 pb-2">
      <BackCrumb href="/staff/schedule">Schedule</BackCrumb>
      {status === "loading" ? (
        <ShiftDetailSkeleton />
      ) : status === "error" ? (
        <ErrorPanel title="We couldn't load this shift" retry={retry} />
      ) : !shift ? (
        <StateCard
          icon={Search}
          title="Shift not found"
          text="This shift doesn't exist any more, or it isn't part of your schedule."
          action={
            <ActionPill href="/staff/schedule" variant="purple" compact arrow={false} className="w-full justify-center">
              Back to Schedule
            </ActionPill>
          }
        />
      ) : (
        <Detail s={shift} isToday={shift.date === today} />
      )}
    </div>
  );
}

function Detail({ s, isToday }: { s: Shift; isToday: boolean }) {
  const w = WORD[s.status];
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Shift" className={`${HERO_SURFACE} p-5 min-[768px]:p-7`}>
        <HeroDeco />
        <p className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">
          <span className={`size-2 rounded-full ${w.dot}`} aria-hidden="true" />
          {isToday ? `Today · ${w.word}` : w.word}
        </p>
        <h1 className="mt-3 text-[30px] leading-tight font-bold tabular-nums min-[768px]:text-[38px]">{formatClockRange(s.startTime, s.endTime)}</h1>
        <p className="mt-1 text-[16px] text-white/85">{fullDateLong(s.date)}</p>
        {s.status === "updated" || s.status === "cancelled" ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white/12 px-3.5 py-2.5 text-[15px] text-white/92">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {s.status === "updated" ? "This shift was updated. Check the time and details below." : "This shift has been cancelled."}
          </p>
        ) : null}
        {isToday && s.status !== "cancelled" ? (
          <ActionPill icon={LogIn} href="/staff/attendance" fit className="mt-6 max-[767px]:w-full">
            Go to Attendance
          </ActionPill>
        ) : null}
      </section>

      <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] min-[1000px]:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Where and what">
            <Facts
              rows={[
                ["Client", s.client],
                ["Outlet", s.outlet],
                ["Location", s.location],
                ["Role", s.role],
                ["Section", s.section],
              ]}
            />
          </Panel>
          {s.notes ? (
            <Panel title="Instructions">
              <p className="text-[16px] leading-relaxed text-(--ap-ink-2)">{s.notes}</p>
            </Panel>
          ) : null}
        </div>
        {s.agenda.length ? (
          <Panel title="Shift events">
            <ShiftTimeline events={s.agenda} />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

export function ShiftDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading shift">
      <Sk className="h-[220px] rounded-[26px]" />
      <div className="grid grid-cols-1 gap-5 min-[1000px]:grid-cols-2">
        <Sk className="h-[260px]" />
        <Sk className="h-[260px]" />
      </div>
    </div>
  );
}

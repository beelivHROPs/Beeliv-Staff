"use client";

/**
 * Staff Home on desktop (1000px and up): calm and short, only what matters today.
 * Left: the Today hero (the one strong colour block) and the next few shifts.
 * Right: the single most urgent item (only when something is owed), the hours card and a compact leave card.
 * Everything else lives on its own page (attendance, news, assignment, documents, SOPs, help).
 * Every value comes from the existing hooks and home snapshot. Phones keep HomeMobile.
 */
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { ChevronRight } from "@/components/applicant/icons";
import { formatClock, longDate, todayISO } from "@/lib/staff/format";
import { useSchedule } from "@/lib/staff/hooks";
import type { Shift, ShiftStatus, StaffHome } from "@/lib/staff/types";
import { Dot, Panel, Ring, Sk } from "../kit";
import { LeaveStatusChip, rangeLabel } from "../leave/leave-meta";
import { Greeting, NeedsYou, TodayCard, WeekCard, useRange } from "./HomeMobile";

const ROW = "flex items-center gap-3.5 py-3 first:pt-0 last:pb-0";

function SeeAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center gap-1 text-[14px] font-bold whitespace-nowrap text-(--ap-violet) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
      {children} <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

const SHIFT_DOT: Record<ShiftStatus, { tone: "ok" | "warn" | "info" | "mute" | "rose"; word: string }> = {
  scheduled: { tone: "info", word: "Scheduled" },
  updated: { tone: "warn", word: "Updated" },
  cancelled: { tone: "rose", word: "Cancelled" },
  completed: { tone: "ok", word: "Done" },
};

/** A day tile (weekday over day number). */
function DayTile({ date }: { date: string }) {
  const d = longDate(date).split(" ");
  return (
    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[14px] bg-(--ap-tint) leading-none text-(--ap-violet)" aria-hidden="true">
      <span className="text-[12px] font-semibold uppercase">{d[0]}</span>
      <b className="mt-0.5 text-[18px] tabular-nums">{d[1]}</b>
    </span>
  );
}

function Upcoming({ shifts, limit = 4 }: { shifts: Shift[]; limit?: number }) {
  const today = todayISO();
  const next = shifts.filter((s) => s.date > today).slice(0, limit);
  return (
    <Panel title="Upcoming shifts" aside={<SeeAll href="/staff/schedule">View schedule</SeeAll>}>
      {next.length === 0 ? (
        <p className="text-[16px] text-(--ap-muted)">Nothing else is scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-(--ap-line-2)">
          {next.map((s) => {
            const st = SHIFT_DOT[s.status];
            return (
              <li key={s.id}>
                <Link href={`/staff/schedule/${s.id}`} className={`${ROW} rounded-xl focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none`}>
                  <DayTile date={s.date} />
                  <span className="min-w-0 flex-1 leading-snug">
                    <b className="block text-[16px] text-(--ap-ink) tabular-nums">
                      {formatClock(s.startTime)} – {formatClock(s.endTime)}
                    </b>
                    <span className="block truncate text-[14px] text-(--ap-muted)">
                      {s.section} · {s.outlet}
                    </span>
                  </span>
                  <Dot tone={st.tone}>{st.word}</Dot>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function LeaveCard({ home }: { home: StaffHome }) {
  const s = home.leaveSummary;
  const next = home.leave.find((l) => l.status !== "cancelled" && l.status !== "rejected") ?? null;
  const total = s ? s.remaining + s.used : 0;
  return (
    <Panel title="Leave" aside={<SeeAll href="/staff/leave">View all</SeeAll>}>
      <div className="flex items-center gap-4">
        {s ? (
          <Ring value={total ? s.remaining / total : 0} size={72} stroke={7} label={`${s.remaining} of ${total} ${s.unit} left`}>
            <b className="text-[22px] leading-none text-(--ap-ink) tabular-nums">{s.remaining}</b>
          </Ring>
        ) : null}
        <div className="min-w-0 flex-1 leading-snug">
          {s ? <b className="block text-[16px] text-(--ap-ink)">{s.unit} left</b> : null}
          {next ? (
            <span className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-[14px] text-(--ap-muted) tabular-nums">{rangeLabel(next)}</span>
              <LeaveStatusChip status={next.status} />
            </span>
          ) : (
            <span className="text-[14px] text-(--ap-muted)">No requests yet</span>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function HomeDesktopSkeleton() {
  return (
    <div className="mx-auto hidden w-full max-w-[1120px] gap-6 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
      <div className="col-span-2 flex flex-col gap-2">
        <Sk className="h-4 w-32" />
        <Sk className="h-9 w-56" />
      </div>
      <div className="flex flex-col gap-5">
        <Sk className="h-[300px] rounded-[26px]" />
        <Sk className="h-[330px]" />
      </div>
      <div className="flex flex-col gap-5">
        <Sk className="h-[250px] rounded-[26px]" />
        <Sk className="h-[130px]" />
      </div>
    </div>
  );
}

export function HomeDesktop({ home }: { home: StaffHome }) {
  const r = useRange();
  // The hours card reads the week/month range; Upcoming uses the snapshot's own upcoming list.
  const { data } = useSchedule({ from: r.from, to: r.to });
  const shifts = useMemo(() => data ?? [], [data]);
  return (
    <div className="mx-auto w-full max-w-[1120px] gap-6 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_380px] min-[1000px]:items-start">
      <div className="min-[1000px]:col-span-2">
        <Greeting home={home} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {/* Order (project lead, 2026-10-25): Today hero, the action needed directly beneath it, then upcoming shifts. */}
        <TodayCard home={home} />
        <NeedsYou home={home} />
        <Upcoming shifts={home.upcoming} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        {/* "Your hours" sits beside the Today hero. */}
        <WeekCard shifts={shifts} r={r} />
        <LeaveCard home={home} />
      </div>
    </div>
  );
}

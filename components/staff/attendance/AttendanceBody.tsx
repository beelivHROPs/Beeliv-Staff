"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { dayNumber, formatDateTimeClock, weekday, dayMonth } from "@/lib/staff/format";
import type { AttendanceRecord } from "@/lib/staff/types";
import { History } from "../icons";
import { ActionPill, Dot, PANEL, Sk, StateCard } from "../kit";
import { AttendancePhone } from "./AttendancePhone";
import { AttendanceDesktop } from "./AttendanceDesktop";

/**
 * Attendance (brief section 8). The backend reports the state; this screen
 * only shows it and offers the contextual action. It does NOT decide how
 * attendance is verified (GPS/QR/selfie...), lateness, grace periods, absence
 * or corrections - those arrive with the backend.
 *
 * One layout at every width (AttendancePhone): the gradient hero with the week
 * and the one action, then recent days. Desktop puts them side by side.
 */
export function AttendanceBody() {
  return (
    <>
      <div className="min-[1000px]:hidden">
        <AttendancePhone />
      </div>
      <div className="max-[999px]:hidden">
        <AttendanceDesktop />
      </div>
    </>
  );
}

/* ---------- History ---------- */

function HistoryRow({ r }: { r: AttendanceRecord }) {
  return (
    <li className="border-t border-(--ap-line-2) first:border-t-0 min-[1000px]:[&:nth-child(2)]:border-t-0 min-[1000px]:even:border-l">
      <Link href={`/staff/attendance/${r.id}`} className="flex min-h-[72px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-(--ap-tint-soft) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset">
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)" aria-hidden="true">
          <span className="text-[11px] leading-none font-bold uppercase">{weekday(r.date).slice(0, 3)}</span>
          <b className="mt-0.5 text-[17px] leading-none tabular-nums">{dayNumber(r.date)}</b>
        </span>
        <span className="min-w-0 flex-1 leading-snug">
          <b className="block text-[16px] text-(--ap-ink)">{dayMonth(r.date)}</b>
          <span className="block text-[14px] text-(--ap-ink-2) tabular-nums">
            {r.checkedInAt ? formatDateTimeClock(r.checkedInAt) : "No check-in"} to {r.checkedOutAt ? formatDateTimeClock(r.checkedOutAt) : "no check-out"}
          </span>
        </span>
        <RecordChip status={r.status} />
        <ChevronRight className="size-[18px] shrink-0 text-(--ap-faint)" aria-hidden="true" />
      </Link>
    </li>
  );
}

type StatusFilter = "all" | "attention" | "recorded";
const PAGE = 10;

function monthLabel(ym: string) {
  return new Date(`${ym}-15T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Month and status dropdowns + counts + "show more", so every record is reachable however long the history gets. */
export function HistoryList({ records }: { records: AttendanceRecord[] }) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const months = Array.from(new Set(sorted.map((r) => r.date.slice(0, 7))));
  const [month, setMonth] = useState<string>("all");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [shown, setShown] = useState(PAGE);

  const inMonth = month === "all" ? sorted : sorted.filter((r) => r.date.startsWith(month));
  const counts = {
    recorded: inMonth.filter((r) => r.status === "recorded").length,
    attention: inMonth.filter((r) => r.status === "attention").length,
    noShift: inMonth.filter((r) => r.status === "no-shift").length,
  };
  const visible = filter === "all" ? inMonth : inMonth.filter((r) => (filter === "attention" ? r.status === "attention" : r.status === "recorded"));
  const page = visible.slice(0, shown);

  const pick = (m: string) => {
    setMonth(m);
    setShown(PAGE);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1 min-[1000px]:max-w-[560px]">
        <div>
          <label htmlFor="att-month" className="mb-1.5 block text-[14px] text-(--ap-muted)">
            Month
          </label>
          <SelectMenu id="att-month" value={month} options={[{ value: "all", label: "All records" }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} onChange={pick} className="h-12! text-[15px]!" />
        </div>
        <div>
          <label htmlFor="att-status" className="mb-1.5 block text-[14px] text-(--ap-muted)">
            Status
          </label>
          <SelectMenu
            id="att-status"
            value={filter}
            options={[
              { value: "all", label: "All statuses" },
              { value: "recorded", label: "Recorded" },
              { value: "attention", label: "Needs attention" },
            ]}
            onChange={(v) => {
              setFilter(v as StatusFilter);
              setShown(PAGE);
            }}
            className="h-12! text-[15px]!"
          />
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]" aria-label="Summary for the selected period">
        <Dot tone="ok">{counts.recorded} recorded</Dot>
        <Dot tone="warn">{counts.attention} needs a look</Dot>
        <Dot tone="mute">{counts.noShift} no shift</Dot>
      </p>

      {page.length === 0 ? (
        <StateCard icon={History} title="No records here" text="Nothing matches this month and status. Try another month or choose All." />
      ) : (
        <ul className={`${PANEL} overflow-hidden min-[1000px]:grid min-[1000px]:grid-cols-2`}>
          {page.map((r) => (
            <HistoryRow key={r.id} r={r} />
          ))}
        </ul>
      )}

      {visible.length > shown ? (
        <ActionPill variant="outline" compact arrow={false} className="w-full justify-center" onClick={() => setShown((n) => n + PAGE)}>
          Show more ({visible.length - shown} left)
        </ActionPill>
      ) : visible.length > PAGE ? (
        <p className="text-center text-[14px] text-(--ap-muted)">That&apos;s all {visible.length} records.</p>
      ) : null}
    </div>
  );
}

export function RecordChip({ status }: { status: AttendanceRecord["status"] }) {
  if (status === "attention") return <Dot tone="warn">Needs a look</Dot>;
  if (status === "no-shift") return <Dot tone="mute">No shift</Dot>;
  return <Dot tone="ok">Recorded</Dot>;
}

export function AttendanceLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8" aria-busy="true" aria-label="Loading attendance">
      <h1 className="sr-only">Attendance</h1>
      <Sk className="h-[400px] rounded-[26px]" />
      <div className="flex flex-col gap-5">
        <Sk className="h-6 w-40" />
        <Sk className="h-[260px]" />
      </div>
    </div>
  );
}

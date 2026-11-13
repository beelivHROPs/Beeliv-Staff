"use client";

/**
 * Attendance on desktop (1000px and up): a month calendar with hours and status per day, a table of
 * the days (in, out, hours, status, note), and a side column with today's state and the one check
 * in / out pill. The backend decides the state; nothing here verifies attendance, lateness or corrections.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/applicant/icons";
import { dayMonth, formatClock, formatDateTimeClock, parseDate, todayISO, toISODate, weekday } from "@/lib/staff/format";
import { useAttendanceHistory, useTodayAttendance } from "@/lib/staff/hooks";
import type { AttendanceRecord, TodayAttendance } from "@/lib/staff/types";
import { ErrorPanel } from "../ErrorPanel";
import { LogIn } from "../icons";
import { runClock } from "../home/HomeHero";
import { ActionPill, Dot, Facts, PANEL, Panel, Sk } from "../kit";

function worked(r: AttendanceRecord): number {
  if (!r.checkedInAt || !r.checkedOutAt) return 0;
  return Math.max(0, (new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 3_600_000);
}
const fmtH = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));

function stateLine(t: TodayAttendance): { label: string; sub: string; action: "in" | "out" | null; disabled: boolean } {
  const s = t.shift;
  switch (t.state) {
    case "upcoming":
      return { label: "Shift later today", sub: s ? `Check-in opens before ${formatClock(s.startTime)}.` : "Your shift is coming up.", action: "in", disabled: true };
    case "ready":
      return { label: "Ready to check in", sub: s ? `Your shift starts at ${formatClock(s.startTime)}.` : "", action: "in", disabled: false };
    case "checked-in":
      return { label: "On shift", sub: t.checkedInAt ? `Checked in at ${formatDateTimeClock(t.checkedInAt)}.` : "You're on shift.", action: "out", disabled: false };
    case "checked-out":
      return { label: "Done for today", sub: t.checkedOutAt ? `Checked out at ${formatDateTimeClock(t.checkedOutAt)}. Thank you.` : "Thank you for today.", action: null, disabled: false };
    case "attention":
      return { label: "Needs a look", sub: t.attentionReason ?? "Something needs a quick look.", action: null, disabled: false };
    default:
      return { label: "No shift today", sub: "You're off today. Nothing to check in for.", action: null, disabled: false };
  }
}

export function AttendanceDesktop() {
  const hist = useAttendanceHistory();
  const today = useTodayAttendance();
  const [offset, setOffset] = useState(0);
  const now = parseDate(todayISO());
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const ym = toISODate(first).slice(0, 7);
  const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const records = useMemo(() => [...(hist.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [hist.data]);
  const inMonth = records.filter((r) => r.date.startsWith(ym));
  const byDate = new Map(inMonth.map((r) => [r.date, r]));
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: dim }, (_, i) => toISODate(new Date(first.getFullYear(), first.getMonth(), i + 1)))];
  const total = inMonth.reduce((n, r) => n + worked(r), 0);
  const attention = inMonth.filter((r) => r.status === "attention").length;
  const arrow = "inline-flex size-11 items-center justify-center rounded-full bg-(--ap-surface,#fff) text-(--ap-violet) shadow-[inset_0_0_0_1px_var(--ap-line)] transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

  if (hist.status === "loading") {
    return (
      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-[minmax(0,1fr)_340px] gap-6 pt-2" aria-busy="true" aria-label="Loading attendance">
        <h1 className="sr-only">Attendance</h1>
        <Sk className="h-[360px]" />
        <Sk className="h-[300px]" />
      </div>
    );
  }
  if (hist.status === "error") {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">Attendance</h1>
        <ErrorPanel title="We couldn't load your attendance" retry={hist.retry} />
      </div>
    );
  }

  const st = today.data ? stateLine(today.data) : null;
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink)">Attendance</h1>
        <div className="flex items-center gap-3">
          <button type="button" className={arrow} aria-label="Previous month" onClick={() => setOffset(offset - 1)}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <b className="min-w-[140px] text-center text-[16px] text-(--ap-ink)">{monthName}</b>
          <button type="button" className={arrow} aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-label={`Calendar for ${monthName}`} className={`${PANEL} p-4`}>
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[13px] font-semibold text-(--ap-muted)" aria-hidden="true">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                if (!d) return <span key={`b${i}`} />;
                const r = byDate.get(d);
                const hrs = r ? worked(r) : 0;
                const isToday = d === todayISO();
                const tone = !r ? "" : r.status === "attention" ? "bg-(--ap-warn-bg)" : "bg-(--ap-ok-bg)";
                const cell = (
                  <>
                    <b className="text-[15px] text-(--ap-ink) tabular-nums">{Number(d.slice(8))}</b>
                    <span className="text-[12px] font-semibold text-(--ap-ink-2) tabular-nums">{r ? (hrs ? `${fmtH(Math.round(hrs * 10) / 10)}h` : "Check") : ""}</span>
                  </>
                );
                const cls = `flex h-[58px] flex-col items-center justify-center rounded-2xl ${tone} ${isToday ? "ring-2 ring-[#c1ac75]" : ""}`;
                return r ? (
                  <Link key={d} href={`/staff/attendance/${r.id}`} aria-label={`${dayMonth(d)}, ${hrs ? `${fmtH(Math.round(hrs * 10) / 10)} hours` : "needs a look"}`} className={`${cls} focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none`}>
                    {cell}
                  </Link>
                ) : (
                  <span key={d} className={`${cls} opacity-80`}>
                    {cell}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
              <Dot tone="ok">Recorded</Dot>
              <Dot tone="warn">Needs a look</Dot>
            </p>
          </section>

          {/* Every column wraps at word breaks (times stay on one line), so nothing is cut off at the panel edge. */}
          <section aria-labelledby="att-days" className={`${PANEL} overflow-hidden`}>
            <h2 id="att-days" className="px-5 pt-5 pb-3 text-[18px] font-bold text-(--ap-ink)">
              Days in {monthName.split(" ")[0]}
            </h2>
            {inMonth.length === 0 ? (
              <p className="px-5 pb-5 text-[16px] text-(--ap-muted)">No check-ins this month.</p>
            ) : (
              <table className="w-full text-left text-[15px]">
                <thead className="border-y border-(--ap-line-2) text-[13px] font-semibold text-(--ap-muted)">
                  <tr>
                    <th scope="col" className="py-2.5 pr-3 pl-5 font-semibold">Date</th>
                    <th scope="col" className="py-2.5 pr-3 font-semibold">In</th>
                    <th scope="col" className="py-2.5 pr-3 font-semibold">Out</th>
                    <th scope="col" className="py-2.5 pr-3 font-semibold">Hours</th>
                    <th scope="col" className="py-2.5 pr-3 font-semibold">Status</th>
                    <th scope="col" className="py-2.5 pr-5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {inMonth.map((r) => (
                    <tr key={r.id} className="border-b border-(--ap-line-2) last:border-b-0 hover:bg-(--ap-tint-soft)">
                      <td className="py-3 pr-3 pl-5 whitespace-nowrap">
                        <Link href={`/staff/attendance/${r.id}`} className="font-bold text-(--ap-ink) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                          {weekday(r.date)} {dayMonth(r.date)}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-(--ap-ink-2)">{r.checkedInAt ? formatDateTimeClock(r.checkedInAt) : "None"}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-(--ap-ink-2)">{r.checkedOutAt ? formatDateTimeClock(r.checkedOutAt) : "None"}</td>
                      <td className="py-3 pr-3 leading-snug font-semibold text-(--ap-ink)">{worked(r) ? `${fmtH(Math.round(worked(r) * 10) / 10)} hrs` : "Not complete"}</td>
                      <td className="py-3 pr-3 leading-snug">{r.status === "attention" ? <Dot tone="warn">Needs a look</Dot> : r.status === "recorded" ? <Dot tone="ok">Recorded</Dot> : <Dot tone="mute">No shift</Dot>}</td>
                      <td className="py-3 pr-5 text-[14px] leading-snug text-(--ap-muted)">{r.status === "attention" && !r.checkedOutAt ? "Check-out missing" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {st ? (
            <Panel title="Today">
              <p className="leading-snug">
                <b className="block text-[20px] text-(--ap-ink)">{st.label}</b>
                {st.sub ? <span className="mt-1 block text-[15px] text-(--ap-ink-2)">{st.sub}</span> : null}
              </p>
              {st.action && today.data?.shift ? (
                <ActionPill icon={LogIn} variant="dark" disabled={st.disabled} className="mt-4" onClick={() => runClock(st.action as "in" | "out", today.data?.shift ?? null)}>
                  {st.action === "in" ? "Check in" : "Check out"}
                </ActionPill>
              ) : null}
            </Panel>
          ) : null}
          <Panel title={monthName.split(" ")[0]}>
            <Facts rows={[["Days recorded", String(inMonth.length)], ["Hours worked", `${fmtH(Math.round(total * 10) / 10)} hrs`], ["Need a look", String(attention)]]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

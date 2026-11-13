"use client";

/**
 * Attendance on phones (below 768px). One gradient card: where you are today, the hours you have
 * worked this week as a big number with seven small day bars, and the one action (check in / out).
 * Under it, the latest days as a quiet list. The backend still decides the state; nothing here
 * verifies attendance, lateness or corrections. Tablet and desktop keep the existing layout.
 */
import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, CircleAlert, LogOut, MapPin } from "@/components/applicant/icons";
import { addDays, dayMonth, dayNumber, formatClock, formatDateTimeClock, parseDate, todayISO, weekday } from "@/lib/staff/format";
import { useAttendanceHistory, useTodayAttendance } from "@/lib/staff/hooks";
import type { AttendanceRecord, TodayAttendance } from "@/lib/staff/types";
import { CircleCheck, History, LogIn } from "../icons";
import { runClock } from "../home/HomeHero";
import { ActionPill, HERO_SURFACE, HeroDeco, LIFT, Sk, StateCard } from "../kit";

const fmtH = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));

function workedHours(r: AttendanceRecord): number {
  if (!r.checkedInAt || !r.checkedOutAt) return 0;
  return Math.max(0, (new Date(r.checkedOutAt).getTime() - new Date(r.checkedInAt).getTime()) / 3_600_000);
}

/** Plain-words state for the top of the card. */
function describe(t: TodayAttendance) {
  const shift = t.shift;
  switch (t.state) {
    case "upcoming":
      return { label: "Shift later today", sub: shift ? `Check-in opens before ${formatClock(shift.startTime)}.` : "Your shift is coming up.", action: "in" as const, disabled: true };
    case "ready":
      return { label: "Ready to check in", sub: shift ? `Your shift starts at ${formatClock(shift.startTime)}.` : "", action: "in" as const, disabled: false };
    case "checked-in":
      return { label: "On shift", sub: t.checkedInAt ? `Checked in at ${formatDateTimeClock(t.checkedInAt)}.` : "You're on shift.", action: "out" as const, disabled: false };
    case "checked-out":
      return { label: "Done for today", sub: t.checkedOutAt ? `Checked out at ${formatDateTimeClock(t.checkedOutAt)}. Thank you.` : "Thank you for today.", action: null, disabled: false };
    case "attention":
      return { label: "Needs a look", sub: t.attentionReason ?? "Something needs a quick look.", action: null, disabled: false };
    default:
      return { label: "No shift today", sub: "You're off today. Nothing to check in for.", action: null, disabled: false };
  }
}

/**
 * This week, Monday to Sunday: hours above each bar (a dash when nothing is recorded),
 * the day name under it, today marked, and one plain sentence under the row so the
 * chart never needs explaining.
 */
function HoursBars({ records, today }: { records: AttendanceRecord[]; today: string }) {
  const monday = addDays(today, -((parseDate(today).getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const hrs = Math.round(records.filter((r) => r.date === d).reduce((n, r) => n + workedHours(r), 0) * 10) / 10;
    return { d, hrs };
  });
  const total = Math.round(days.reduce((n, x) => n + x.hrs, 0) * 10) / 10;
  const max = Math.max(8, ...days.map((x) => x.hrs));
  const latest = [...days].reverse().find((x) => x.hrs > 0);
  const sentence = latest ? `${fmtH(latest.hrs)} ${latest.hrs === 1 ? "hr" : "hrs"} on ${latest.d === today ? "today" : parseDate(latest.d).toLocaleDateString("en-GB", { weekday: "long" })}.` : "No hours recorded yet this week.";
  return (
    <>
      <p className="mt-1 tabular-nums">
        <span className="text-[44px] leading-none font-bold">{total > 0 ? fmtH(total) : "0"}</span>
        <span className="ml-1.5 text-[16px] font-semibold text-white/85">hrs this week</span>
      </p>
      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Hours worked each day this week, Monday to Sunday">
        {days.map(({ d, hrs }) => {
          const now = d === today;
          return (
            <li key={d} className="flex flex-col items-center gap-1.5" aria-label={`${weekday(d)}: ${hrs > 0 ? `${fmtH(hrs)} hours` : "no hours"}`}>
              <span className={`text-[14px] font-bold tabular-nums ${hrs > 0 ? "text-white" : "text-white/55"}`} aria-hidden="true">
                {hrs > 0 ? fmtH(hrs) : "–"}
              </span>
              <div className="flex h-[52px] w-full items-end justify-center" aria-hidden="true">
                <span className={`block w-full max-w-[26px] rounded-full ${hrs > 0 ? (now ? "bg-[#e8d9a8]" : "bg-white/85") : "bg-white/22"}`} style={{ height: hrs > 0 ? Math.max(14, Math.round((hrs / max) * 52)) : 8 }} />
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${now ? "bg-white text-(--ap-plum,#292052)" : "text-white/78"}`} aria-hidden="true">
                {weekday(d).slice(0, 3)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[15px] text-white/90">{sentence}</p>
    </>
  );
}

function StatusWord({ s }: { s: AttendanceRecord["status"] }) {
  const m = s === "attention" ? { w: "Needs a look", c: "bg-(--ap-warn)" } : s === "no-shift" ? { w: "No shift", c: "bg-(--ap-faint)" } : { w: "Recorded", c: "bg-(--ap-ok)" };
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-(--ap-ink-2)">
      <span className={`size-2 rounded-full ${m.c}`} aria-hidden="true" />
      {m.w}
    </span>
  );
}

function RecentDays({ records }: { records: AttendanceRecord[] }) {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return (
    <section aria-labelledby="att-recent">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="att-recent" className="text-[18px] font-bold text-(--ap-ink)">
          Recent days
        </h2>
        <Link href="/staff/attendance/history" className="inline-flex h-11 items-center gap-1 text-[14px] font-bold text-(--ap-violet)">
          See all <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className={`overflow-hidden rounded-[22px] bg-(--ap-surface,#fff) ${LIFT}`}>
        {latest.map((r) => {
          const h = workedHours(r);
          return (
            <li key={r.id} className="border-t border-(--ap-line-2) first:border-t-0">
              <Link href={`/staff/attendance/${r.id}`} className="flex min-h-[72px] items-center gap-3.5 px-4 py-3 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)" aria-hidden="true">
                  <span className="text-[11px] leading-none font-bold uppercase">{weekday(r.date).slice(0, 3)}</span>
                  <b className="mt-0.5 text-[17px] leading-none tabular-nums">{dayNumber(r.date)}</b>
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <b className="block text-[16px] text-(--ap-ink)">
                    {dayMonth(r.date)}
                    {h > 0 ? <span className="font-semibold text-(--ap-muted)"> · {fmtH(Math.round(h * 10) / 10)} hrs</span> : null}
                  </b>
                  <span className="block text-[14px] text-(--ap-ink-2) tabular-nums">
                    {r.checkedInAt ? formatDateTimeClock(r.checkedInAt) : "No check-in"} to {r.checkedOutAt ? formatDateTimeClock(r.checkedOutAt) : "no check-out"}
                  </span>
                </span>
                <StatusWord s={r.status} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AttendancePhone() {
  const today = useTodayAttendance();
  const history = useAttendanceHistory();
  const day = useMemo(() => todayISO(), []);

  if (today.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8" aria-busy="true" aria-label="Loading attendance">
        <h1 className="sr-only">Attendance</h1>
        <Sk className="h-[400px] rounded-[26px]" />
        <Sk className="h-6 w-40" />
        <Sk className="h-[220px]" />
      </div>
    );
  }
  if (today.status === "error" || !today.data) {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">Attendance</h1>
        <StateCard
          icon={CircleAlert}
          title="We couldn't load attendance"
          text="Check your connection and try again. Nothing on your account has changed."
          action={
            <ActionPill variant="purple" compact className="w-full" onClick={today.retry}>
              Try again
            </ActionPill>
          }
        />
      </div>
    );
  }

  const t = today.data;
  const d = describe(t);
  const shift = t.shift;
  const records = history.data ?? [];
  const Icon = t.state === "checked-out" ? CircleCheck : t.state === "attention" ? CircleAlert : t.state === "checked-in" ? LogOut : LogIn;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8">
      <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink) max-[767px]:sr-only min-[1000px]:col-span-2">Attendance</h1>
      <section aria-label="Today's attendance" className={`${HERO_SURFACE} p-5 min-[768px]:p-6`}>
        <HeroDeco />
        <p className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">{d.label}</p>
        {d.sub ? <p className="mt-2 text-[16px] text-white/88">{d.sub}</p> : null}
        {shift ? (
          <p className="mt-1 flex items-center gap-1 text-[14px] text-white/78">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {shift.outlet} · {shift.section}
            </span>
          </p>
        ) : null}
        <div className="mt-4">
          <HoursBars records={records} today={day} />
        </div>
        {d.action ? (
          <ActionPill icon={Icon} disabled={d.disabled} onClick={() => runClock(d.action, shift)} className="mt-5">
            {d.action === "in" ? "Check in" : "Check out"}
          </ActionPill>
        ) : t.state === "attention" ? (
          <ActionPill icon={CircleAlert} href="/staff/help" className="mt-5">
            Contact Beeliv
          </ActionPill>
        ) : null}
      </section>

      {history.status === "loading" ? (
        <Sk className="h-[220px]" />
      ) : history.status === "error" ? (
        <StateCard
          icon={CircleAlert}
          title="We couldn't load your recent days"
          text="Check your connection and try again."
          action={
            <ActionPill variant="purple" compact className="w-full" onClick={history.retry}>
              Try again
            </ActionPill>
          }
        />
      ) : records.length === 0 ? (
        <StateCard icon={History} title="No days recorded yet" text="Your check-ins and check-outs will be listed here after your first shift." />
      ) : (
        <RecentDays records={records} />
      )}
    </div>
  );
}

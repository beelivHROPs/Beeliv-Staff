"use client";

/**
 * Calendar-style week view: seven day columns when the container is wide, a
 * stacked day-by-day agenda otherwise (no sideways scroll). Mock-only layout;
 * the Client WeekView is typed to shifts, so this one is built for interviews.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/applicant/icons";
import type { InterviewRow } from "@/lib/admin/interviews/types";
import { METHOD_LABEL } from "@/lib/admin/interviews/types";
import { InterviewStatusChip } from "./ui";

export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return x;
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const dayName = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short" });
const dayNum = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function InterviewWeek({ rows, weekStart, onShift, onToday }: { rows: InterviewRow[]; weekStart: Date; onShift: (weeks: number) => void; onToday: () => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const byDay = days.map((d) => rows.filter((r) => r.at && same(new Date(r.at), d)).sort((a, b) => (a.at ?? "").localeCompare(b.at ?? "")));
  const label = `${dayNum(days[0])} to ${dayNum(days[6])}`;

  return (
    <section aria-label={`Interviews, week of ${label}`} className="@container">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={() => onShift(-1)} aria-label="Previous week" className="ap-btn ap-btn-s ap-btn-sm h-11 min-w-11">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onShift(1)} aria-label="Next week" className="ap-btn ap-btn-s ap-btn-sm h-11 min-w-11">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <p className="px-1 text-[15px] font-bold" aria-live="polite">
          {label}
        </p>
        <button type="button" onClick={onToday} className="ap-btn ap-btn-s ap-btn-sm h-11">
          This week
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 @min-[900px]:grid-cols-7 @min-[900px]:gap-2">
        {days.map((d, i) => {
          const isToday = same(d, today);
          return (
            <div key={i} className={`ap-card min-w-0 rounded-2xl p-3 ${isToday ? "outline-2 -outline-offset-2 outline-(--ap-violet)" : ""}`}>
              <h3 className="mb-2 flex items-baseline gap-2 text-[14px] font-bold">
                <span className={isToday ? "text-(--ap-violet)" : ""}>{dayName(d)}</span>
                <span className="text-[13px] font-normal text-(--ap-muted)">{dayNum(d)}</span>
              </h3>
              {byDay[i].length === 0 ? (
                <p className="text-[13px] text-(--ap-faint)">Nothing booked</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {byDay[i].map((r) => (
                    <li key={r.id} className="rounded-xl border border-(--ap-line) bg-(--ap-tint-soft) p-2.5">
                      <p className="text-[13px] font-bold text-(--ap-violet) tabular-nums">{r.at ? clock(r.at) : ""}</p>
                      <Link href={`/admin/recruitment/interviews/${r.id}`} className="block text-[14px] leading-snug font-bold break-words text-(--ap-ink) hover:text-(--ap-violet)">
                        {r.candidateName}
                      </Link>
                      <p className="text-[13px] leading-snug break-words text-(--ap-muted)">
                        {r.stageName}
                        {r.method ? `, ${METHOD_LABEL[r.method]}` : ""}
                      </p>
                      <p className="mb-1.5 text-[13px] break-words text-(--ap-muted)">{r.interviewer?.name ?? "No interviewer"}</p>
                      <InterviewStatusChip status={r.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const weekRange = (start: Date) => ({ from: start.toISOString(), to: addDays(start, 7).toISOString() });

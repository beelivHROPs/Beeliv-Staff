"use client";

import { useAttendanceHistory } from "@/lib/staff/hooks";
import { ErrorPanel } from "../ErrorPanel";
import { History } from "../icons";
import { Sk, StateCard } from "../kit";
import { BackCrumb } from "../schedule/parts";
import { HistoryList } from "./AttendanceBody";

/** Full attendance history: month and status filters, counts and every record. */
export function AttendanceHistoryBody() {
  const history = useAttendanceHistory();
  return (
    <div className="w-full pt-1 pb-2">
      <BackCrumb href="/staff/attendance">Attendance</BackCrumb>
      <h1 className="mb-1 text-[28px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[32px]">Attendance history</h1>
      <p className="mb-5 text-[16px] text-(--ap-muted)">Every check-in and check-out, by month.</p>
      {history.status === "loading" ? (
        <Sk className="h-[360px]" aria-busy="true" />
      ) : history.status === "error" ? (
        <ErrorPanel title="We couldn't load your history" retry={history.retry} />
      ) : history.status === "empty" || !history.data ? (
        <StateCard icon={History} title="No attendance records yet" text="Your check-ins and check-outs are listed here after your first shift." />
      ) : (
        <HistoryList records={history.data} />
      )}
    </div>
  );
}

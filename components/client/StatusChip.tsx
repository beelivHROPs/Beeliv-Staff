import type { ReactNode } from "react";
import type { AttendanceStatus } from "@/lib/client/types";

/**
 * Status pill in the shared semantic colours (green / amber / red / blue),
 * written with tokens so it is correct in light and dark mode. The Applicant
 * `Chip` has no red tone, which Client needs for "Absent".
 */
const TONE = {
  ok: "bg-(--ap-ok-bg) text-(--ap-ok)",
  warn: "bg-(--ap-warn-bg) text-(--ap-warn)",
  bad: "bg-(--ap-rose-bg) text-(--ap-rose)",
  info: "bg-(--ap-info-bg) text-(--ap-info)",
  plum: "bg-(--ap-tint) text-(--ap-violet)",
  mute: "bg-(--ap-line-2) text-(--ap-muted)",
} as const;
export type ChipTone = keyof typeof TONE;

export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

const ATTENDANCE_TONE: Record<AttendanceStatus, ChipTone> = { present: "ok", late: "warn", absent: "bad", "on-leave": "info" };
const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = { present: "Present", late: "Late", absent: "Absent", "on-leave": "On leave" };

export function AttendanceChip({ status }: { status: AttendanceStatus }) {
  return <StatusChip tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_LABEL[status]}</StatusChip>;
}

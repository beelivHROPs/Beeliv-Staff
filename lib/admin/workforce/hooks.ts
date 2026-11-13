"use client";

/** Workforce hooks. `{ data, status, retry, setData }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { AttendanceDetail, AttendancePage, AttendanceQuery, LeavePage, LeaveQuery, SchedulePage, ScheduleQuery, StaffLeaveHistory, TimeOffQuery, TimeOffResult, WarningDetail, WarningsPage, WarningsQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  /** Replace the data after a write returns the fresh record. */
  setData: (d: T) => void;
}

/** `deps` encodes every input `load` closes over; a change re-runs the load. */
function useLoad<T>(load: () => Promise<T | null>, deps: string, isEmpty: (d: T | null) => boolean): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => service.subscribeWorkforce(() => setResetVer((v) => v + 1)), []);
  useEffect(() => {
    let cancelled = false;
    latest.current().then(
      (data) => !cancelled && setResult({ key, data, failed: null }),
      (e: unknown) => !cancelled && setResult({ key, data: null, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const setData = useCallback((d: T) => setResult({ key, data: d, failed: null }), [key]);
  if (!result || result.key !== key) return { data: null, status: "loading", retry, setData };
  if (result.failed) return { data: null, status: result.failed, retry, setData };
  return { data: result.data, status: isEmpty(result.data) ? "empty" : "ready", retry, setData };
}

export const useAttendance = (q: AttendanceQuery): Live<AttendancePage> => useLoad(() => service.listAttendance(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useAttendanceRecord = (id: string): Live<AttendanceDetail> => useLoad(() => service.getAttendance(id), id, (d) => d === null);
export const useLeave = (q: LeaveQuery): Live<LeavePage> => useLoad(() => service.listLeave(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useTimeOff = (q: TimeOffQuery): Live<TimeOffResult> => useLoad(() => service.listTimeOff(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useStaffLeaveHistory = (staffId: string): Live<StaffLeaveHistory> => useLoad(() => service.getStaffLeaveHistory(staffId), staffId, (d) => d === null);
export const useSchedule = (q: ScheduleQuery): Live<SchedulePage> => useLoad(() => service.getSchedule(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useWarnings = (q: WarningsQuery): Live<WarningsPage> => useLoad(() => service.listWarnings(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useWarning = (id: string): Live<WarningDetail> => useLoad(() => service.getWarning(id), id, (d) => d === null);

export const requestCorrection = service.requestCorrection;
export const approveLeave = service.approveLeave;
export const declineLeave = service.declineLeave;
export const checkShiftConflicts = service.checkShiftConflicts;
export const saveShift = service.saveShift;
export const removeShift = service.removeShift;
export const publishWeek = service.publishWeek;
export const unpublishWeek = service.unpublishWeek;

export const copyLastWeek = service.copyLastWeek;
export const issueWarning = service.issueWarning;
export const withdrawWarning = service.withdrawWarning;

"use client";

/**
 * Staff data hooks. Every hook returns `{ data, status, retry }` where status
 * is "loading" | "ready" | "empty" | "error". Components use these, never the
 * adapter or the mock. Data refreshes quietly after an action ("change") and
 * flips back to loading when the dataset is swapped ("reset").
 *
 * NOTE: hiding UI by entitlement is a convenience only. Real protection is
 * server-side (RLS / route guards) and arrives with the backend.
 */
import { useCallback, useEffect, useState } from "react";
import * as service from "./service";
import type { SopItem } from "./sops/types";
import type {
  Announcement,
  AttendanceRecord,
  DateRange,
  Entitlements,
  LeaveRequest,
  Loadable,
  NavCounts,
  Notification,
  SOPAssignment,
  Shift,
  StaffAssignment,
  StaffDocument,
  StaffEmployment,
  StaffHome,
  StaffPersonalDetails,
  StaffProfile,
  StaffRecord,
  StaffSensitiveStatus,
  TodayAttendance,
  TrainingAssignment,
} from "./types";

type Result<T> = { key: string; data: T | null; failed: boolean };

function useLoad<T>(load: () => Promise<T>, isEmpty: (d: T) => boolean): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [refreshVer, setRefreshVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${attempt}:${resetVer}`;

  useEffect(
    () =>
      service.subscribeStaff((event) => {
        if (event === "reset") setResetVer((v) => v + 1);
        else setRefreshVer((v) => v + 1);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ key, data, failed: false }),
      () => !cancelled && setResult({ key, data: null, failed: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [load, key, refreshVer]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (!result || result.key !== key) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: "error", retry };
  return { data: result.data, status: result.data === null || isEmpty(result.data as T) ? "empty" : "ready", retry };
}

const emptyList = (d: unknown[]) => d.length === 0;
const never = () => false;
const isNull = (d: unknown) => d === null;

export const useStaffHome = (): Loadable<StaffHome> => useLoad(service.getStaffHome, never);
export const useEntitlements = (): Loadable<Entitlements> => useLoad(service.getEntitlements, never);
export const useStaffProfile = (): Loadable<StaffProfile> => useLoad(service.getStaffProfile, never);
export const useNavCounts = (): Loadable<NavCounts> => useLoad(service.getNavCounts, never);
export const useCurrentAssignment = (): Loadable<StaffAssignment | null> => useLoad(service.getCurrentAssignment, isNull);
export const useAssignmentHistory = (): Loadable<StaffAssignment[]> => useLoad(service.getAssignmentHistory, emptyList);
export function useSchedule(range: DateRange): Loadable<Shift[]> {
  const { from, to } = range;
  const load = useCallback(() => service.getSchedule({ from, to }), [from, to]);
  return useLoad(load, emptyList);
}
export const useTodayAttendance = (): Loadable<TodayAttendance> => useLoad(service.getTodayAttendance, never);
export const useAttendanceHistory = (): Loadable<AttendanceRecord[]> => useLoad(service.getAttendanceHistory, emptyList);
export const useLeaveRequests = (): Loadable<LeaveRequest[]> => useLoad(service.getLeaveRequests, emptyList);
export const useStaffDocuments = (): Loadable<StaffDocument[]> => useLoad(service.getStaffDocuments, emptyList);
export const useSOPs = (): Loadable<SOPAssignment[]> => useLoad(service.getSOPs, emptyList);
export const useSopLibrary = (): Loadable<SopItem[]> => useLoad(service.getSopLibrary, emptyList);
export const useTraining = (): Loadable<TrainingAssignment[]> => useLoad(service.getTraining, emptyList);
export const useStaffRecords = (): Loadable<StaffRecord[]> => useLoad(service.getStaffRecords, emptyList);
export const useAnnouncements = (): Loadable<Announcement[]> => useLoad(service.getAnnouncements, emptyList);
export const useNotifications = (): Loadable<Notification[]> => useLoad(service.getNotifications, emptyList);
export const usePersonalDetails = (): Loadable<StaffPersonalDetails> => useLoad(service.getPersonalDetails, never);
export const useEmployment = (): Loadable<StaffEmployment> => useLoad(service.getEmployment, never);
export const useSensitiveStatus = (): Loadable<StaffSensitiveStatus> => useLoad(service.getSensitiveStatus, never);

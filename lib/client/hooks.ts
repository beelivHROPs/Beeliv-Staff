"use client";

/**
 * Client data hooks. Every hook returns `{ data, status, retry }` where status
 * is "loading" | "ready" | "empty" | "error" | "restricted". Components use
 * these, never the adapter or the mock. Every scoped hook reads the selected
 * outlet (lib/client/outlet.ts) and re-fetches when it changes; until the
 * session has resolved a scope they simply report "loading".
 */
import { useCallback, useEffect, useState } from "react";
import { RestrictedError } from "./adapter";
import { useOutletScope } from "./outlet";
import * as service from "./service";
import type {
  ActivityItem,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceTrendPoint,
  CandidateDetail,
  CandidateReview,
  ClientNotification,
  ClientOnboarding,
  ClientOverview,
  ClientSession,
  ComplianceItem,
  ComplianceSummary,
  DepartmentCount,
  ISODate,
  Loadable,
  OutletScope,
  PayrollVisibility,
  RecruitmentSummary,
  ScheduleDay,
  ScheduleView,
  ShiftCoverage,
  WorkforceMember,
  WorkforceMemberDetail,
  WorkforceRequest,
} from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };

/** softNotifications: refetch quietly (keeping current data) when the adapter emits "notifications". */
type Options = { softNotifications?: boolean };

/** Shared loader. `load` must be stable (useCallback) - it is the effect dependency. */
function useLoad<T>(scope: OutletScope | null | undefined, load: (scope: OutletScope) => Promise<T>, isEmpty: (d: T) => boolean, opts: Options = {}): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [softVer, setSoftVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  // A new `load` means a different record id or date range: count it so an older result is never shown for the new query.
  const [loadSeen, setLoadSeen] = useState(() => load);
  const [loadVer, setLoadVer] = useState(0);
  if (load !== loadSeen) {
    setLoadSeen(() => load);
    setLoadVer((v) => v + 1);
  }
  // `undefined` = this hook is not scoped (session); `null` = scope not resolved yet.
  const key = `${scope ?? "-"}:${attempt}:${resetVer}:${loadVer}`;

  const soft = opts.softNotifications === true;
  useEffect(
    () =>
      service.subscribeClient((e) => {
        if (e === "reset") setResetVer((v) => v + 1);
        else if (soft) setSoftVer((v) => v + 1);
      }),
    [soft],
  );

  useEffect(() => {
    if (scope === null) return;
    let cancelled = false;
    load(scope ?? "all").then(
      (data) => !cancelled && setResult({ key, data, failed: null }),
      (e: unknown) => !cancelled && setResult({ key, data: null, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [load, key, scope, softVer]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (scope === null || !result || result.key !== key) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: result.failed, retry };
  return { data: result.data, status: result.data === null || isEmpty(result.data as T) ? "empty" : "ready", retry };
}

const emptyList = (d: unknown[]) => d.length === 0;
const never = () => false;

/** Scoped hook: waits for the outlet scope from the session. */
function useScoped<T>(load: (scope: OutletScope) => Promise<T>, isEmpty: (d: T) => boolean = never, opts?: Options): Loadable<T> {
  return useLoad(useOutletScope(), load, isEmpty, opts);
}

/** The session is not outlet-scoped (it is what defines the scopes). */
export function useClientSession(): Loadable<ClientSession> {
  const load = useCallback(() => service.getSession(), []);
  // Soft refresh: a setup/settings save (e.g. a new profile photo) updates the header avatar without blanking the page.
  return useLoad<ClientSession>(undefined, load, never, { softNotifications: true });
}

export const useOverview = (): Loadable<ClientOverview> => useScoped(service.getOverview);

export function useAttendanceSummary(date: ISODate): Loadable<AttendanceSummary> {
  const load = useCallback((s: OutletScope) => service.getAttendanceSummary(s, date), [date]);
  return useScoped(load, (d) => d.scheduled === 0);
}

export function useAttendanceTrend(from: ISODate, to: ISODate): Loadable<AttendanceTrendPoint[]> {
  const load = useCallback((s: OutletScope) => service.getAttendanceTrend(s, { from, to }), [from, to]);
  return useScoped(load, (d) => d.every((p) => p.scheduled === 0));
}

export const useWorkforceDistribution = (): Loadable<DepartmentCount[]> => useScoped(service.getWorkforceDistribution, (d) => d.every((x) => x.count === 0));

export function useScheduleCoverage(date: ISODate): Loadable<ShiftCoverage[]> {
  const load = useCallback((s: OutletScope) => service.getScheduleCoverage(s, date), [date]);
  return useScoped(load, emptyList);
}

export function useWeekSchedule(weekOf: ISODate): Loadable<ScheduleDay[]> {
  const load = useCallback((s: OutletScope) => service.getWeekSchedule(s, weekOf), [weekOf]);
  return useScoped(load, emptyList);
}

export const useRecruitmentSummary = (): Loadable<RecruitmentSummary> => useScoped(service.getRecruitmentSummary, (d) => d.positions.length === 0 && d.awaitingFeedback === 0, { softNotifications: true });
export const useComplianceSummary = (): Loadable<ComplianceSummary> => useScoped(service.getComplianceSummary, (d) => d.total === 0);
export const usePayrollVisibility = (): Loadable<PayrollVisibility> => useScoped(service.getPayrollVisibility, (d) => d.upcoming.length === 0 && d.history.length === 0);
export const useRecentActivity = (): Loadable<ActivityItem[]> => useScoped(service.getRecentActivity, emptyList);
export const useNotifications = (): Loadable<ClientNotification[]> => useScoped(service.getNotifications, emptyList, { softNotifications: true });

export const useWorkforce = (): Loadable<WorkforceMember[]> => useScoped(service.getWorkforce, emptyList);
export function useAttendanceRecords(from: ISODate, to: ISODate): Loadable<AttendanceRecord[]> {
  const load = useCallback((s: OutletScope) => service.getAttendanceRecords(s, { from, to }), [from, to]);
  return useScoped(load, emptyList);
}
export const useCandidates = (): Loadable<CandidateReview[]> => useScoped(service.getCandidates, emptyList, { softNotifications: true });
export const useWorkforceRequests = (): Loadable<WorkforceRequest[]> => useScoped(service.getWorkforceRequests, emptyList, { softNotifications: true });
export const useDocuments = (): Loadable<ComplianceItem[]> => useScoped(service.getDocuments, emptyList);

export function useCandidate(id: string): Loadable<CandidateDetail | null> {
  const load = useCallback((s: OutletScope) => service.getCandidate(s, id), [id]);
  return useScoped(load, never, { softNotifications: true });
}
export function useWorkforceRequest(id: string): Loadable<WorkforceRequest | null> {
  const load = useCallback((s: OutletScope) => service.getWorkforceRequest(s, id), [id]);
  return useScoped(load, never, { softNotifications: true });
}
const loadReasons = () => service.getWorkforceRequestReasons();
export const useWorkforceRequestReasons = (): Loadable<string[]> => useScoped(loadReasons, emptyList);

/** One staff member's detail. "empty" = not found in the selected scope. */
export function useWorkforceMemberDetail(memberId: string): Loadable<WorkforceMemberDetail> {
  const load = useCallback((s: OutletScope) => service.getWorkforceMemberDetail(s, memberId), [memberId]);
  return useScoped<WorkforceMemberDetail | null>(load) as Loadable<WorkforceMemberDetail>;
}

/** Shifts (with assigned staff) for a date range, plus the backend's edit capability. */
export function useSchedule(from: ISODate, to: ISODate): Loadable<ScheduleView> {
  const load = useCallback((s: OutletScope) => service.getSchedule(s, { from, to }), [from, to]);
  return useScoped(load, (d) => d.shifts.length === 0);
}

/** Setup progress. Refetches quietly after each save (no loading flash). */
export function useOnboarding(): Loadable<ClientOnboarding> {
  const load = useCallback(() => service.getOnboarding(), []);
  return useLoad<ClientOnboarding>(undefined, load, never, { softNotifications: true });
}

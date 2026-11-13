"use client";

/**
 * Admin data hooks. Every hook returns `{ data, status, retry }` where status
 * is "loading" | "ready" | "empty" | "error" | "restricted". Components use
 * these, never the adapter or the mock.
 */
import { useCallback, useEffect, useState } from "react";
import { RestrictedError } from "./adapter";
import * as service from "./service";
import type { AdminNotification, AdminSession, HrOverview, Loadable, NavCounts } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };

/** Shared loader. `load` must be stable (a module function) - it is an effect dependency. */
function useLoad<T>(load: () => Promise<T>, isEmpty: (d: T) => boolean): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${attempt}:${resetVer}`;

  useEffect(() => service.subscribeAdmin(() => setResetVer((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ key, data, failed: null }),
      (e: unknown) => !cancelled && setResult({ key, data: null, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [load, key]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (!result || result.key !== key) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: result.failed, retry };
  return { data: result.data, status: result.data === null || isEmpty(result.data) ? "empty" : "ready", retry };
}

const never = () => false;

export const useAdminSession = (): Loadable<AdminSession> => useLoad(service.getSession, never);
export const useNotifications = (): Loadable<AdminNotification[]> => useLoad(service.getNotifications, (d) => d.length === 0);
export const useNavCounts = (): Loadable<NavCounts> => useLoad(service.getNavCounts, never);

/** Empty = a workspace with no recruitment activity at all (every number zero, nothing to list). */
const overviewIsEmpty = (d: HrOverview) =>
  Object.values(d.metrics).every((n) => n === 0) && d.attention.length === 0 && d.upcomingInterviews.length === 0 && d.recentApplications.length === 0 && d.inbox.latest.length === 0;

export const useHrOverview = (): Loadable<HrOverview> => useLoad(service.getHrOverview, overviewIsEmpty);

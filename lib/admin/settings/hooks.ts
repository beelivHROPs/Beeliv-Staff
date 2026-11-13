"use client";

/** Settings hooks. `{ data, status, retry }`, status: loading | ready | error | restricted. */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RestrictedError } from "../adapter";
import type { Loadable } from "../types";
import * as service from "./service";
import type { AdminAccountSettings, AdminPrefs } from "./types";

type Result = { key: string; data: AdminAccountSettings | null; failed: "error" | "restricted" | null };

export function useAdminAccount(): Loadable<AdminAccountSettings> & { setData: (d: AdminAccountSettings) => void } {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${attempt}:${resetVer}`;

  useEffect(() => service.subscribeSettings(() => setResetVer((v) => v + 1)), []);
  useEffect(() => {
    let cancelled = false;
    service.getAccount().then(
      (data) => !cancelled && setResult({ key, data, failed: null }),
      (e: unknown) => !cancelled && setResult({ key, data: null, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const setData = useCallback((d: AdminAccountSettings) => setResult({ key, data: d, failed: null }), [key]);
  if (!result || result.key !== key) return { data: null, status: "loading", retry, setData };
  if (result.failed) return { data: null, status: result.failed, retry, setData };
  return { data: result.data, status: "ready", retry, setData };
}

/** Device-local workspace preferences. Other Admin screens can import this to honour them. */
export function useAdminPrefs(): AdminPrefs {
  return useSyncExternalStore(service.subscribeAdminPrefs, service.getAdminPrefs, () => service.DEFAULT_ADMIN_PREFS);
}

export const setAdminPrefs = service.setAdminPrefs;
export const saveProfile = service.saveProfile;
export const saveNotifications = service.saveNotifications;
export const changePassword = service.changePassword;
export const revokeSession = service.revokeSession;
export const revokeOtherSessions = service.revokeOtherSessions;

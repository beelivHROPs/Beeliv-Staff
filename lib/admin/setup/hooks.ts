"use client";

/** `{ data, status, retry, setData }`, status: loading | ready | error. */
import { useCallback, useEffect, useState } from "react";
import type { SetupAdapter } from "./adapter";
import type { Loadable } from "../types";
import type { AdminSetup } from "./types";

type Result = { key: string; data: AdminSetup | null; failed: boolean };

/** Admin and Client setup share this read boundary. */
export type SetupReader = Pick<SetupAdapter, "subscribe" | "getSetup">;

export function useSetup(service: SetupReader): Loadable<AdminSetup> & { setData: (d: AdminSetup) => void } {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${attempt}:${resetVer}`;

  useEffect(() => service.subscribe(() => setResetVer((v) => v + 1)), [service]);
  useEffect(() => {
    let cancelled = false;
    service.getSetup().then(
      (data) => !cancelled && setResult({ key, data, failed: false }),
      () => !cancelled && setResult({ key, data: null, failed: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, service]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const setData = useCallback((d: AdminSetup) => setResult({ key, data: d, failed: false }), [key]);
  if (!result || result.key !== key) return { data: null, status: "loading", retry, setData };
  if (result.failed) return { data: null, status: "error", retry, setData };
  return { data: result.data, status: "ready", retry, setData };
}

"use client";

/** Glance hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { GlanceData, GlanceScope } from "./types";

type Result = { key: string; data: GlanceData | null; failed: "error" | "restricted" | null };

/** DEV ONLY: which scope the prototype pretends to be (HR Officer / Operations). */
export const usePreviewScope = (): [GlanceScope, (s: GlanceScope) => void] => [useSyncExternalStore(service.subscribePreviewScope, service.getPreviewScope, () => "hr" as GlanceScope), service.setPreviewScope];

export function useGlance(scope: GlanceScope): { data: GlanceData | null; status: LoadStatus; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${scope}:${attempt}:${resetVer}`;

  useEffect(() => service.subscribeGlance(() => setResetVer((v) => v + 1)), []);
  useEffect(() => {
    let cancelled = false;
    service.getGlance(scope).then(
      (data) => !cancelled && setResult({ key, data, failed: null }),
      (e: unknown) => !cancelled && setResult({ key, data: null, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, scope]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (!result || result.key !== key) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: result.failed, retry };
  return { data: result.data, status: !result.data || result.data.workspaceEmpty ? "empty" : "ready", retry };
}

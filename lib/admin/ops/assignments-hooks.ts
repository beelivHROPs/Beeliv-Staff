"use client";

/**
 * Operations "Clients & HR" hooks. `{ data, status, retry }`, status:
 * loading | ready | empty | error | restricted. `useLoad` is exported so the
 * Operations reports and setup hooks share one implementation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError, type AdapterEvent } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./assignments-service";
import type { AssignmentDetail, AssignmentsPage, AssignmentsQuery } from "./assignments-types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
}

/** `deps` encodes every input `load` closes over; a change (or an adapter "reset" event) re-runs the load. */
export function useLoad<T>(load: () => Promise<T | null>, deps: string, isEmpty: (d: T | null) => boolean, subscribe: (l: (e: AdapterEvent) => void) => () => void): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => subscribe(() => setResetVer((v) => v + 1)), [subscribe]);
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
  if (!result || result.key !== key) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: result.failed, retry };
  return { data: result.data, status: isEmpty(result.data) ? "empty" : "ready", retry };
}

export const useAssignments = (q: AssignmentsQuery): Live<AssignmentsPage> => useLoad(() => service.listAssignments(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty, service.subscribeAssignments);
export const useAssignment = (id: string): Live<AssignmentDetail> => useLoad(() => service.getAssignment(id), id, (d) => d === null, service.subscribeAssignments);

export const assignHr = service.assignHr;
export { ConflictError } from "./adapter";

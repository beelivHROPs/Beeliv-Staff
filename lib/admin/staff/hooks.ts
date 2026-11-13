"use client";

/** Staff data hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { AssignmentsPage, AssignmentsQuery, StaffDetail, StaffDocsPage, StaffDocsQuery, StaffPage, StaffQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
}

function useLoad<T>(load: () => Promise<T | null>, deps: string): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => service.subscribeStaff(() => setResetVer((v) => v + 1)), []);
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
  return { data: result.data, status: result.data === null ? "empty" : "ready", retry };
}

export const useStaffList = (q: StaffQuery): Live<StaffPage> => useLoad(() => service.listStaff(q), JSON.stringify(q));
export const useStaffMember = (id: string): Live<StaffDetail> => useLoad(() => service.getStaff(id), id);
export const useAssignments = (q: AssignmentsQuery): Live<AssignmentsPage> => useLoad(() => service.listAssignments(q), JSON.stringify(q));
export const useStaffDocuments = (q: StaffDocsQuery): Live<StaffDocsPage> => useLoad(() => service.listDocuments(q), JSON.stringify(q));

export const assignStaff = service.assign;

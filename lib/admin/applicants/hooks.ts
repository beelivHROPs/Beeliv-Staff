"use client";

/** Applicants data hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { ApplicantDetail, ApplicantsPage, ApplicantsQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  /** Replace the data (after a write returns the fresh record). */
  setData: (d: T) => void;
}

/** `deps` is a string that encodes every input `load` closes over; a change re-runs the load. */
function useLoad<T>(load: () => Promise<T | null>, deps: string): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => service.subscribeApplicants(() => setResetVer((v) => v + 1)), []);
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
  return { data: result.data, status: result.data === null ? "empty" : "ready", retry, setData };
}

export function useApplicantsList(q: ApplicantsQuery): Live<ApplicantsPage> {
  return useLoad(() => service.listApplicants(q), JSON.stringify(q));
}

export function useApplicant(id: string): Live<ApplicantDetail> {
  return useLoad(() => service.getApplicant(id), id);
}

export const performApplicantAction = service.performAction;
export const addApplicantNote = service.addNote;

"use client";

/**
 * Interviews data hooks. `useResource` is the one fetch-state helper shared by
 * Interviews, Shortlisting and Assessments: `{ data, status, retry, setData }`
 * with status loading | ready | empty | error | restricted. A change of key
 * (query) goes back to loading; the caller may keep showing the previous data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { InterviewDetail, InterviewsPage, InterviewsQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };

export interface Resource<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  /** Replace the data with a fresh value returned by a write (no refetch). */
  setData: (next: T) => void;
}

export function useResource<T>(fetcher: () => Promise<T>, params: unknown, subscribe: (cb: () => void) => () => void, isEmpty: (d: T | null) => boolean): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(fetcher);
  const key = `${JSON.stringify(params)}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = fetcher;
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
  const setData = useCallback((next: T) => setResult({ key, data: next, failed: null }), [key]);
  if (!result || result.key !== key) return { data: null, status: "loading", retry, setData };
  if (result.failed) return { data: null, status: result.failed, retry, setData };
  return { data: result.data, status: isEmpty(result.data) ? "empty" : "ready", retry, setData };
}

const subscribe = (cb: () => void) => service.subscribeInterviews(cb);

export function useInterviews(q: InterviewsQuery): Resource<InterviewsPage> {
  return useResource(() => service.listInterviews(q), q, subscribe, (d) => d === null || d.workspaceEmpty);
}

export function useInterview(id: string): Resource<InterviewDetail> {
  return useResource(() => service.getInterview(id).then((d) => d as InterviewDetail), id, subscribe, (d) => d === null);
}

export const checkInterviewConflicts = service.checkConflicts;
export const scheduleInterview = service.scheduleInterview;
export const rescheduleInterview = service.rescheduleInterview;
export const cancelInterview = service.cancelInterview;
export const saveInterviewScorecard = service.saveScorecard;

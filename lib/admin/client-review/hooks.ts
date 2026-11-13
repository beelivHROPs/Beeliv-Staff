"use client";

/**
 * Client Review data hooks: `{ data, status, retry, setData }` with status
 * loading | ready | empty | error | restricted. Components use these, never
 * the service, adapter or mock.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { ClientReviewDetail, ClientReviewPage, ClientReviewQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };

export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  /** Replace the data with a fresh value returned by a write (no refetch). */
  setData: (next: T) => void;
}

function useLoad<T>(load: () => Promise<T | null>, deps: string, isEmpty: (d: T | null) => boolean): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => service.subscribeClientReview(() => setResetVer((v) => v + 1)), []);
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

export const useClientReviews = (q: ClientReviewQuery): Live<ClientReviewPage> => useLoad(() => service.listSubmissions(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useClientReview = (id: string): Live<ClientReviewDetail> => useLoad(() => service.getSubmission(id), id, (d) => d === null);

export const submitToClient = service.submitToClient;
export const withdrawSubmission = service.withdrawSubmission;
export const recordClientFeedback = service.recordFeedback;
export const returnToShortlist = service.returnToShortlist;

"use client";

/** Reports hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { ReportData, ReportEntry, ReportFacets, ReportQuery } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
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
  useEffect(() => service.subscribeReports(() => setResetVer((v) => v + 1)), []);
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

export const useReportList = (): Live<ReportEntry[]> => useLoad(() => service.listReports(), "list", (d) => d === null || d.length === 0);
export const useReportFacets = (): Live<ReportFacets> => useLoad(() => service.getReportFacets(), "facets", (d) => d === null);
export const useReport = (q: ReportQuery): Live<ReportData> => useLoad(() => service.getReport(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);

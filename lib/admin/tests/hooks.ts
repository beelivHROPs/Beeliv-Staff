"use client";

/** Tests & Forms hooks. `{ data, status, retry, setData }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import type { FormFacets, FormQuery, FormsPage, FormSummary, ResultQuery, ResultsPage, SubmissionDetail } from "./adapter";
import * as service from "./service";
import type { FormDefinition } from "@/lib/forms/types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  setData: (d: T) => void;
}

/** `deps` encodes every input `load` closes over; a change (or a store change) re-runs the load. */
function useLoad<T>(load: () => Promise<T | null>, deps: string, isEmpty: (d: T | null) => boolean, live = true): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${live ? resetVer : 0}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => (live ? service.subscribeTests(() => setResetVer((v) => v + 1)) : undefined), [live]);
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
  return { data: result.data, status: isEmpty(result.data) ? "empty" : "ready", retry, setData };
}

export function useForms(q: FormQuery): Live<FormsPage> {
  return useLoad(() => service.listForms(q), JSON.stringify(q), (d) => d === null);
}

/** The builder loads once (live = false) so a save elsewhere never overwrites what the person is typing. */
export function useFormRecord(id: string | null): Live<{ form: FormDefinition; submissionCount: number }> {
  return useLoad(() => (id ? service.getForm(id) : Promise.resolve(null)), id ?? "new", (d) => d === null && id !== null, false);
}

export function useFacets(): FormFacets | null {
  const [f, setF] = useState<FormFacets | null>(null);
  useEffect(() => {
    let alive = true;
    service.getFacets().then((x) => alive && setF(x));
    return () => {
      alive = false;
    };
  }, []);
  return f;
}

export function useResults(formId: string, q: ResultQuery): Live<ResultsPage> {
  return useLoad(() => service.listResults(formId, q), `${formId}:${JSON.stringify(q)}`, (d) => d === null);
}

export function useSummary(formId: string): Live<FormSummary> {
  return useLoad(() => service.getSummary(formId), formId, (d) => d === null);
}

export function useSubmission(id: string): Live<SubmissionDetail> {
  return useLoad(() => service.getSubmission(id), id, (d) => d === null);
}

export const saveForm = service.saveForm;
export const setFormStatus = service.setFormStatus;
export const duplicateForm = service.duplicateForm;
export const saveMarks = service.saveMarks;

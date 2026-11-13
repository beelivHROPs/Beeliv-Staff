"use client";

/** Talent Pool data hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { TalentPoolPage, TalentPoolQuery } from "./types";

type Result = { key: string; data: TalentPoolPage | null; failed: "error" | "restricted" | null };

export interface LivePool {
  data: TalentPoolPage | null;
  status: LoadStatus;
  retry: () => void;
}

export function useTalentPool(q: TalentPoolQuery): LivePool {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const latest = useRef(q);
  const key = `${JSON.stringify(q)}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = q;
  });
  useEffect(() => service.subscribeTalentPool(() => setResetVer((v) => v + 1)), []);
  useEffect(() => {
    let cancelled = false;
    service.listPool(latest.current).then(
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
  return { data: result.data, status: result.data === null || result.data.workspaceEmpty ? "empty" : "ready", retry };
}

export const addCandidateToVacancy = service.addToVacancy;
export const removeCandidateFromPool = service.removeFromPool;

"use client";

/** Team & Access hooks. `{ data, status, retry, setData }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { AccessMatrix, AccessPage, AccessQuery, InvitationQuery, InvitationsPage, TeamCapabilities, TeamFacets } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  setData: (d: T) => void;
}

/** `deps` encodes every input `load` closes over; a change re-runs the load. */
function useLoad<T>(load: () => Promise<T | null>, deps: string, isEmpty: (d: T | null) => boolean): Live<T> {
  const [attempt, setAttempt] = useState(0);
  const [resetVer, setResetVer] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const latest = useRef(load);
  const key = `${deps}:${attempt}:${resetVer}`;

  useEffect(() => {
    latest.current = load;
  });
  useEffect(() => service.subscribeTeamAccess(() => setResetVer((v) => v + 1)), []);
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

export type AccessList = "internal" | "clients" | "accounts";

export function useAccessList(list: AccessList, q: AccessQuery): Live<AccessPage> {
  const fn = list === "internal" ? service.listInternal : list === "clients" ? service.listClientUsers : service.listAccounts;
  return useLoad(() => fn(q), `${list}:${JSON.stringify(q)}`, (d) => d === null || d.workspaceEmpty);
}
export const useInvitations = (q: InvitationQuery): Live<InvitationsPage> => useLoad(() => service.listInvitations(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useTeamCapabilities = (): Live<TeamCapabilities> => useLoad(() => service.getCapabilities(), "caps", (d) => d === null);
export const useTeamFacets = (): Live<TeamFacets> => useLoad(() => service.getTeamFacets(), "facets", (d) => d === null);
export const useAccessMatrix = (): Live<AccessMatrix> => useLoad(() => service.getAccessMatrix(), "matrix", (d) => d === null);

export const inviteUser = service.inviteUser;
export const sendInvitation = service.sendInvitation;
export const createAccessLink = service.createAccessLink;
export const updateInvitationEmail = service.updateInvitationEmail;
export const replaceInvitation = service.replaceInvitation;
export const findDuplicates = service.findDuplicates;
export const resendInvitation = service.resendInvitation;
export const revokeInvitation = service.revokeInvitation;
export const setAccountState = service.setAccountState;
export const updateAccess = service.updateAccess;
export const getHistory = service.getHistory;

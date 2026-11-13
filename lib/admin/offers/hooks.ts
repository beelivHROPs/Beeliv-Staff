"use client";

/** Offers hooks. `{ data, status, retry, setData }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { OfferDetail, OfferFacets, OfferQuery, OffersPage } from "./types";

type Result<T> = { key: string; data: T | null; failed: "error" | "restricted" | null };
export interface Live<T> {
  data: T | null;
  status: LoadStatus;
  retry: () => void;
  /** Replace the data after a write returns the fresh record. */
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
  useEffect(() => service.subscribeOffers(() => setResetVer((v) => v + 1)), []);
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

export const useOffers = (q: OfferQuery): Live<OffersPage> => useLoad(() => service.listOffers(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty);
export const useOffer = (id: string): Live<OfferDetail> => useLoad(() => service.getOffer(id), id, (d) => d === null);
export const useOfferFacets = (): Live<OfferFacets> => useLoad(() => service.getOfferFacets(), "facets", (d) => d === null);

export const createOffer = service.createOffer;
export const updateOfferDraft = service.updateOfferDraft;
export const submitOffer = service.submitOffer;
export const approveOffer = service.approveOffer;
export const sendOffer = service.sendOffer;
export const withdrawOffer = service.withdrawOffer;
export const resendOffer = service.resendOffer;
export const convertOfferToStaff = service.convertOfferToStaff;
export const devSimulateOperationsApproval = service.devSimulateOperationsApproval;
export const devSimulateApplicantResponse = service.devSimulateApplicantResponse;

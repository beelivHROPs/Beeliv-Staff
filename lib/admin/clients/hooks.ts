"use client";

/** Clients data hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";
import type { ClientDetail, ClientsPage, ClientsQuery, OutletDetail } from "./types";

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
  useEffect(() => service.subscribeClients(() => setResetVer((v) => v + 1)), []);
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

export const useClientsList = (q: ClientsQuery): Live<ClientsPage> => useLoad(() => service.listClients(q), JSON.stringify(q));
export const useClient = (id: string): Live<ClientDetail> => useLoad(() => service.getClient(id), id);
export const useOutlet = (clientId: string, outletId: string): Live<OutletDetail> => useLoad(() => service.getOutlet(clientId, outletId), clientId + "/" + outletId);
export const saveOutlet = service.updateOutlet;

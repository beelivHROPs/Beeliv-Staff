"use client";

/**
 * Inbox data hooks. Each returns `{ data, status, retry }` with status
 * "loading" | "ready" | "empty" | "error" | "restricted" | "notfound".
 * Components use these, never the adapter or the mock. After a write the data
 * refetches silently (the old data stays on screen, no skeleton flash).
 */
import { useCallback, useEffect, useState } from "react";
import { RestrictedError } from "@/lib/admin/adapter";
import { NotFoundError } from "./adapter";
import * as service from "./service";
import type { InboxCaseResult, InboxList, NeedsHomeItem } from "./types";

export type InboxLoadStatus = "loading" | "ready" | "empty" | "error" | "restricted" | "notfound";

export interface InboxLoadable<T> {
  data: T | null;
  status: InboxLoadStatus;
  retry: () => void;
}

type Result<T> = { data: T | null; failed: "error" | "restricted" | "notfound" | null };

function useLoad<T>(load: () => Promise<T>, isEmpty: (d: T) => boolean): InboxLoadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => service.subscribeInbox(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ data, failed: null }),
      (e: unknown) =>
        !cancelled &&
        setResult({ data: null, failed: e instanceof RestrictedError ? "restricted" : e instanceof NotFoundError ? "notfound" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [load, attempt, version]);

  const retry = useCallback(() => {
    setResult(null);
    setAttempt((a) => a + 1);
  }, []);

  if (!result) return { data: null, status: "loading", retry };
  if (result.failed) return { data: null, status: result.failed, retry };
  return { data: result.data, status: result.data === null || isEmpty(result.data) ? "empty" : "ready", retry };
}

export const useInboxList = (): InboxLoadable<InboxList> => useLoad(service.getList, (d) => d.cases.length === 0);

/** One case. Re-fetches when `id` changes (the loader is memoised per id). */
export function useInboxCase(id: string | null): InboxLoadable<InboxCaseResult> {
  const load = useCallback(() => (id ? service.getCase(id) : new Promise<InboxCaseResult>(() => {})), [id]);
  const out = useLoad(load, () => false);
  // Switching cases: don't show the previous case's data under the new id.
  if (out.data && out.data.detail.id !== id) return { data: null, status: "loading", retry: out.retry };
  return out;
}

/** Unmatched inbound emails. `enabled` = the caller may triage; when false nothing is requested. */
export function useNeedsHome(enabled: boolean): InboxLoadable<NeedsHomeItem[]> {
  const load = useCallback(() => (enabled ? service.listNeedsHome() : new Promise<NeedsHomeItem[]>(() => {})), [enabled]);
  return useLoad(load, (d) => d.length === 0);
}

export const inboxActions = {
  retryDelivery: service.retryDelivery,
  checkDelivery: service.checkDelivery,
  searchCasesForPicker: service.searchCasesForPicker,
  assignNeedsHome: service.assignNeedsHome,
  dismissNeedsHome: service.dismissNeedsHome,
  reply: service.reply,
  addNote: service.addNote,
  assign: service.assign,
  setStatus: service.setStatus,
  escalate: service.escalate,
  markRead: service.markRead,
};

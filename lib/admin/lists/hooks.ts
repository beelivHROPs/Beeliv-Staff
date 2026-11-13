"use client";

/**
 * Lists & Rules hooks. `useListsLoad()` gives `{ status, retry }`, status: loading | ready | error | restricted.
 * The list values themselves come from the store hooks (useDepartments() and friends in ./store).
 */
import { useCallback, useEffect, useState } from "react";
import { RestrictedError } from "../adapter";
import type { LoadStatus } from "../types";
import * as service from "./service";

export function useListsLoad(): { status: LoadStatus; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; failed: "error" | "restricted" | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    service.loadLists().then(
      () => !cancelled && setResult({ attempt, failed: null }),
      (e: unknown) => !cancelled && setResult({ attempt, failed: e instanceof RestrictedError ? "restricted" : "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  if (!result || result.attempt !== attempt) return { status: "loading", retry };
  return { status: result.failed ?? "ready", retry };
}

export const createListItem = service.createItem;
export const editListItem = service.editItem;
export const toggleListItem = service.toggleItem;
export const reorderListItem = service.reorderItem;
export const deleteListItem = service.deleteItem;

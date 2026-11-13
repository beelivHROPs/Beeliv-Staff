"use client";

/**
 * Enter-to-search with a short "Searching" wait (prototype feel, see lib/ui/search-feel.ts).
 *
 *  - Typing only changes `draft`; nothing is searched until `submit()` (Enter or the search button).
 *  - `submit()` hands the draft to `onChange`, so the screen's own filter logic is untouched.
 *  - `busy` stays true for SEARCH_FEEL_MS after the submitted text OR `settleKey` changes.
 *    Pass a string that changes whenever a filter or sort changes so those settle behind the same wait.
 *  - When `value` changes from outside (Clear filters, a chip removed), the draft follows it.
 *
 * Same pattern as components/shared/jobs/JobsExplorer.tsx (settled / submitted).
 */
import { useEffect, useState } from "react";
import { SEARCH_FEEL_MS } from "@/lib/ui/search-feel";

export function useSettledSearch({ value, onChange, settleKey = "" }: { value: string; onChange: (v: string) => void; settleKey?: string }) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  const key = `${value}\u0000${settleKey}`;
  const [settled, setSettled] = useState(key);
  const busy = key !== settled;
  useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => setSettled(key), SEARCH_FEEL_MS);
    return () => window.clearTimeout(t);
  }, [busy, key]);

  const submit = () => {
    if (draft !== value) onChange(draft);
  };
  const clear = () => {
    setDraft("");
    if (value !== "") onChange("");
  };
  return { draft, setDraft, submit, clear, busy };
}

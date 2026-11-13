"use client";

/**
 * The masked NIN and bank account number ("1234*******"), shared by the
 * Applicant review step and the Staff profile (same person). ONLY the masked
 * text is kept, on this device; the full numbers still live in the form's
 * React state alone and are never stored (lib/applicant/documentation.ts).
 * Prototype stand-in for the backend: where real values are held, and which
 * digits may be shown, waits on Beeliv's sensitive-data decision.
 */
import { useEffect, useSyncExternalStore } from "react";

export type MaskedIds = { nin: string; account: string };

const KEY = "bv-masked-ids";
const EMPTY: MaskedIds = { nin: "", account: "" };
/**
 * SAMPLE DATA for the prototype's sample person (stands in for what the backend
 * will hold). Used until a real number is entered in Documentation, which then
 * replaces it. Delete with the mock layer.
 */
const SAMPLE: MaskedIds = { nin: "1234*******", account: "0123******" };
let state: MaskedIds = SAMPLE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<MaskedIds>;
    // Only ever accept masked text: digits and asterisks.
    const clean = (v: unknown) => (typeof v === "string" && /^[0-9*]{0,20}$/.test(v) ? v : "");
    state = { nin: clean(p.nin), account: clean(p.account) };
    emit();
  } catch {
    // Storage unavailable or corrupt: start empty.
  }
}

/** Remember the masked text for whichever of the two is given. "" clears it. */
export function setMaskedIds(patch: Partial<MaskedIds>) {
  const next = { ...state, ...patch };
  if (next.nin === state.nin && next.account === state.account) return;
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Keep in memory only.
  }
  emit();
}

export function useMaskedIds(): MaskedIds {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => EMPTY,
  );
  useEffect(hydrate, []);
  return snap;
}

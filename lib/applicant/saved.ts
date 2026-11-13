/**
 * Saved jobs (the wireframe's `st.saved` / data-save bookmark toggle).
 * One shared, reactive store so every bookmark — Overview recommendations,
 * Find Jobs cards, job detail — stays in sync, and the Find Jobs "Saved"
 * list can show them. Frontend-only: persisted to localStorage until the
 * backend adapter replaces it (same swap point as lib/applicant/service.ts).
 */
import { useEffect, useSyncExternalStore } from "react";
import { takeGuestSavedJobs } from "@/lib/jobs/guest-saved";

const KEY = "beeliv-applicant-saved-jobs-v1";
let saved: string[] = [];
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
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) saved = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // Unavailable/corrupt storage - start empty.
  }
  // Jobs saved on the public site before signing in join the account's saved jobs (once), then the guest list is cleared.
  const fromGuest = takeGuestSavedJobs().filter((id) => !saved.includes(id));
  if (fromGuest.length) {
    saved = [...fromGuest, ...saved];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // Keep in memory only.
    }
  }
  if (saved.length) emit();
}

// What the server renders (nothing saved yet); the browser switches to the stored list after hydrating.
const NONE_SAVED: string[] = [];

/** Reactive list of saved job ids (most recently saved first). */
export function useSavedJobs(): string[] {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => saved,
    () => NONE_SAVED,
  );
  useEffect(hydrate, []);
  return snap;
}

/** One-off read of the saved job ids (not reactive), for search. */
export function getSavedJobIds(): string[] {
  hydrate();
  return saved;
}

/** Toggle a job's saved state. Returns the new state (true = now saved). */
export function toggleSavedJob(jobId: string): boolean {
  const isSaved = saved.includes(jobId);
  saved = isSaved ? saved.filter((id) => id !== jobId) : [jobId, ...saved];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Keep in memory only.
  }
  emit();
  return !isSaved;
}

/**
 * Job alert preferences (wireframe `st.alert`: {on, edit, freq, ch}).
 * Frontend-only placeholder, persisted to localStorage like the rest of the
 * applicant mock state. No alert is actually delivered: sending email
 * alerts is backend work, not built here.
 */
import { useEffect, useSyncExternalStore } from "react";

export type AlertFreq = "Instant" | "Daily" | "Weekly";
/** Job alerts are email only (project lead, from Beeliv: no SMS, WhatsApp or in-app alerts). */
export type AlertChannel = "Email";
export type JobAlert = { on: boolean; freq: AlertFreq; ch: AlertChannel[] };

const KEY = "beeliv-applicant-job-alert-v1";
// Job alerts are OPT-IN (project lead, 2026-10-19): off until the person turns them on. When they
// do, the default is a daily email. Optional mail needs consent and a way to stop it at any time.
const DEFAULT: JobAlert = { on: false, freq: "Daily", ch: ["Email"] };

let state: JobAlert = DEFAULT;
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
      const p = JSON.parse(raw) as Partial<JobAlert>;
      state = {
        on: typeof p.on === "boolean" ? p.on : DEFAULT.on,
        freq: p.freq === "Instant" || p.freq === "Weekly" || p.freq === "Daily" ? p.freq : DEFAULT.freq,
        ch: DEFAULT.ch, // older saved choices (WhatsApp, In-app) are dropped: email only
      };
      emit();
    }
  } catch {
    // Unavailable/corrupt storage - keep the default.
  }
}

export function useJobAlert(): JobAlert {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULT,
  );
  useEffect(hydrate, []);
  return snap;
}

export function setJobAlert(next: JobAlert) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Keep in memory only.
  }
  emit();
}

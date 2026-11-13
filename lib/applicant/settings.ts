"use client";

/**
 * Applicant Settings preferences (wireframe `st.setting`), persisted to
 * localStorage and exposed through useSyncExternalStore.
 *
 * Presentation-layer only: these are device-local UI preferences for the
 * prototype. Nothing here changes an account, sends a message, or is an
 * authorization/consent record - a real implementation would persist the
 * consent-type switches (talent pool, document sharing, optional mail) server-side.
 *
 * "Larger text" and "Reduce motion" genuinely apply: they set
 * `data-ap-large-text` / `data-ap-reduce-motion` on <html>, which
 * app/applicant/applicant.css scopes to `.applicant-shell` (wireframe
 * body.lg / body.nomo). Call applyDisplaySettings() from any always-mounted
 * applicant component to restore them after a full page reload.
 */
import { useEffect, useSyncExternalStore } from "react";

/**
 * Notification choices live elsewhere on purpose: job alerts are in
 * components/applicant/jobs/alert-store.ts (opt-in, default OFF), and every other
 * message is REQUIRED and has no switch (lib/notifications/catalog.ts). Email is
 * the only channel (no SMS, no WhatsApp), so there is no channel switch either.
 * Only truly optional mail stays here: `marketing` (news, tips and events), default OFF.
 */
export type SettingKey =
  | "twofa"
  | "marketing"
  | "visible"
  | "share"
  | "large"
  | "motion";

export type ApplicantSettings = Record<SettingKey, boolean>;

/** Wireframe defaults (st.setting), with optional mail opt-in (off). */
const DEFAULTS: ApplicantSettings = {
  twofa: false,
  marketing: false,
  visible: true,
  share: true,
  large: false,
  motion: false,
};

const KEY = "bv-ap-settings";
let state: ApplicantSettings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function applyToDocument(s: ApplicantSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (s.large) root.dataset.apLargeText = "";
  else delete root.dataset.apLargeText;
  if (s.motion) root.dataset.apReduceMotion = "";
  else delete root.dataset.apReduceMotion;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApplicantSettings>;
      const next = { ...DEFAULTS };
      for (const k of Object.keys(DEFAULTS) as SettingKey[]) {
        if (typeof parsed[k] === "boolean") next[k] = parsed[k] as boolean;
      }
      state = next;
      emit();
    }
  } catch {
    // Corrupt/unavailable storage - keep defaults.
  }
  applyToDocument(state);
}

/** Restore the display preferences onto <html> (safe to call repeatedly). */
export function applyDisplaySettings() {
  hydrate();
  applyToDocument(state);
}

export function useApplicantSettings(): ApplicantSettings {
  const snap = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => DEFAULTS,
  );
  useEffect(hydrate, []);
  return snap;
}

export function toggleSetting(key: SettingKey): boolean {
  state = { ...state, [key]: !state[key] };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Keep in memory only.
  }
  applyToDocument(state);
  emit();
  return state[key];
}

/** Scroll helper that honours the Reduce motion preference (and the OS setting). */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = state.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

"use client";

/**
 * Client workspace preferences (Settings > Workspace): default outlet and
 * default reporting period. DEVICE-LOCAL for now (localStorage) - a per-person
 * preference is a backend item (TBD). Presentation only: the default outlet is
 * still validated against the outlets the session authorises (lib/client/outlet.ts).
 */
import { useSyncExternalStore } from "react";
import type { OutletScope } from "./types";

export type DefaultRange = "7d" | "30d";
export type WorkspacePrefs = { defaultOutlet: OutletScope | null; defaultRange: DefaultRange };

const KEY = "bv-client-workspace";
const DEFAULTS: WorkspacePrefs = { defaultOutlet: null, defaultRange: "7d" };
let state: WorkspacePrefs = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<WorkspacePrefs> | null;
    if (p) state = { defaultOutlet: typeof p.defaultOutlet === "string" ? p.defaultOutlet : null, defaultRange: p.defaultRange === "30d" ? "30d" : "7d" };
  } catch {
    // Corrupt / unavailable storage - keep defaults.
  }
}

/** Current preferences (reads storage once, client-side). */
export function getWorkspacePrefs(): WorkspacePrefs {
  hydrate();
  return state;
}

export function setWorkspacePrefs(patch: Partial<WorkspacePrefs>) {
  hydrate();
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Keep in memory only.
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): WorkspacePrefs {
  hydrate();
  return state;
}

export function useWorkspacePrefs(): WorkspacePrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getSnapshot,
    () => DEFAULTS,
  );
}

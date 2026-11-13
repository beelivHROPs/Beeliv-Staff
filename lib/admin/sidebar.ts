"use client";

/** Desktop sidebar collapsed / expanded, remembered on this device only. */
import { useSyncExternalStore } from "react";

const KEY = "bv-admin-sidebar-collapsed";
let collapsed = false;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    collapsed = window.localStorage.getItem(KEY) === "1";
  } catch {
    // Storage unavailable - stay expanded.
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  hydrate();
  return collapsed;
}

export const useSidebarCollapsed = () => useSyncExternalStore(subscribe, getSnapshot, () => false);

export function setSidebarCollapsed(next: boolean) {
  collapsed = next;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // Keep in memory only.
  }
  listeners.forEach((l) => l());
}

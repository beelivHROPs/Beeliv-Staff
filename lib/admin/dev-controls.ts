"use client";

/**
 * DEV ONLY - the "Prototype state" control (mirrors Applicant / Staff / Client).
 * Picks which fixture scenario the mock adapter serves so the Overview's
 * loading / empty / error states can be previewed. Delete this file, the pill
 * in AdminShell and the mock adapter when the real backend adapter goes in.
 */
import { useSyncExternalStore } from "react";

export type PrototypeMode = "normal" | "empty" | "loading" | "error";

export const PROTOTYPE_MODES: { value: PrototypeMode; label: string }[] = [
  { value: "normal", label: "Active workspace" },
  { value: "empty", label: "No recruitment activity" },
  { value: "loading", label: "Loading (skeleton)" },
  { value: "error", label: "Error + retry" },
];

let mode: PrototypeMode = "normal";
const listeners = new Set<() => void>();

export function getPrototypeMode(): PrototypeMode {
  return mode;
}
export function setPrototypeMode(next: PrototypeMode) {
  if (next === mode) return;
  mode = next;
  listeners.forEach((l) => l());
}
/** DEV ONLY: tell every mock adapter to reload (used when the prototype identity changes). */
export function resetPrototypeData() {
  listeners.forEach((l) => l());
}
export function subscribePrototypeMode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function usePrototypeMode(): PrototypeMode {
  return useSyncExternalStore(subscribePrototypeMode, getPrototypeMode, () => "normal");
}

/**
 * Per-app dark-mode store (project lead, 2026-09-30: dark mode for every app).
 * One factory, one instance per app (Staff, Client, ...). Each instance:
 *  - saves the choice on this device only (a per-person preference is a
 *    backend item for later);
 *  - while its app is mounted, sets <html data-<app>-theme="dark"> which turns
 *    on that app's dark token layer (app/<app>/<app>.css);
 *  - only applies while the app's own <html> flag class (e.g. `client-app`) is
 *    present, so leaving the app always returns the page to light.
 *
 * Modes: light, dark, and "system" (follows prefers-color-scheme live).
 * "system" is additive - the stored "1" / "0" values Staff already wrote are
 * unchanged, and Staff's switches still just set light/dark via setDark.
 */
import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

export function createAppTheme({ storageKey, appClass, datasetKey }: { storageKey: string; appClass: string; datasetKey: string }) {
  let mode: ThemeMode = "light";
  let hydrated = false;
  let watching = false;
  const listeners = new Set<() => void>();

  const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";
  const systemDark = () => canMatch() && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = () => (mode === "system" ? systemDark() : mode === "dark");

  function apply() {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (isDark() && root.classList.contains(appClass)) root.dataset[datasetKey] = "dark";
    else delete root.dataset[datasetKey];
  }

  function emit() {
    for (const l of listeners) l();
  }

  function watchSystem() {
    if (watching || !canMatch()) return;
    watching = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (mode !== "system") return;
      apply();
      emit();
    });
  }

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      mode = raw === "system" ? "system" : raw === "1" ? "dark" : "light";
    } catch {
      // Storage unavailable - stay light.
    }
    watchSystem();
    emit();
  }

  /** Re-apply after the app's ThemeFlag marks <html>. */
  function applyTheme() {
    hydrate();
    apply();
  }

  /** Remove the dark flag when leaving the app. */
  function clearTheme() {
    if (typeof document !== "undefined") delete document.documentElement.dataset[datasetKey];
  }

  function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }

  /** Effective dark: the mode is dark, or system and the OS is dark. */
  function useDark(): boolean {
    const snap = useSyncExternalStore(subscribe, isDark, () => false);
    useEffect(hydrate, []);
    return snap;
  }

  /** The chosen preference: light, dark or system. */
  function useMode(): ThemeMode {
    const snap = useSyncExternalStore(
      subscribe,
      () => mode,
      () => "light" as ThemeMode,
    );
    useEffect(hydrate, []);
    return snap;
  }

  function setMode(next: ThemeMode) {
    mode = next;
    try {
      window.localStorage.setItem(storageKey, next === "system" ? "system" : next === "dark" ? "1" : "0");
    } catch {
      // Keep in memory only.
    }
    watchSystem();
    apply();
    emit();
  }

  /** Explicit light/dark (the sidebar switches); also leaves "system" mode. */
  function setDark(on: boolean) {
    setMode(on ? "dark" : "light");
  }

  return { applyTheme, clearTheme, useDark, setDark, useMode, setMode };
}

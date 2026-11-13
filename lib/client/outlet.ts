"use client";

/**
 * Outlet context (brief section 6 / 29). Holds the SELECTED scope - all outlets
 * or one outlet - and the list of scopes the signed-in user may choose from.
 * Every data hook (lib/client/hooks.ts) reads the selected scope, so switching
 * outlet re-fetches Overview, Workforce, Attendance, Schedules, Recruitment,
 * Requests, Compliance, Payroll and Reports together.
 *
 * SECURITY: this store is presentation state, NOT access control. The backend
 * must reject any outlet/client id the user is not a member of (membership ->
 * outlet scope -> RLS / authorised query), even if someone edits the request
 * in the browser. The list of choices comes from the session the backend
 * returns; the UI never invents a scope.
 */
import { useSyncExternalStore } from "react";
import { getWorkspacePrefs } from "./preferences";
import type { ClientSession, Outlet, OutletScope } from "./types";

export const ALL_SCOPE = "all" as const;

type State = {
  /** Authorised outlets (from the session). Empty until the session loads. */
  outlets: Outlet[];
  clientName: string;
  /** null until the session has resolved - data hooks wait for it. */
  scope: OutletScope | null;
};

let state: State = { outlets: [], clientName: "", scope: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Called by the shell whenever the session loads (or the dev state changes). */
export function syncSession(session: ClientSession | null) {
  if (!session || session.accountState !== "active" || session.outlets.length === 0) {
    state = { outlets: [], clientName: session?.clientName ?? "", scope: null };
    emit();
    return;
  }
  const valid = (s: OutletScope | null) => s !== null && (s === ALL_SCOPE ? session.outlets.length > 1 : session.outlets.some((o) => o.id === s));
  // Keep the user's choice if it is still authorised; otherwise open on the default.
  // First load: the saved default outlet (Settings > Workspace) if still authorised, else the session default.
  const saved = getWorkspacePrefs().defaultOutlet;
  const scope = valid(state.scope) ? state.scope : session.outlets.length === 1 ? session.outlets[0].id : valid(saved) ? saved : session.defaultScope;
  if (state.scope === scope && state.outlets === session.outlets) return;
  state = { outlets: session.outlets, clientName: session.clientName, scope };
  emit();
}

export function setOutletScope(next: OutletScope) {
  const ok = next === ALL_SCOPE ? state.outlets.length > 1 : state.outlets.some((o) => o.id === next);
  if (!ok || next === state.scope) return;
  state = { ...state, scope: next };
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getState = () => state;
const SERVER: State = { outlets: [], clientName: "", scope: null };

export function useOutletState(): State {
  return useSyncExternalStore(subscribe, getState, () => SERVER);
}

/** Selected scope, or null while the session is still resolving. */
export function useOutletScope(): OutletScope | null {
  return useOutletState().scope;
}

/** "Kalina Abuja" or "All Kalina Hospitality outlets". */
export function scopeLabel(scope: OutletScope | null, s: Pick<State, "outlets" | "clientName">): string {
  if (scope === null) return "";
  if (scope === ALL_SCOPE) return `All ${s.clientName} outlets`;
  return s.outlets.find((o) => o.id === scope)?.name ?? "";
}

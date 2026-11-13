"use client";

/**
 * Admin scope (PROTOTYPE). Which clients / outlets the signed-in internal user
 * may see, derived from the dev-only prototype identity (lib/admin/ops/identity.ts).
 *
 *   HR officer (assigned HR)  -> only their assigned clients (and those clients' outlets)
 *   HR Manager                -> all clients
 *   Operations                -> all clients
 *
 * Mock adapters call `getAdminScope()` and filter their fixtures; screens call
 * `useAdminScope()` for the one-line note and the empty state. Nothing here is
 * access control: the real boundary is the server-side grant + RLS
 * (docs/contracts/auth-permissions.md). Delete with the prototype identity
 * switch when the backend returns real scopes (the session already has a
 * `scope` field of the same shape).
 */
import { useSyncExternalStore } from "react";
import { getAdminIdentity, subscribeAdminIdentity, type AdminIdentityId } from "./ops/identity";

export interface AdminScopeNow {
  /** True for HR Manager and Operations: every client. */
  allClients: boolean;
  clientIds: string[];
  /** Outlets of the assigned clients (same ids the Clients / Staff mocks use). */
  outletIds: string[];
  /** Display names of the assigned clients. */
  clientNames: string[];
  /** One quiet line for the page header, or the empty-state text when nothing is assigned. */
  label: string;
  /** An HR officer with no assigned client. */
  none: boolean;
}

const OFFICER_CLIENTS = [
  { id: "c-demo-hotel", name: "Demo Hotel Abuja" },
  { id: "c-demo-lounge", name: "Demo Lounge Lagos" },
];
export const NO_CLIENTS_TEXT = "No clients are assigned to you yet. Ask Operations to assign you.";

const OFFICER: AdminScopeNow = {
  allClients: false,
  clientIds: OFFICER_CLIENTS.map((c) => c.id),
  outletIds: ["o-hotel-main", "o-hotel-garki", "o-lounge-vi"],
  clientNames: OFFICER_CLIENTS.map((c) => c.name),
  label: `Showing your ${OFFICER_CLIENTS.length} assigned clients: ${OFFICER_CLIENTS.map((c) => c.name).join(", ")}`,
  none: false,
};
const NONE: AdminScopeNow = { allClients: false, clientIds: [], outletIds: [], clientNames: [], label: NO_CLIENTS_TEXT, none: true };
const ALL: AdminScopeNow = { allClients: true, clientIds: [], outletIds: [], clientNames: [], label: "Showing all clients", none: false };

const BY_IDENTITY: Record<AdminIdentityId, AdminScopeNow> = { "hr-officer": OFFICER, "hr-officer-none": NONE, "hr-manager": ALL, ops: ALL };

export const scopeFor = (id: AdminIdentityId): AdminScopeNow => BY_IDENTITY[id];
export const getAdminScope = (): AdminScopeNow => BY_IDENTITY[getAdminIdentity()];
export const useAdminScope = (): AdminScopeNow => useSyncExternalStore(subscribeAdminIdentity, getAdminScope, () => OFFICER);

/** Is this client id inside the current scope? */
export function clientIdInScope(id: string | null | undefined, scope: AdminScopeNow = getAdminScope()): boolean {
  if (scope.allClients) return true;
  return !!id && scope.clientIds.includes(id);
}

/** Does this display text (a client name, or "Client, outlet") name an assigned client? Unknown names are out of scope for an officer. */
export function textInScope(text: string | null | undefined, scope: AdminScopeNow = getAdminScope()): boolean {
  if (scope.allClients) return true;
  return !!text && scope.clientNames.some((n) => text.includes(n));
}

"use client";

/**
 * DEV ONLY - which Admin identity the prototype is showing (HR officer, HR Manager or Operations).
 * Mirrors lib/admin/dev-controls.ts: a tiny external store behind a switch in
 * the "Prototype" bar of AdminShell. Real identity comes from Admin auth and the
 * server-side role later; nothing here is access control. Delete this file, the
 * switch in AdminShell and the ops-identity.css import when real auth lands.
 *
 * The stored choice is only read while prototype controls are visible, so a
 * production build always starts as HR.
 */
import { useSyncExternalStore } from "react";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { resetPrototypeData } from "../dev-controls";
import type { AdminRoleId, AdminSession } from "../types";

const KEY = "bv-admin-proto-identity-v1";

/**
 * Prototype identities. "hr-officer-none" is an HR officer with NO assigned
 * clients (previews the empty scope state). HR Manager sees every client.
 * Trainer is deliberately absent until the role / capability design is agreed.
 */
export type AdminIdentityId = "hr-officer" | "hr-officer-none" | "hr-manager" | "ops";

export const IDENTITY_OPTIONS: { value: AdminIdentityId; label: string }[] = [
  { value: "hr-officer", label: "HR officer (2 clients)" },
  { value: "hr-officer-none", label: "HR officer (no clients)" },
  { value: "hr-manager", label: "HR Manager (all clients)" },
  { value: "ops", label: "Operations" },
];

const IDS = IDENTITY_OPTIONS.map((o) => o.value);

let identity: AdminIdentityId = "hr-officer";
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  if (!SHOW_PROTOTYPE_CONTROLS) return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw && (IDS as string[]).includes(raw)) identity = raw as AdminIdentityId;
  } catch {
    // Storage unavailable: stay on the HR officer.
  }
}

/**
 * LIVE identity, seeded in the browser from the SERVER-verified session (components/admin/AdminLiveIdentity.tsx).
 * When set it wins over the prototype choice and the prototype switch is inert. Browser-only on purpose: module
 * state on the server is shared between requests, so it is never written there. Display only; the server's
 * session, Proxy and RLS checks remain the access boundary.
 */
let liveIdentity: AdminIdentityId | null = null;
export function seedLiveAdminIdentity(next: AdminIdentityId) {
  if (typeof window === "undefined") return;
  liveIdentity = next;
}
export const hasLiveAdminIdentity = (): boolean => liveIdentity !== null;

export function getAdminIdentity(): AdminIdentityId {
  load();
  return liveIdentity ?? identity;
}

export function setAdminIdentity(next: AdminIdentityId) {
  if (liveIdentity) return; // the real session decides; the prototype switch is inert
  load();
  if (next === identity) return;
  identity = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // Keep in memory only.
  }
  listeners.forEach((l) => l());
  // Every mock adapter re-reads the (now different) scope.
  resetPrototypeData();
}

export function subscribeAdminIdentity(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The active identity, or null on the server / during hydration. */
export function useAdminIdentity(): AdminIdentityId | null {
  return useSyncExternalStore(subscribeAdminIdentity, getAdminIdentity, () => null);
}

/** The shell / navigation role: HR for both HR identities, ops for Operations. */
export function getAdminRole(): AdminRoleId {
  return getAdminIdentity() === "ops" ? "ops" : "hr";
}

/** The active role, or null on the server / during hydration (so screens can wait instead of flashing the wrong role). */
export function useAdminRole(): AdminRoleId | null {
  return useSyncExternalStore(subscribeAdminIdentity, getAdminRole, () => null);
}

/** Prototype stand-in for the signed-in Operations user (FICTIONAL). */
export const OPS_ROLE_LABEL = "Head of Operations";
export const OPS_USER = { firstName: "Adaeze", lastName: "Sample" };

/**
 * An Operations session for the shell's name / role line. `hrLevel` carries the
 * role label because the shell shows that one string; the cast is prototype-only.
 */
export function opsSessionFrom(hr: AdminSession | null): AdminSession | null {
  if (!hr) return null;
  return {
    ...hr,
    id: "ops-user-1",
    role: "ops",
    hrLevel: OPS_ROLE_LABEL as unknown as AdminSession["hrLevel"],
    reference: "BLV-OPS-PLACEHOLDER-1",
    // Operations decides; it does not submit (project lead 2026-10-17).
    capabilities: { ...hr.capabilities, canSubmitForApproval: false, canApproveSelection: true },
    user: { ...OPS_USER, avatarUrl: null },
  };
}

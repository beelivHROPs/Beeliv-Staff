/**
 * The replaceable contract between the Admin UI and its data source:
 * UI -> hooks -> service -> adapter -> (dev fixture NOW, Supabase adapter
 * LATER). An adapter only fetches; it never lives in a component and adds no
 * business rules. Same pattern as lib/client/adapter.ts.
 *
 * Every read must be re-checked by the backend against the user's role and
 * client / outlet scope (RLS); anything the UI hides is a convenience only.
 */
import type { AdminNotification, AdminSession, HrOverview, NavCounts } from "./types";

export type AdapterEvent = "reset";

/** Thrown by an adapter when the backend says the user may not see a domain (403 / RLS). */
export class RestrictedError extends Error {
  constructor(message = "Restricted for this account") {
    super(message);
    this.name = "RestrictedError";
  }
}

export interface AdminAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getSession(): Promise<AdminSession>;
  getHrOverview(): Promise<HrOverview>;
  getNotifications(): Promise<AdminNotification[]>;
  getNavCounts(): Promise<NavCounts>;
}

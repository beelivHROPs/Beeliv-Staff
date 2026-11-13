/**
 * Replaceable contract for Admin Settings: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes; no
 * business rules live in a component. Every write must be re-checked by the
 * backend, and Security actions (password, sessions) belong to the auth provider.
 */
import type { AdapterEvent } from "../adapter";
import type { AdminAccountSettings, AdminNotificationPrefs, PasswordChangeInput, ProfilePatch } from "./types";

export interface SettingsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  getAccount(): Promise<AdminAccountSettings>;
  saveProfile(patch: ProfilePatch): Promise<void>;
  saveNotifications(prefs: AdminNotificationPrefs): Promise<void>;
  changePassword(input: PasswordChangeInput): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeOtherSessions(): Promise<void>;
}

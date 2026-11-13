/**
 * Admin Settings data shapes (account, notification preferences, sessions,
 * agreements) and the device-local workspace preferences. All people / ids in
 * the mock are FICTIONAL. Role, HR level, scope and capabilities are
 * READ-ONLY here: they are set by Operations (needs Beeliv confirmation on who
 * may change them) and the backend is the real boundary.
 */
import type { AdminScope, HrLevel } from "../types";

export interface AdminProfile {
  fullName: string;
  jobTitle: string;
  phone: string;
  /** Sign-in email, managed by the sign-in provider (read-only). */
  email: string | null;
  /** Staff / employee ID, generated server-side. Display only, never composed in a component. */
  employeeId: string | null;
  roleLabel: string;
  hrLevel: HrLevel;
  scope: AdminScope;
  avatarUrl?: string | null;
}

export interface AdminCapabilityRow {
  key: string;
  label: string;
  detail: string;
  allowed: boolean;
}

export interface AdminSessionRow {
  id: string;
  device: string;
  detail: string;
  current: boolean;
}

export interface AdminAgreement {
  id: string;
  title: string;
  version: string | null;
  acknowledged: boolean;
  /** ISO date-time. */
  acknowledgedAt: string | null;
}

export type AdminNotificationPrefKey =
  | "newApplication"
  | "documentResubmitted"
  | "interviewToday"
  | "clientFeedback"
  | "clientRequest"
  | "leaveRequest"
  | "inboxAssignment"
  | "announcement"
  | "channelInApp"
  | "channelEmail";

export type AdminNotificationPrefs = Record<AdminNotificationPrefKey, boolean>;

export interface SelectOptionRow {
  value: string;
  label: string;
}

/** Choice lists come from the adapter, never hard-coded in a component. */
export interface SettingsOptions {
  landing: SelectOptionRow[];
  sort: SelectOptionRow[];
  batch: SelectOptionRow[];
  weekStart: SelectOptionRow[];
  timeFormat: SelectOptionRow[];
  timezoneLabel: string;
}

export interface AdminAccountSettings {
  profile: AdminProfile;
  capabilities: AdminCapabilityRow[];
  sessions: AdminSessionRow[];
  agreements: AdminAgreement[];
  notifications: AdminNotificationPrefs;
  options: SettingsOptions;
}

export interface ProfilePatch {
  fullName: string;
  jobTitle: string;
  phone: string;
}

export interface PasswordChangeInput {
  current: string;
  next: string;
}

/** Device-local workspace + display preferences (a per-person setting is a backend item, TBD). */
export interface AdminPrefs {
  /** Route the user lands on after sign-in. */
  landing: string;
  /** Default list sort token (adapter option value). */
  sort: string;
  /** Rows per "Show more" batch. */
  batch: number;
  /** Default client or outlet filter id, or "all". */
  clientFilter: string;
  weekStart: "mon" | "sun" | "sat";
  timeFormat: "12h" | "24h";
  /** Theme preference. The sidebar switch only sets light/dark. */
  theme: "light" | "dark" | "system";
}

/**
 * DEV FIXTURE for Admin Settings. Everything is FICTIONAL. Identity, HR level,
 * scope and capabilities come from the existing Admin session; the staff ID is
 * a PLACEHOLDER standing in for a server-generated value. Session list,
 * password change and revoke are previews held in memory only (no auth yet).
 * Replace with a Supabase / auth-provider adapter implementing SettingsAdapter.
 */
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { getSession } from "../service";
import type { SettingsAdapter } from "./adapter";
import type { AdminAccountSettings, AdminNotificationPrefs, AdminSessionRow, ProfilePatch } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

/** loading / error scenarios and the ?state=restricted preview (unauthorized). */
async function gate(ms: number) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("state") === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
}

const KEY = "bv-admin-account-mock";
type Stored = { profile?: ProfilePatch; notifications?: AdminNotificationPrefs; revoked?: string[] };

function read(): Stored {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Stored | null) ?? {};
  } catch {
    return {};
  }
}
function write(patch: Stored) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    // Keep going; the fixture just won't survive a reload.
  }
}

const DEFAULT_NOTIFICATIONS: AdminNotificationPrefs = {
  newApplication: true,
  documentResubmitted: true,
  interviewToday: true,
  clientFeedback: true,
  clientRequest: true,
  leaveRequest: true,
  inboxAssignment: true,
  announcement: true,
  channelInApp: true,
  channelEmail: false,
};

const SESSIONS: AdminSessionRow[] = [
  { id: "ses-1", device: "Windows · Chrome", detail: "Current session", current: true },
  { id: "ses-2", device: "MacBook · Safari", detail: "Last active 1 day ago", current: false },
  { id: "ses-3", device: "iPhone · Safari", detail: "Last active 3 days ago", current: false },
];

const OPTIONS: AdminAccountSettings["options"] = {
  landing: [
    { value: "/admin", label: "Overview" },
    { value: "/admin/inbox", label: "Inbox / Requests" },
    { value: "/admin/recruitment/applicants", label: "Applicants" },
    { value: "/admin/recruitment/vacancies", label: "Vacancies" },
    { value: "/admin/recruitment/documentation", label: "Documentation" },
    { value: "/admin/calendar", label: "Calendar" },
  ],
  sort: [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "name", label: "Name A to Z" },
  ],
  batch: [10, 20, 50].map((n) => ({ value: String(n), label: `${n} rows` })),
  weekStart: [
    { value: "mon", label: "Monday" },
    { value: "sun", label: "Sunday" },
    { value: "sat", label: "Saturday" },
  ],
  timeFormat: [
    { value: "12h", label: "12-hour (2:30 pm)" },
    { value: "24h", label: "24-hour (14:30)" },
  ],
  timezoneLabel: "Africa/Lagos (WAT, UTC+1)",
};

export const mockSettingsAdapter: SettingsAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  async getAccount(): Promise<AdminAccountSettings> {
    await gate(300);
    const s = await getSession();
    const stored = read();
    const c = s.capabilities;
    return {
      profile: {
        fullName: stored.profile?.fullName ?? `${s.user.firstName} ${s.user.lastName}`,
        jobTitle: stored.profile?.jobTitle ?? s.hrLevel,
        phone: stored.profile?.phone ?? "08031234567",
        email: `${s.user.firstName.toLowerCase()}.sample@example.invalid`,
        employeeId: s.reference,
        roleLabel: "Human Resources",
        hrLevel: s.hrLevel,
        scope: s.scope,
        avatarUrl: s.user.avatarUrl,
      },
      capabilities: [
        { key: "canCreateVacancy", label: "Create vacancies", detail: "Draft a new vacancy.", allowed: c.canCreateVacancy },
        { key: "canSubmitForApproval", label: "Submit for approval", detail: "Send a selection or offer to Operations for approval.", allowed: c.canSubmitForApproval },
        { key: "canApproveSelection", label: "Approve selection", detail: "Final approval belongs to Operations.", allowed: c.canApproveSelection },
      ],
      sessions: SESSIONS.filter((x) => !(stored.revoked ?? []).includes(x.id)),
      agreements: [
        { id: "ag-1", title: "Staff confidentiality agreement", version: "1.0", acknowledged: true, acknowledgedAt: "2026-08-03T09:20:00" },
        { id: "ag-2", title: "Data protection acknowledgement", version: "1.0", acknowledged: true, acknowledgedAt: "2026-08-03T09:24:00" },
      ],
      notifications: { ...DEFAULT_NOTIFICATIONS, ...stored.notifications },
      options: OPTIONS,
    };
  },

  async saveProfile(patch) {
    await sleep(350);
    write({ profile: patch });
  },
  async saveNotifications(prefs) {
    await sleep(150);
    write({ notifications: prefs });
  },
  async changePassword() {
    // Preview only: no auth provider yet, nothing is changed.
    await sleep(500);
  },
  async revokeSession(id) {
    await sleep(250);
    write({ revoked: [...(read().revoked ?? []), id] });
  },
  async revokeOtherSessions() {
    await sleep(250);
    write({ revoked: SESSIONS.filter((x) => !x.current).map((x) => x.id) });
  },
};

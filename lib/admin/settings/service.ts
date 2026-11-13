/**
 * SettingsService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 * Also owns the device-local workspace preferences (localStorage), which other
 * Admin screens can read through useAdminPrefs / getAdminPrefs.
 */
import type { SettingsAdapter } from "./adapter";
import { mockSettingsAdapter } from "./mock";
import type { AdminPrefs } from "./types";

const adapter: SettingsAdapter = mockSettingsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeSettings: SettingsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getAccount: SettingsAdapter["getAccount"] = () => adapter.getAccount();
export const saveProfile: SettingsAdapter["saveProfile"] = (p) => adapter.saveProfile(p);
export const saveNotifications: SettingsAdapter["saveNotifications"] = (p) => adapter.saveNotifications(p);
export const changePassword: SettingsAdapter["changePassword"] = (i) => adapter.changePassword(i);
export const revokeSession: SettingsAdapter["revokeSession"] = (id) => adapter.revokeSession(id);
export const revokeOtherSessions: SettingsAdapter["revokeOtherSessions"] = () => adapter.revokeOtherSessions();

/* ---------- device-local preferences (in memory + localStorage) ---------- */

const PREFS_KEY = "bv-admin-prefs";
export const DEFAULT_ADMIN_PREFS: AdminPrefs = { landing: "/admin", sort: "newest", batch: 10, clientFilter: "all", weekStart: "mon", timeFormat: "24h", theme: "light" };

let prefs: AdminPrefs = DEFAULT_ADMIN_PREFS;
let hydrated = false;
const prefListeners = new Set<() => void>();

function hydratePrefs() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const p = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null") as Partial<AdminPrefs> | null;
    if (p) {
      prefs = {
        landing: typeof p.landing === "string" ? p.landing : prefs.landing,
        sort: typeof p.sort === "string" ? p.sort : prefs.sort,
        batch: [10, 20, 50].includes(Number(p.batch)) ? Number(p.batch) : prefs.batch,
        clientFilter: typeof p.clientFilter === "string" ? p.clientFilter : prefs.clientFilter,
        weekStart: p.weekStart === "sun" || p.weekStart === "sat" ? p.weekStart : "mon",
        timeFormat: p.timeFormat === "12h" ? "12h" : "24h",
        theme: p.theme === "dark" || p.theme === "system" ? p.theme : "light",
      };
    }
  } catch {
    // Corrupt / unavailable storage: keep defaults.
  }
}

export function getAdminPrefs(): AdminPrefs {
  hydratePrefs();
  return prefs;
}

export function setAdminPrefs(patch: Partial<AdminPrefs>) {
  hydratePrefs();
  prefs = { ...prefs, ...patch };
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Keep in memory only.
  }
  prefListeners.forEach((l) => l());
}

export function subscribeAdminPrefs(cb: () => void): () => void {
  prefListeners.add(cb);
  return () => {
    prefListeners.delete(cb);
  };
}

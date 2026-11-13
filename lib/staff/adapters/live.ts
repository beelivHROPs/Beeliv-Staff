/**
 * Live Staff adapter. Only the personal-details slice is served (docs/contracts/staff-personal-details-wire.md). Every other
 * method throws StaffNotConnectedError so a screen shows its own error state: it NEVER returns fixture or sample data.
 * Harmless empties: getNavCounts -> {} and getNotifications -> [].
 * Sensitive inputs go to the transport body only; this file never logs, keeps or echoes them.
 * Only relative imports so it can be unit-tested offline.
 */
import type { AdapterEvent, StaffAdapter } from "../adapter";
import { enrollmentCall, enrollmentWrite, StaffNotConnectedError } from "../enrollment-transport";
import { onboardingFromChecklist, type EnrollmentChecklist } from "../onboarding-checklist";
import type { AccessibilityInput, AccountStatus, Entitlements, StaffProfile, BankDetailsInput, NextOfKinInput, NinInput, StaffEmployer, StaffEmployment, StaffHome, StaffPersonalDetails, StaffSensitiveStatus } from "../types";

import { getLiveStaffDocuments, sendLiveStaffDocument } from "../document-transport";
const listeners = new Set<(event: AdapterEvent) => void>();
const emit = (e: AdapterEvent) => listeners.forEach((l) => l(e));
const notConnected = <T>(): Promise<T> => Promise.reject(new StaffNotConnectedError());

/** Runs a write, then tells subscribers to refresh. A failed write notifies nobody. */
async function wrote<T>(run: () => Promise<T>): Promise<T> {
  const value = await run();
  emit("change");
  return value;
}

/** What `profile-get` returns: five fields, no id. */
type ProfileWire = { fullName: string; phone: string; email: string; setupState: "pending-setup" | "pending-approval" | "active" | "suspended"; entitlements: { applicant: boolean; staff: boolean } };

/** Splits at the FIRST space only: no guessing about middle names, titles or surnames. */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const name = fullName.trim();
  const at = name.indexOf(" ");
  return at < 0 ? { firstName: name, lastName: "" } : { firstName: name.slice(0, at), lastName: name.slice(at + 1).trim() };
}

/** Honest account status: "onboarding" while setup is not active or any checklist item is open; "suspended" only when the server says so. */
export function accountStatusFor(setupState: ProfileWire["setupState"], checklistOpen: boolean): AccountStatus {
  if (setupState === "suspended") return "suspended";
  return setupState !== "active" || checklistOpen ? "onboarding" : "active";
}

async function getStaffProfile(): Promise<StaffProfile> {
  const [p, checklist] = await Promise.all([enrollmentCall<ProfileWire>("profile-get"), enrollmentCall<EnrollmentChecklist>("checklist-get")]);
  const open = onboardingFromChecklist(checklist).some((i) => !i.done);
  // staffId is not served, so it is empty; no Staff screen prints it. Nothing else is invented.
  return { id: "", staffId: "", ...splitFullName(p.fullName), preferredName: null, email: p.email, phone: p.phone.trim() ? p.phone : null, avatarUrl: null, roleLabel: "Staff", accountStatus: accountStatusFor(p.setupState, open) };
}

async function getEntitlements(): Promise<Entitlements> {
  const p = await enrollmentCall<ProfileWire>("profile-get");
  return { applicant: p.entitlements.applicant === true, staff: p.entitlements.staff === true, client: false, hr: false, ops: false };
}

/**
 * No fixtures: nothing here is invented. Identity fields are blank because this slice does not serve them, and the account is
 * "onboarding" only while a profile item is still open (otherwise "active"). Everything else is empty.
 */
async function getStaffHome(): Promise<StaffHome> {
  const checklist = await enrollmentCall<EnrollmentChecklist>("checklist-get");
  const onboarding = onboardingFromChecklist(checklist);
  const open = onboarding.some((i) => !i.done);
  return {
    profile: { id: "", staffId: "", firstName: "", lastName: "", preferredName: null, email: "", phone: null, avatarUrl: null, roleLabel: "", accountStatus: open ? "onboarding" : "active" },
    assignment: null,
    today: { state: "no-shift", shift: null, checkedInAt: null, checkedOutAt: null, attentionReason: null },
    todaysShifts: [],
    requiredActions: [],
    upcoming: [],
    recentAttendance: [],
    leave: [],
    leaveSummary: null,
    learning: [],
    learningSummary: null,
    announcements: [],
    onboarding: open ? onboarding : null,
  };
}

export const liveStaffAdapter: StaffAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getStaffHome,
  getEntitlements,
  getStaffProfile,
  getNavCounts: async () => ({}),
  getCurrentAssignment: () => notConnected(),
  getAssignmentHistory: () => notConnected(),
  getSchedule: () => notConnected(),
  getTodayAttendance: () => notConnected(),
  getAttendanceHistory: () => notConnected(),
  getLeaveRequests: () => notConnected(),
  getStaffDocuments: getLiveStaffDocuments,
  getSOPs: () => notConnected(),
  getSopLibrary: () => notConnected(),
  getTraining: () => notConnected(),
  getStaffRecords: () => notConnected(),
  getAnnouncements: () => notConnected(),
  getNotifications: async () => [],
  getPersonalDetails: () => enrollmentCall<StaffPersonalDetails>("personal-get"),
  getEmployment: () => enrollmentCall<StaffEmployment>("employment-get"),
  getSensitiveStatus: () => enrollmentCall<StaffSensitiveStatus>("sensitive-status"),

  checkIn: () => notConnected(),
  checkOut: () => notConnected(),
  requestLeave: () => notConnected(),
  cancelLeaveRequest: () => notConnected(),
  uploadStaffDocument: (slot, file) => wrote(() => sendLiveStaffDocument(slot, file)),
  replaceStaffDocument: (slot, file) => wrote(() => sendLiveStaffDocument(slot, file)),
  acknowledgeAgreement: () => notConnected(),
  startTraining: () => notConnected(),
  completeTraining: () => notConnected(),
  acknowledgeSOP: () => notConnected(),
  openSop: () => notConnected(),
  completeSOP: () => notConnected(),
  saveSOPProgress: () => notConnected(),
  markNotificationRead: () => notConnected(),
  deleteNotification: () => notConnected(),
  acknowledgeStaffRecord: () => notConnected(),
  updateStaffContact: () => notConnected(),
  savePersonalDetails: (input: StaffPersonalDetails) => wrote(() => enrollmentWrite<StaffPersonalDetails>("personal-save", { input })),
  saveEmployer: (which: "current" | "previous", input: StaffEmployer) => wrote(() => enrollmentWrite<StaffEmployment>("employer-save", { which, input })),
  saveNextOfKin: (input: NextOfKinInput) => wrote(() => enrollmentWrite<StaffSensitiveStatus>("kin-save", { input })),
  saveNin: (input: NinInput) => wrote(() => enrollmentWrite<StaffSensitiveStatus>("nin-save", { input })),
  saveBankDetails: (input: BankDetailsInput) => wrote(() => enrollmentWrite<StaffSensitiveStatus>("bank-save", { input })),
  saveAccessibility: (input: AccessibilityInput) => wrote(() => enrollmentWrite<StaffSensitiveStatus>("accessibility-save", { input })),
};

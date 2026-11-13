/**
 * Staff domain service: the single door the hooks and UI actions use. It
 * delegates to the active adapter and adds NO business rules (lateness,
 * entitlement, approval...) - those belong to the backend.
 *
 * To go live: change the one `adapter` line to the Supabase adapter.
 */
import type { StaffAdapter } from "./adapter";
import { mockStaffAdapter } from "./adapters/mock";
import { liveStaffAdapter } from "./adapters/live";
import { staffMode } from "./mode";
import { reacceptNotes, subscribeReaccept } from "@/lib/reaccept/store";
import { fromStaff } from "@/lib/notifications/adapters";
import type { SharedNotification } from "@/lib/notifications/types";
import type { AccessibilityInput, BankDetailsInput, DateRange, LeaveRequestInput, NextOfKinInput, NinInput, StaffEmployer, StaffPersonalDetails } from "./types";

/**
 * Picks the data source per call: the live adapter when the server says live (staffMode()), otherwise the dev fixture.
 * A production build fails safe to live (lib/staff/mode.ts). Every export below keeps its name and signature.
 */
const adapter: StaffAdapter = new Proxy({} as StaffAdapter, {
  get(_target, key) {
    const source = (staffMode() === "live" ? liveStaffAdapter : mockStaffAdapter) as unknown as Record<string | symbol, unknown>;
    const value = source[key];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(source) : value;
  },
});

export const subscribeStaff: StaffAdapter["subscribe"] = (l) => {
  // Both sources: the mode can be set after this module loads, and a source that is not in use never emits.
  const a = mockStaffAdapter.subscribe(l);
  const c = liveStaffAdapter.subscribe(l);
  const b = subscribeReaccept(() => l("reset"));
  return () => {
    a();
    c();
    b();
  };
};

// Reads
export const getStaffHome = () => adapter.getStaffHome();
export const getEntitlements = () => adapter.getEntitlements();
export const getStaffProfile = () => adapter.getStaffProfile();
export const getNavCounts = () => adapter.getNavCounts();
export const getCurrentAssignment = () => adapter.getCurrentAssignment();
export const getAssignmentHistory = () => adapter.getAssignmentHistory();
export const getSchedule = (range: DateRange) => adapter.getSchedule(range);
export const getTodayAttendance = () => adapter.getTodayAttendance();
export const getAttendanceHistory = () => adapter.getAttendanceHistory();
export const getLeaveRequests = () => adapter.getLeaveRequests();
export const getStaffDocuments = () => adapter.getStaffDocuments();
export const getSOPs = () => adapter.getSOPs();
export const getSopLibrary = () => adapter.getSopLibrary();
export const getTraining = () => adapter.getTraining();
export const getStaffRecords = () => adapter.getStaffRecords();
export const getAnnouncements = () => adapter.getAnnouncements();
export const getPersonalDetails = () => adapter.getPersonalDetails();
export const getEmployment = () => adapter.getEmployment();
export const getSensitiveStatus = () => adapter.getSensitiveStatus();
// Re-acceptance entries are a preview fixture (lib/reaccept/store.ts); empty unless the demo flag is on.
/** The same notifications in the shared shape (lib/notifications/types.ts), through the small adapter. */
export const getSharedNotifications = async (): Promise<SharedNotification[]> => (await getNotifications()).map(fromStaff);
export const getNotifications = async () => [...(staffMode() === "live" ? [] : reacceptNotes("staff")).map((n) => ({ id: n.id, event: "announcement" as const, title: n.title, message: n.message, destination: { href: "/staff", label: "Review and accept" }, read: n.read, createdAt: n.createdAt })), ...(await adapter.getNotifications())];

// Actions
export const checkIn = () => adapter.checkIn();
export const checkOut = () => adapter.checkOut();
export const requestLeave = (input: LeaveRequestInput) => adapter.requestLeave(input);
export const cancelLeaveRequest = (id: string) => adapter.cancelLeaveRequest(id);
export const uploadStaffDocument = (documentId: string, file: File) => adapter.uploadStaffDocument(documentId, file);
export const replaceStaffDocument = (documentId: string, file: File) => adapter.replaceStaffDocument(documentId, file);
export const acknowledgeAgreement = (agreementId: string) => adapter.acknowledgeAgreement(agreementId);
export const startTraining = (assignmentId: string) => adapter.startTraining(assignmentId);
export const completeTraining = (assignmentId: string) => adapter.completeTraining(assignmentId);
export const openSop = (assignmentId: string) => adapter.openSop(assignmentId);
export const acknowledgeSOP = (assignmentId: string) => adapter.acknowledgeSOP(assignmentId);
export const completeSOP = (assignmentId: string) => adapter.completeSOP(assignmentId);
export const saveSOPProgress = (assignmentId: string, sectionIndex: number) => adapter.saveSOPProgress(assignmentId, sectionIndex);
export const markNotificationRead = (id: string) => adapter.markNotificationRead(id);
export const deleteNotification = (id: string) => adapter.deleteNotification(id);
export const acknowledgeStaffRecord = (id: string) => adapter.acknowledgeStaffRecord(id);
export const updateStaffContact = (patch: { preferredName: string | null; phone: string | null }) => adapter.updateStaffContact(patch);
export const savePersonalDetails = (input: StaffPersonalDetails) => adapter.savePersonalDetails(input);
export const saveEmployer = (which: "current" | "previous", input: StaffEmployer) => adapter.saveEmployer(which, input);
// Sensitive, write-only: callers must never log these inputs or put them in a URL, toast or analytics event.
export const saveNextOfKin = (input: NextOfKinInput) => adapter.saveNextOfKin(input);
export const saveNin = (input: NinInput) => adapter.saveNin(input);
export const saveBankDetails = (input: BankDetailsInput) => adapter.saveBankDetails(input);
export const saveAccessibility = (input: AccessibilityInput) => adapter.saveAccessibility(input);

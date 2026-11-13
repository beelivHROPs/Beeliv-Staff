/**
 * The replaceable contract between the Staff UI and its data source
 * (brief section 18): UI -> hooks -> service -> adapter -> (dev fixture NOW,
 * Supabase adapter LATER). An adapter only fetches and mutates; it never
 * lives in a component. Business rules stay on the backend.
 */
import type {
  AccessibilityInput,
  AgreementAcceptance,
  Announcement,
  AttendanceRecord,
  BankDetailsInput,
  DateRange,
  Entitlements,
  LeaveRequest,
  LeaveRequestInput,
  NavCounts,
  NextOfKinInput,
  NinInput,
  Notification,
  SOPAssignment,
  Shift,
  StaffAssignment,
  StaffDocument,
  StaffEmployer,
  StaffEmployment,
  StaffHome,
  StaffPersonalDetails,
  StaffProfile,
  StaffRecord,
  StaffSensitiveStatus,
  TodayAttendance,
  TrainingAssignment,
} from "./types";
import type { SopItem } from "./sops/types";

/** "change" = data mutated (refresh quietly); "reset" = a different dataset (show loading again). */
export type AdapterEvent = "change" | "reset";

export interface StaffAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;

  // Reads
  getStaffHome(): Promise<StaffHome>;
  getEntitlements(): Promise<Entitlements>;
  getStaffProfile(): Promise<StaffProfile>;
  getNavCounts(): Promise<NavCounts>;
  getCurrentAssignment(): Promise<StaffAssignment | null>;
  getAssignmentHistory(): Promise<StaffAssignment[]>;
  getSchedule(range: DateRange): Promise<Shift[]>;
  getTodayAttendance(): Promise<TodayAttendance>;
  getAttendanceHistory(): Promise<AttendanceRecord[]>;
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getStaffDocuments(): Promise<StaffDocument[]>;
  getSOPs(): Promise<SOPAssignment[]>;
  /** SOPs assigned to this person with their link and read receipt. Server-scoped: never another person's. */
  getSopLibrary(): Promise<SopItem[]>;
  getTraining(): Promise<TrainingAssignment[]>;
  getStaffRecords(): Promise<StaffRecord[]>;
  getAnnouncements(): Promise<Announcement[]>;
  getNotifications(): Promise<Notification[]>;
  getPersonalDetails(): Promise<StaffPersonalDetails>;
  getEmployment(): Promise<StaffEmployment>;
  /** Masked status only. The full NIN, account number, next of kin or health answer is never returned. */
  getSensitiveStatus(): Promise<StaffSensitiveStatus>;

  // Actions (the backend decides whether each is allowed and returns the new state)
  checkIn(): Promise<TodayAttendance>;
  checkOut(): Promise<TodayAttendance>;
  requestLeave(input: LeaveRequestInput): Promise<LeaveRequest>;
  cancelLeaveRequest(id: string): Promise<LeaveRequest>;
  uploadStaffDocument(documentId: string, file: File): Promise<StaffDocument>;
  replaceStaffDocument(documentId: string, file: File): Promise<StaffDocument>;
  acknowledgeAgreement(agreementId: string): Promise<AgreementAcceptance>;
  startTraining(assignmentId: string): Promise<TrainingAssignment>;
  completeTraining(assignmentId: string): Promise<TrainingAssignment>;
  /** Records the staff member's acknowledgement of an assigned SOP (completes it). */
  acknowledgeSOP(assignmentId: string): Promise<SOPAssignment>;
  /** Records that this person opened the SOP's link (read receipt for the current version) and returns the updated item. */
  openSop(assignmentId: string): Promise<SopItem>;
  /** Marks an assigned SOP that needs no acknowledgement as read/complete. */
  completeSOP(assignmentId: string): Promise<SOPAssignment>;
  /** Saves the reader's place (moving on marks earlier sections read); the backend derives progress %. */
  saveSOPProgress(assignmentId: string, sectionIndex: number): Promise<SOPAssignment>;
  markNotificationRead(id: string): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;
  /** Records / profile actions (Warnings & Records, Profile). Backend decides what is allowed. */
  acknowledgeStaffRecord(id: string): Promise<StaffRecord>;
  updateStaffContact(patch: { preferredName: string | null; phone: string | null }): Promise<StaffProfile>;
  savePersonalDetails(input: StaffPersonalDetails): Promise<StaffPersonalDetails>;
  saveEmployer(which: "current" | "previous", input: StaffEmployer): Promise<StaffEmployment>;
  /** Sensitive, write-only. The first save is recorded; later saves become a change for HR review. Each returns the masked status. */
  saveNextOfKin(input: NextOfKinInput): Promise<StaffSensitiveStatus>;
  saveNin(input: NinInput): Promise<StaffSensitiveStatus>;
  saveBankDetails(input: BankDetailsInput): Promise<StaffSensitiveStatus>;
  saveAccessibility(input: AccessibilityInput): Promise<StaffSensitiveStatus>;
}

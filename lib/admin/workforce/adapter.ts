/**
 * Replaceable contract for Workforce: UI -> hooks -> service -> adapter ->
 * (dev fixture NOW, Supabase adapter LATER). The adapter fetches and writes;
 * no business rule lives in a component. Every call must be re-checked by the
 * backend against role and client / outlet scope (RLS), and every write must
 * create a history record (spec 30, 32.2). `get*` return null when the record
 * does not exist or is outside the user's scope.
 */
import type { AdapterEvent } from "../adapter";
import type {
  AttendanceDetail,
  AttendancePage,
  AttendanceQuery,
  CorrectionInput,
  LeavePage,
  LeaveQuery,
  LeaveRow,
  SchedulePage,
  ScheduleQuery,
  StaffLeaveHistory,
  TimeOffQuery,
  TimeOffResult,
  ShiftConflict,
  ShiftInput,
  WarningDetail,
  WarningInput,
  WarningsPage,
  WarningsQuery,
  WeekRoster,
  ISODate,
} from "./types";

export interface WorkforceAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;

  listAttendance(query: AttendanceQuery): Promise<AttendancePage>;
  getAttendance(id: string): Promise<AttendanceDetail | null>;
  requestCorrection(id: string, input: CorrectionInput): Promise<AttendanceDetail>;

  listLeave(query: LeaveQuery): Promise<LeavePage>;
  /** Approved leave across any date range, scoped like the Leave page. */
  listTimeOff(query: TimeOffQuery): Promise<TimeOffResult>;
  /** Null when the person does not exist or is outside the user's scope. */
  getStaffLeaveHistory(staffId: string): Promise<StaffLeaveHistory | null>;
  approveLeave(id: string): Promise<LeaveRow>;
  declineLeave(id: string, input: { reason: string }): Promise<LeaveRow>;

  getSchedule(query: ScheduleQuery): Promise<SchedulePage>;
  checkShiftConflicts(outletId: string, shiftId: string | null, input: ShiftInput): Promise<ShiftConflict[]>;
  saveShift(outletId: string, shiftId: string | null, input: ShiftInput): Promise<WeekRoster>;
  removeShift(outletId: string, shiftId: string): Promise<WeekRoster>;
  publishWeek(outletId: string, weekStart: ISODate): Promise<WeekRoster>;
  /** Withdraws the week from staff; every shift goes back to draft. */
  unpublishWeek(outletId: string, weekStart: ISODate): Promise<WeekRoster>;
  copyLastWeek(outletId: string, weekStart: ISODate): Promise<WeekRoster>;

  listWarnings(query: WarningsQuery): Promise<WarningsPage>;
  getWarning(id: string): Promise<WarningDetail | null>;
  issueWarning(input: WarningInput): Promise<WarningDetail>;
  withdrawWarning(id: string, input: { reason: string }): Promise<WarningDetail>;
}

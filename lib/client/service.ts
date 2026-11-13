/**
 * ClientAnalyticsService: the single door the hooks use (brief section 27).
 * It delegates to the active adapter and adds NO business rules (lateness,
 * coverage thresholds, compliance limits...) - those belong to the backend.
 *
 * To go live: change the one `adapter` line to the Supabase adapter.
 */
import type { ClientAnalyticsAdapter } from "./adapter";
import { mockClientAdapter } from "./adapters/mock";
import { unavailableClientAdapter } from "./adapters/unavailable";
import { reacceptNotes, subscribeReaccept } from "@/lib/reaccept/store";
import { fromClient } from "@/lib/notifications/adapters";
import type { SharedNotification } from "@/lib/notifications/types";
import type { CandidateFeedbackInput, DateRange, ISODate, NewWorkforceRequest, OnboardingSave, OutletScope } from "./types";

const adapter: ClientAnalyticsAdapter = process.env.NODE_ENV === "production" ? unavailableClientAdapter : mockClientAdapter;

export const subscribeClient: ClientAnalyticsAdapter["subscribe"] = (l) => {
  const a = adapter.subscribe(l);
  const b = subscribeReaccept(() => l("reset"));
  return () => {
    a();
    b();
  };
};

export const getSession = () => adapter.getSession();

export const getOverview = (scope: OutletScope) => adapter.getOverview(scope);
export const getAttendanceSummary = (scope: OutletScope, date: ISODate) => adapter.getAttendanceSummary(scope, date);
export const getAttendanceTrend = (scope: OutletScope, range: DateRange) => adapter.getAttendanceTrend(scope, range);
export const getWorkforceDistribution = (scope: OutletScope) => adapter.getWorkforceDistribution(scope);
export const getScheduleCoverage = (scope: OutletScope, date: ISODate) => adapter.getScheduleCoverage(scope, date);
export const getWeekSchedule = (scope: OutletScope, weekOf: ISODate) => adapter.getWeekSchedule(scope, weekOf);
export const getRecruitmentSummary = (scope: OutletScope) => adapter.getRecruitmentSummary(scope);
export const getComplianceSummary = (scope: OutletScope) => adapter.getComplianceSummary(scope);
export const getPayrollVisibility = (scope: OutletScope) => adapter.getPayrollVisibility(scope);
export const getRecentActivity = (scope: OutletScope) => adapter.getRecentActivity(scope);
// Re-acceptance entries are a preview fixture (lib/reaccept/store.ts); empty unless the demo flag is on.
export const getNotifications = async (scope: OutletScope) => [...reacceptNotes("client").map((n) => ({ id: n.id, kind: "agreement.reacceptance" as const, title: n.title, message: n.message, createdAt: n.createdAt, read: n.read, href: "/client" })), ...(await adapter.getNotifications(scope))];
/** The same notifications in the shared shape (lib/notifications/types.ts), through the small adapter. */
export const getSharedNotifications = async (scope: OutletScope): Promise<SharedNotification[]> => (await getNotifications(scope)).map(fromClient);
export const markNotificationRead = (id: string) => adapter.markNotificationRead(id);
export const deleteNotification = (id: string) => adapter.deleteNotification(id);
export const markAllNotificationsRead = () => adapter.markAllNotificationsRead();

export const getWorkforce = (scope: OutletScope) => adapter.getWorkforce(scope);
export const getAttendanceRecords = (scope: OutletScope, range: DateRange) => adapter.getAttendanceRecords(scope, range);
export const getCandidates = (scope: OutletScope) => adapter.getCandidates(scope);
export const getWorkforceRequests = (scope: OutletScope) => adapter.getWorkforceRequests(scope);
export const getDocuments = (scope: OutletScope) => adapter.getDocuments(scope);

export const getCandidate = (scope: OutletScope, id: string) => adapter.getCandidate(scope, id);
export const submitCandidateFeedback = (scope: OutletScope, id: string, input: CandidateFeedbackInput) => adapter.submitCandidateFeedback(scope, id, input);
export const getWorkforceRequest = (scope: OutletScope, id: string) => adapter.getWorkforceRequest(scope, id);
export const createWorkforceRequest = (scope: OutletScope, input: NewWorkforceRequest) => adapter.createWorkforceRequest(scope, input);
export const getWorkforceRequestReasons = () => adapter.getWorkforceRequestReasons();
export const getWorkforceMemberDetail = (scope: OutletScope, memberId: string) => adapter.getWorkforceMemberDetail(scope, memberId);
export const getSchedule = (scope: OutletScope, range: DateRange) => adapter.getSchedule(scope, range);

export const getOnboarding = () => adapter.getOnboarding();
export const saveOnboarding = (input: OnboardingSave) => adapter.saveOnboarding(input);

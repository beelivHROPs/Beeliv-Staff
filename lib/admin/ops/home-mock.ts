/**
 * DEV FIXTURE for the Operations Home company numbers. FICTIONAL names.
 * Nothing is invented here that another Operations screen already owns: clients
 * without HR and the HR workload come from the Clients & HR service, open jobs
 * and placements this month from the Business-at-a-glance service (scope "all"),
 * so Home always agrees with those screens. Only "interviews this week" is a
 * stand-in constant (no Operations-wide interviews source exists yet).
 * The real adapter derives all of these server-side from one source.
 * Same previews as the approvals mock: ?state=restricted, and the shell's
 * "Prototype state" control (loading / empty / error), which those services honour.
 */
import { getGlance } from "../glance/service";
import { MOCK_OUTLETS, scopedStaffRows } from "../staff/mock";
import { listAssignments } from "./assignments-service";
import type { OpsCompany, OpsHomeAdapter } from "./home-types";

const INTERVIEWS_THIS_WEEK_STAND_IN = 11;
/**
 * STAND-INS (no company-wide source exists yet; the real adapter derives them
 * server-side, ops-overview.md section 2): attendance exceptions need the
 * attendance feed, unassigned staff need a staff-without-outlet query, and
 * coverage gaps need required-versus-rostered headcount per outlet.
 */
const ATTENDANCE_EXCEPTIONS_STAND_IN = 4;
const UNASSIGNED_STAFF_STAND_IN = 3;
const COVERAGE_GAPS_STAND_IN = 2;

export const mockOpsHomeAdapter: OpsHomeAdapter = {
  async getCompany(): Promise<OpsCompany> {
    const [glance, assignments] = await Promise.all([getGlance("all"), listAssignments({ search: "", show: "all", hrId: "" })]);
    const num = (key: string) => Number(glance.tiles.find((t) => t.key === key)?.value ?? 0) || 0;
    const empty = assignments.workspaceEmpty;
    const staffRows = scopedStaffRows();
    const clients = glance.byClient.map((c) => ({
      id: c.id,
      name: c.name,
      outlets: MOCK_OUTLETS.filter((o) => o.clientId === c.id).length,
      deployedStaff: staffRows.filter((s) => s.clientId === c.id && s.status !== "suspended").length,
      hr: assignments.rows.find((r) => r.id === c.id)?.hr?.name ?? c.hr,
      openVacancies: c.openJobs,
      requestsWaiting: c.requestsWaiting,
    }));
    const funnel = glance.charts.find((c) => c.id === "funnel")?.spec;
    const reached = (label: string) => (funnel && funnel.kind === "bars" ? (funnel.rows.find((r) => r.label === label)?.value ?? 0) : 0);
    const workforce = empty ? { attendanceExceptions: 0, unassignedStaff: 0, coverageGaps: 0 } : { attendanceExceptions: ATTENDANCE_EXCEPTIONS_STAND_IN, unassignedStaff: UNASSIGNED_STAFF_STAND_IN, coverageGaps: COVERAGE_GAPS_STAND_IN };
    return {
      activeClients: empty ? 0 : glance.byClient.filter((c) => c.statusLabel === "Active").length,
      activeOutlets: empty ? 0 : MOCK_OUTLETS.length,
      deployedStaff: empty ? 0 : num("staff"),
      openWorkforceRequests: empty ? 0 : num("requests"),
      operationalExceptions: workforce.attendanceExceptions + workforce.unassignedStaff + workforce.coverageGaps,
      workforce,
      recruitment: { openVacancies: empty ? 0 : num("jobs"), candidatesInProgress: empty ? 0 : Math.max(0, reached("Shortlisted") - reached("Placed")), placementsThisMonth: empty ? 0 : num("placements") },
      clients: empty ? [] : clients,
      openJobs: empty ? 0 : num("jobs"),
      placementsThisMonth: empty ? 0 : num("placements"),
      interviewsThisWeek: empty ? 0 : INTERVIEWS_THIS_WEEK_STAND_IN,
      clientsWithoutHr: assignments.counts.unassigned,
      hrWorkload: assignments.load.map((l) => ({ id: l.hr.id, name: l.hr.name, openVacancies: l.openVacancies, pendingItems: l.pendingItems, clients: l.clients })),
      asOf: new Date().toISOString(),
    };
  },
};

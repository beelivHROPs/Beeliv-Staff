/**
 * WorkforceService: the single door the hooks use. Delegates to the active
 * adapter and adds NO business rules. To go live: change the one `adapter` line.
 */
import type { WorkforceAdapter } from "./adapter";
import { mockWorkforceAdapter } from "./mock";

const adapter: WorkforceAdapter = mockWorkforceAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeWorkforce: WorkforceAdapter["subscribe"] = (l) => adapter.subscribe(l);

export const listAttendance: WorkforceAdapter["listAttendance"] = (q) => adapter.listAttendance(q);
export const getAttendance: WorkforceAdapter["getAttendance"] = (id) => adapter.getAttendance(id);
export const requestCorrection: WorkforceAdapter["requestCorrection"] = (id, i) => adapter.requestCorrection(id, i);

export const listLeave: WorkforceAdapter["listLeave"] = (q) => adapter.listLeave(q);
export const listTimeOff: WorkforceAdapter["listTimeOff"] = (q) => adapter.listTimeOff(q);
export const getStaffLeaveHistory: WorkforceAdapter["getStaffLeaveHistory"] = (id) => adapter.getStaffLeaveHistory(id);
export const approveLeave: WorkforceAdapter["approveLeave"] = (id) => adapter.approveLeave(id);
export const declineLeave: WorkforceAdapter["declineLeave"] = (id, i) => adapter.declineLeave(id, i);

export const getSchedule: WorkforceAdapter["getSchedule"] = (q) => adapter.getSchedule(q);
export const checkShiftConflicts: WorkforceAdapter["checkShiftConflicts"] = (o, s, i) => adapter.checkShiftConflicts(o, s, i);
export const saveShift: WorkforceAdapter["saveShift"] = (o, s, i) => adapter.saveShift(o, s, i);
export const removeShift: WorkforceAdapter["removeShift"] = (o, s) => adapter.removeShift(o, s);
export const unpublishWeek: WorkforceAdapter["unpublishWeek"] = (o, w) => adapter.unpublishWeek(o, w);
export const publishWeek: WorkforceAdapter["publishWeek"] = (o, w) => adapter.publishWeek(o, w);
export const copyLastWeek: WorkforceAdapter["copyLastWeek"] = (o, w) => adapter.copyLastWeek(o, w);

export const listWarnings: WorkforceAdapter["listWarnings"] = (q) => adapter.listWarnings(q);
export const getWarning: WorkforceAdapter["getWarning"] = (id) => adapter.getWarning(id);
export const issueWarning: WorkforceAdapter["issueWarning"] = (i) => adapter.issueWarning(i);
export const withdrawWarning: WorkforceAdapter["withdrawWarning"] = (id, i) => adapter.withdrawWarning(id, i);

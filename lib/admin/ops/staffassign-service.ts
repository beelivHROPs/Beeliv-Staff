/**
 * Operations "Staff Assignments" service: the single door the hooks use. No business rules here.
 * Mock or live is chosen per call from the server's decision (lib/admin/org-records/mode.ts). Live never falls back to the fixture.
 */
import type { OpsStaffAssignAdapter } from "./staffassign-adapter";
import { mockOpsStaffAssignAdapter } from "./staffassign-mock";
import { getRoles } from "../lists/store";
import { createLiveOpsStaffAssignAdapter } from "../org-records/live";
import { orgRecordsMode } from "../org-records/mode";

// Roles come from Lists & Rules (open question 3 of the org-records design); the server accepts any role text.
const live = createLiveOpsStaffAssignAdapter(() => getRoles(true).map((r) => r.name));
const adapter = (): OpsStaffAssignAdapter => (orgRecordsMode() === "live" ? live : mockOpsStaffAssignAdapter);

export const subscribeStaffAssign: OpsStaffAssignAdapter["subscribe"] = (l) => {
  const stopMock = mockOpsStaffAssignAdapter.subscribe(l);
  const stopLive = live.subscribe(l);
  return () => { stopMock(); stopLive(); };
};
export const listStaff: OpsStaffAssignAdapter["listStaff"] = (q) => adapter().listStaff(q);
export const getStaff: OpsStaffAssignAdapter["getStaff"] = (id) => adapter().getStaff(id);
export const reassign: OpsStaffAssignAdapter["reassign"] = (id, i) => adapter().reassign(id, i);

/**
 * StaffService: the single door the hooks use. Adds NO business rules.
 * Mock or live is chosen per call from the server's decision (lib/admin/org-records/mode.ts). Live never falls back to the fixture.
 */
import type { StaffAdapter } from "./adapter";
import { mockStaffAdapter } from "./mock";
import { createLiveStaffAdapter } from "../org-records/live";
import { orgRecordsMode } from "../org-records/mode";

const live = createLiveStaffAdapter();
const adapter = (): StaffAdapter => (orgRecordsMode() === "live" ? live : mockStaffAdapter);

export const subscribeStaff: StaffAdapter["subscribe"] = (l) => {
  const stopMock = mockStaffAdapter.subscribe(l);
  const stopLive = live.subscribe(l);
  return () => { stopMock(); stopLive(); };
};
export const listStaff: StaffAdapter["listStaff"] = (q) => adapter().listStaff(q);
export const getStaff: StaffAdapter["getStaff"] = (id) => adapter().getStaff(id);
export const listAssignments: StaffAdapter["listAssignments"] = (q) => adapter().listAssignments(q);
export const assign: StaffAdapter["assign"] = (i) => adapter().assign(i);
export const listDocuments: StaffAdapter["listDocuments"] = (q) => adapter().listDocuments(q);

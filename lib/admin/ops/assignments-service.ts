/** Operations "Clients & HR" service: the single door the hooks use. No business rules here. To go live: change the one `adapter` line. */
import type { OpsAssignmentsAdapter } from "./assignments-adapter";
import { mockOpsAssignmentsAdapter } from "./assignments-mock";

const adapter: OpsAssignmentsAdapter = mockOpsAssignmentsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeAssignments: OpsAssignmentsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listAssignments: OpsAssignmentsAdapter["listAssignments"] = (q) => adapter.listAssignments(q);
export const getAssignment: OpsAssignmentsAdapter["getAssignment"] = (id) => adapter.getAssignment(id);
export const assignHr: OpsAssignmentsAdapter["assignHr"] = (id, i) => adapter.assignHr(id, i);

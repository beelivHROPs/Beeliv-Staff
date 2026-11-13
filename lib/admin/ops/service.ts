/** Operations service: the single door the hooks use. Delegates to the active adapters and adds NO business rules. To go live: change the one `adapter` line per file. */
import type { OpsApprovalsAdapter } from "./adapter";
import type { OpsHomeAdapter } from "./home-types";
import { mockOpsHomeAdapter } from "./home-mock";
import { mockOpsApprovalsAdapter } from "./mock";

const adapter: OpsApprovalsAdapter = mockOpsApprovalsAdapter; // DEV FIXTURE until the backend adapter exists
const homeAdapter: OpsHomeAdapter = mockOpsHomeAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeOps: OpsApprovalsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getOpsSummary: OpsApprovalsAdapter["getSummary"] = () => adapter.getSummary();
export const listApprovals: OpsApprovalsAdapter["listApprovals"] = (q) => adapter.listApprovals(q);
export const getApproval: OpsApprovalsAdapter["getApproval"] = (id) => adapter.getApproval(id);
export const decideApproval: OpsApprovalsAdapter["decide"] = (id, i) => adapter.decide(id, i);
export const getOpsCompany: OpsHomeAdapter["getCompany"] = () => homeAdapter.getCompany();

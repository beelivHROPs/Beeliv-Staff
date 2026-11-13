/** Operations Activity service: the single door the hooks use. No business rules. To go live: change the one `adapter` line. */
import { mockOpsActivityAdapter } from "./activity-mock";
import type { OpsActivityAdapter } from "./activity-types";

const adapter: OpsActivityAdapter = mockOpsActivityAdapter; // DEV FIXTURE until the backend adapter exists

export const listActivity: OpsActivityAdapter["listActivity"] = (q) => adapter.listActivity(q);

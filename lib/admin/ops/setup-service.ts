/** Operations Setup service: the single door the hooks use. No business rules here. To go live: change the one `adapter` line. */
import type { OpsSetupAdapter } from "./setup-adapter";
import { mockOpsSetupAdapter } from "./setup-mock";

const adapter: OpsSetupAdapter = mockOpsSetupAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeSetup: OpsSetupAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const getSetupOverview: OpsSetupAdapter["getOverview"] = () => adapter.getOverview();
export const getSetupSection: OpsSetupAdapter["getSection"] = (id) => adapter.getSection(id);
export const saveSetupSection: OpsSetupAdapter["saveSection"] = (id, v, rev) => adapter.saveSection(id, v, rev);
export const getSetupRoles: OpsSetupAdapter["getRoles"] = () => adapter.getRoles();

/** Operations reports service: the single door the hooks use. No business rules here. To go live: change the one `adapter` line. */
import type { OpsReportsAdapter } from "./opsreports-adapter";
import { mockOpsReportsAdapter } from "./opsreports-mock";

const adapter: OpsReportsAdapter = mockOpsReportsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeOpsReports: OpsReportsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listOpsReports: OpsReportsAdapter["listReports"] = () => adapter.listReports();
export const getOpsReportFacets: OpsReportsAdapter["getFacets"] = () => adapter.getFacets();
export const getOpsReport: OpsReportsAdapter["getReport"] = (q) => adapter.getReport(q);

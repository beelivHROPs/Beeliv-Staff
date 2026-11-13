/** ReportsService: the single door the hooks use. Delegates to the active adapter and adds NO business rules. To go live: change the one `adapter` line. */
import type { ReportsAdapter } from "./adapter";
import { mockReportsAdapter } from "./mock";

const adapter: ReportsAdapter = mockReportsAdapter; // DEV FIXTURE until the backend adapter exists

export const subscribeReports: ReportsAdapter["subscribe"] = (l) => adapter.subscribe(l);
export const listReports: ReportsAdapter["listReports"] = () => adapter.listReports();
export const getReportFacets: ReportsAdapter["getFacets"] = () => adapter.getFacets();
export const getReport: ReportsAdapter["getReport"] = (q) => adapter.getReport(q);

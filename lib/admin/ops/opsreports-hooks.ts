"use client";

/** Operations reports hooks. `{ data, status, retry }`, status: loading | ready | empty | error | restricted. */
import { useLoad, type Live } from "./assignments-hooks";
import * as service from "./opsreports-service";
import type { OpsReportData, OpsReportFacets, OpsReportHubEntry, OpsReportQuery } from "./opsreports-types";

export const useOpsReportList = (): Live<OpsReportHubEntry[]> => useLoad(() => service.listOpsReports(), "list", (d) => d === null || d.length === 0, service.subscribeOpsReports);
export const useOpsReportFacets = (): Live<OpsReportFacets> => useLoad(() => service.getOpsReportFacets(), "facets", (d) => d === null, service.subscribeOpsReports);
export const useOpsReport = (q: OpsReportQuery): Live<OpsReportData> => useLoad(() => service.getOpsReport(q), JSON.stringify(q), (d) => d === null || d.workspaceEmpty, service.subscribeOpsReports);

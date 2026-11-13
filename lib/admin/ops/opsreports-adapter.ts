/**
 * Replaceable contract for Operations company reports: UI -> hooks -> service ->
 * adapter -> (dev fixture NOW, Supabase adapter LATER). Figures are computed
 * server-side, scoped to the caller (Operations: all clients and HR officers),
 * never in the browser. Export is NOT part of this contract yet (an audited
 * server action, needs Beeliv confirmation); the screen offers only a clearly
 * labelled mock.
 */
import type { AdapterEvent } from "../adapter";
import type { OpsReportData, OpsReportFacets, OpsReportHubEntry, OpsReportQuery } from "./opsreports-types";

export interface OpsReportsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listReports(): Promise<OpsReportHubEntry[]>;
  getFacets(): Promise<OpsReportFacets>;
  getReport(query: OpsReportQuery): Promise<OpsReportData>;
}

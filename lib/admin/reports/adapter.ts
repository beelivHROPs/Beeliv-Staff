/**
 * Replaceable contract for Reports: UI -> hooks -> service -> adapter -> (dev
 * fixture NOW, Supabase adapter LATER). The adapter returns finished aggregates
 * for the filters given and must re-check role and client / outlet scope (RLS).
 * Export is NOT part of this contract: when it exists it is a logged action
 * (spec 30, 32.2) and is not available in the demo.
 */
import type { AdapterEvent } from "../adapter";
import type { ReportData, ReportEntry, ReportFacets, ReportQuery } from "./types";

export interface ReportsAdapter {
  subscribe(listener: (event: AdapterEvent) => void): () => void;
  listReports(): Promise<ReportEntry[]>;
  getFacets(): Promise<ReportFacets>;
  getReport(query: ReportQuery): Promise<ReportData>;
}

import type { ComplianceState } from "@/lib/client/types";

/** ?status= values on /client/compliance. "attention" = everything not complete (the default view). */
export type ComplianceFilter = "attention" | ComplianceState | "all";
export const COMPLIANCE_FILTERS: ComplianceFilter[] = ["attention", "outstanding", "update-required", "expiring", "complete", "all"];

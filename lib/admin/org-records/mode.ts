/**
 * Which data source the org-records screens (Clients, Outlets, Staff records, Placements) use.
 *
 * The decision is made on the SERVER (lib/server/org-records/mode.ts, from the environment and the
 * ORG_RECORDS_* flags) and handed to the browser by <OrgRecordsModeProvider> in the Admin layout.
 * Browser code cannot read those flags itself. Until the provider has run, a production build
 * fails SAFE to "live" (never sample data); a development build uses "mock", exactly as before.
 */
export type OrgRecordsMode = "mock" | "live";
export type OrgRecordsConfig = { mode: OrgRecordsMode; writes: boolean };

let config: OrgRecordsConfig = { mode: process.env.NODE_ENV === "production" ? "live" : "mock", writes: false };

export function setOrgRecordsConfig(next: OrgRecordsConfig): void {
  config = next;
}
export const orgRecordsMode = (): OrgRecordsMode => config.mode;
/** True only in live mode with ORG_RECORDS_WRITES_ENABLED. Entry buttons for the new actions use this. */
export const orgRecordsWritesAvailable = (): boolean => config.mode === "live" && config.writes;

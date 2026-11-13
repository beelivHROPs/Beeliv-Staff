/**
 * Which data source the Staff screens use.
 *
 * The decision is made on the SERVER (lib/server/staff-enrollment/mode.ts, from the environment and the STAFF_ENROLLMENT_*
 * flags) and handed to the browser by <StaffModeProvider> in the Staff business layout. Browser code cannot read those flags.
 * Until the provider has run, a production build fails SAFE to "live" (never sample data); a development build uses "mock".
 */
export type StaffMode = "mock" | "live";
export type StaffModeConfig = { mode: StaffMode; writes: boolean };

let config: StaffModeConfig = { mode: process.env.NODE_ENV === "production" ? "live" : "mock", writes: false };

export function setStaffModeConfig(next: StaffModeConfig): void {
  config = next;
}
export const staffMode = (): StaffMode => config.mode;

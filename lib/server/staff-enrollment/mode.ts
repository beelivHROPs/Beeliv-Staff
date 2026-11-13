import "server-only";
import { areaOpen, sampleDataOn } from "@/lib/env/sample-data";
import { staffEnrollmentEnabled } from "./flags";

/**
 * Pure decision (offline-testable). Same rule as org-records:
 *  live: the enrollment flags are all on, OR sample data is not allowed here (production), OR the Staff area is not open, so a
 *        screen can never fall back to fixtures; with the flags off the endpoints answer "unavailable" and the screen shows its
 *        error state.
 *  mock: local/staging with sample data allowed and the flags off (unchanged behaviour).
 * `writes` only says the write flag is on; the server still re-checks everything on every call.
 */
export function decideStaffMode(input: { enabled: boolean; sampleData: boolean; areaOpen: boolean; writesFlag: boolean }): { mode: "mock" | "live"; writes: boolean } {
  const live = input.enabled || !input.sampleData || !input.areaOpen;
  return { mode: live ? "live" : "mock", writes: live && input.enabled && input.writesFlag };
}

/** Server decision for the Staff data screens, handed to the browser by <StaffModeProvider> in the Staff business layout. */
export function staffEnrollmentConfig(): { mode: "mock" | "live"; writes: boolean } {
  return decideStaffMode({
    enabled: staffEnrollmentEnabled(), sampleData: sampleDataOn(), areaOpen: areaOpen("staff"), writesFlag: process.env.STAFF_ENROLLMENT_WRITES_ENABLED === "true",
  });
}

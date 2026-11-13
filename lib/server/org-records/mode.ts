import "server-only";
import { areaOpen, sampleDataOn } from "@/lib/env/sample-data";
import { orgRecordsEnabled } from "./runtime";

/**
 * Server decision for the Admin org-records screens.
 *  live: the org-records flags are all on, OR sample data is not allowed here (production), so a
 *        screen can never fall back to fixtures; with the flags off the endpoints answer
 *        "unavailable" and the screen shows its error state.
 *  mock: local/staging with sample data allowed and the flags off (unchanged behaviour).
 * Whether the area is open at all stays with areaOpen("admin") in the Admin layout.
 * `writes` only says the write flag is on; the server still re-checks everything.
 */
export function orgRecordsConfig(): { mode: "mock" | "live"; writes: boolean } {
  const live = orgRecordsEnabled() || !sampleDataOn() || !areaOpen("admin");
  return { mode: live ? "live" : "mock", writes: live && orgRecordsEnabled() && process.env.ORG_RECORDS_WRITES_ENABLED === "true" };
}

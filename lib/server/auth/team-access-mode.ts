import "server-only";
import { authMode } from "@/lib/auth/mode";
import { sampleDataOn } from "@/lib/env/sample-data";

/**
 * Server decision for the Admin Team & Access screens.
 *  live: the auth backend is in charge (AUTH_BACKEND_ENABLED, or any production build) OR sample data is
 *        not allowed in this environment. Live never falls back to fixtures: a screen whose live call
 *        is not connected shows its error state instead of invented people.
 *  mock: local/staging with sample data allowed and the auth backend off (unchanged behaviour).
 * Whether the area is open at all stays with areaOpen("admin") in the Admin layout.
 */
export function teamAccessConfig(): { mode: "mock" | "live" } {
  return { mode: authMode() === "live" || !sampleDataOn() ? "live" : "mock" };
}

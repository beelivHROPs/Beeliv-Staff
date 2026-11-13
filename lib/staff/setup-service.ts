"use client";

import type { AuthMode } from "@/lib/auth/mode";
import type { SetupAdapter } from "@/lib/admin/setup/adapter";
import { createLiveSetupAdapter } from "@/lib/admin/setup/live";
import { mockStaffSetupAdapter } from "@/lib/admin/setup/mock";

/** Staff setup uses the same setup requests as Client/Admin, on the Talent app ("staff" maps to "talent" on the wire). Production always uses the real transport. */
export function createStaffSetupService(mode: AuthMode): SetupAdapter {
  return process.env.NODE_ENV === "production" || mode === "live"
    ? createLiveSetupAdapter("staff") : mockStaffSetupAdapter;
}

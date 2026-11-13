"use client";

import type { AuthMode } from "@/lib/auth/mode";
import type { SetupAdapter } from "./adapter";
import { createLiveSetupAdapter } from "./live";
import { mockSetupAdapter } from "./mock";

/** Production always selects the real transport, even if an unexpected preview prop is supplied. */
export function createAdminSetupService(mode: AuthMode): SetupAdapter {
  return process.env.NODE_ENV === "production" || mode === "live"
    ? createLiveSetupAdapter("admin") : mockSetupAdapter;
}

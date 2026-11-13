"use client";

import type { AuthMode } from "@/lib/auth/mode";
import type { SetupAdapter } from "@/lib/admin/setup/adapter";
import { createLiveSetupAdapter } from "@/lib/admin/setup/live";
import { mockClientSetupAdapter } from "@/lib/admin/setup/mock";

export function createClientSetupService(mode: AuthMode): SetupAdapter {
  return process.env.NODE_ENV === "production" || mode === "live"
    ? createLiveSetupAdapter("client") : mockClientSetupAdapter;
}

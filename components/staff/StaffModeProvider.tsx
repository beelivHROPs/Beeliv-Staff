"use client";

import type { ReactNode } from "react";
import { setStaffModeConfig, type StaffModeConfig } from "@/lib/staff/mode";

/**
 * Hands the server's live/mock decision to the browser-side Staff services. The setter runs during render on purpose, so it is
 * in place before any child effect starts its first fetch. It only stores two plain values and is safe to repeat.
 */
export function StaffModeProvider({ config, children }: { config: StaffModeConfig; children: ReactNode }) {
  setStaffModeConfig(config);
  return <>{children}</>;
}

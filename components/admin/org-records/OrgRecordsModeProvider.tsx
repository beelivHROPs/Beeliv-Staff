"use client";

import type { ReactNode } from "react";
import { setOrgRecordsConfig, type OrgRecordsConfig } from "@/lib/admin/org-records/mode";

/**
 * Hands the server's live/mock decision to the browser-side services. The setter runs during render on
 * purpose, so it is in place before any child effect starts its first fetch (child effects run before
 * parent effects). It only stores two plain values and is safe to repeat.
 */
export function OrgRecordsModeProvider({ config, children }: { config: OrgRecordsConfig; children: ReactNode }) {
  setOrgRecordsConfig(config);
  return <>{children}</>;
}

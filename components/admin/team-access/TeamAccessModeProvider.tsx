"use client";

import type { ReactNode } from "react";
import { setTeamAccessConfig, type TeamAccessConfig } from "@/lib/admin/team-access/mode";

/**
 * Hands the server's live/mock decision to the browser-side Team & Access service. The setter runs during
 * render on purpose, so it is in place before any child effect starts its first call (child effects run
 * before parent effects). It only stores plain values and is safe to repeat.
 */
export function TeamAccessModeProvider({ config, children }: { config: TeamAccessConfig; children: ReactNode }) {
  setTeamAccessConfig(config);
  return <>{children}</>;
}

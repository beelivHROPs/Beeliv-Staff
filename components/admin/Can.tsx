"use client";

/**
 * Renders its children only when the current Admin role may do `cap`. Hidden means
 * hidden (never greyed). Presentation only: the server re-checks (lib/admin/role-access.ts).
 */
import type { ReactNode } from "react";
import { useCan, type AdminCapability } from "@/lib/admin/role-access";

export function Can({ cap, children }: { cap: AdminCapability; children: ReactNode }) {
  return useCan(cap) ? <>{children}</> : null;
}

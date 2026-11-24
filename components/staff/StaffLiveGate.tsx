"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

/**
 * Live Staff (lead rule 2026-11-21): real data or "Coming soon", never sample data and never an error-looking panel.
 * These approved screens have no backend yet. Real today: Home, Profile, Documents, Schedule, Attendance, Leave, Notifications, Settings, Help, Search.
 */
const SOON: { prefix: string; title: string }[] = [
  { prefix: "/staff/assignment", title: "My assignment" },
  { prefix: "/staff/sops-training", title: "SOPs & Training" },
  { prefix: "/staff/records", title: "Records" },
  { prefix: "/staff/forms", title: "Forms & tests" },
  { prefix: "/staff/application-history", title: "Application history" },
];

export function StaffLiveGate({ live, children }: { live: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const soon = live ? SOON.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`)) : undefined;
  return soon ? <ComingSoonScreen title={soon.title} /> : <>{children}</>;
}

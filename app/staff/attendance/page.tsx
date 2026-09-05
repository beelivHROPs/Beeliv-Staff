import type { Metadata } from "next";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const metadata: Metadata = { title: "My Attendance" };

/**
 * Whether Assigned Staff can view their own attendance is `rbac.md`'s own
 * "Still open" #3 — the Proposal only gives explicit attendance access to
 * Client, Assigned HR, and Head of Operations. Reserved here per project-
 * lead direction (a Level 3 decision, docs/BEELIV-SOURCE-OF-TRUTH.md §2) —
 * logged as an open item in that doc's §17, not silently treated as
 * Beeliv-confirmed. Same placeholder pattern as every other not-yet-built
 * Attendance screen (hr/, client/, ops/).
 */
export default function StaffAttendancePage() {
  return (
    <ComingSoonScreen
      title="My Attendance"
      description="Your own attendance/lateness record (Stage 2 build)."
    />
  );
}

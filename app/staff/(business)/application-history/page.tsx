import type { Metadata } from "next";
import { ApplicationHistoryBody } from "@/components/staff/history/ApplicationHistoryBody";

export const metadata: Metadata = { title: "Application history" };

export default function StaffApplicationHistoryPage() {
  return <ApplicationHistoryBody />;
}

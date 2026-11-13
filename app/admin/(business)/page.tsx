import type { Metadata } from "next";
import { OverviewBody } from "@/components/admin/overview/OverviewBody";
import { LiveHome } from "@/components/admin/LiveHome";
import { sampleDataOn } from "@/lib/env/sample-data";

export const metadata: Metadata = { title: "Home" };

// The designed dashboard still reads sample numbers, so a live deployment shows the real "start here" page instead.
export default function AdminOverviewPage() {
  return sampleDataOn() ? <OverviewBody /> : <LiveHome variant="hr" />;
}

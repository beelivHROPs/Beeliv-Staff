import type { Metadata } from "next";
import { OpsHome } from "@/components/admin/ops/OpsHome";
import { LiveHome } from "@/components/admin/LiveHome";
import { sampleDataOn } from "@/lib/env/sample-data";

export const metadata: Metadata = { title: "Operations Home" };

// The designed Operations dashboard still reads sample numbers, so a live deployment shows the real "start here" page instead.
export default function OpsHomePage() {
  return sampleDataOn() ? <OpsHome /> : <LiveHome variant="ops" />;
}

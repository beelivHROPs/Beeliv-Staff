import type { Metadata } from "next";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const metadata: Metadata = { title: "My Schedule" };

export default function StaffSchedulePage() {
  return (
    <ComingSoonScreen
      title="My Schedule"
      description="Work schedule and shift assignments (Stage 2 build)."
    />
  );
}

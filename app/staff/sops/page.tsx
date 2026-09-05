import type { Metadata } from "next";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const metadata: Metadata = { title: "SOPs & Training" };

export default function StaffSopsPage() {
  return (
    <ComingSoonScreen
      title="SOPs & Training"
      description="Relevant SOPs and approved training materials (Stage 2 build)."
    />
  );
}

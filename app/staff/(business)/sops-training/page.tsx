import type { Metadata } from "next";
import { SopsBody } from "@/components/staff/sops/SopsBody";

export const metadata: Metadata = { title: "SOPs & Training" };

export default function StaffSopsPage() {
  return <SopsBody />;
}

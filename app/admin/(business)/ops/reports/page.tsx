import type { Metadata } from "next";
import { OpsReportsHub } from "@/components/admin/ops/opsreports/OpsReportsHub";

export const metadata: Metadata = { title: "Company reports" };

export default function OpsReportsPage() {
  return <OpsReportsHub />;
}

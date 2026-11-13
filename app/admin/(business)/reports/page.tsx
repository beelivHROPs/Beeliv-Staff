import type { Metadata } from "next";
import { ReportsHub } from "@/components/admin/reports/ReportsHub";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <ReportsHub />;
}

import type { Metadata } from "next";
import { RecordsBody } from "@/components/staff/records/RecordsBody";

export const metadata: Metadata = { title: "Warnings & Records" };

export default function StaffRecordsPage() {
  return <RecordsBody />;
}

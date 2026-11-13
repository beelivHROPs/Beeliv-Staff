import type { Metadata } from "next";
import { ComplianceBody } from "@/components/client/compliance/ComplianceBody";
import { COMPLIANCE_FILTERS } from "@/components/client/compliance/filters";

export const metadata: Metadata = { title: "Documents & Compliance" };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const initial = COMPLIANCE_FILTERS.find((f) => f === status) ?? "attention";
  return <ComplianceBody key={initial} initialFilter={initial} />;
}

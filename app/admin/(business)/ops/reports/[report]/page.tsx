import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isOpsReportId } from "@/components/admin/ops/opsreports/meta";
import { OpsReportView } from "@/components/admin/ops/opsreports/OpsReportView";

export const metadata: Metadata = { title: "Company report" };

export default async function OpsReportPage({ params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  if (!isOpsReportId(report)) notFound();
  // useSearchParams (range and filters) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading report" />}>
      <OpsReportView report={report} />
    </Suspense>
  );
}

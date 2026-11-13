import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isReportId } from "@/components/admin/reports/meta";
import { ReportView } from "@/components/admin/reports/ReportView";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  if (!isReportId(report)) notFound();
  // useSearchParams (period, client, vacancy) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading report" />}>
      <ReportView report={report} />
    </Suspense>
  );
}

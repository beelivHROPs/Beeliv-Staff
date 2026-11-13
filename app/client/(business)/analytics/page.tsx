import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsBody } from "@/components/client/analytics/AnalyticsBody";

export const metadata: Metadata = { title: "Analytics" };

export default function ClientAnalyticsPage() {
  // AnalyticsBody reads ?family=&department=... via useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AnalyticsBody />
    </Suspense>
  );
}

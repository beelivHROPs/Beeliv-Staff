import type { Metadata } from "next";
import { Suspense } from "react";
import { WarningsList } from "@/components/admin/workforce/WarningsList";

export const metadata: Metadata = { title: "Warnings" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Warnings" />}>
      <WarningsList />
    </Suspense>
  );
}

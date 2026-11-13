import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplatesList } from "@/components/admin/journey/TemplatesList";

export const metadata: Metadata = { title: "Job templates" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[240px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <TemplatesList />
    </Suspense>
  );
}

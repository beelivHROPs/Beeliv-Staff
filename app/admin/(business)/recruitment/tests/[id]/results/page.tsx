import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsView } from "@/components/admin/tests/ResultsView";

export const metadata: Metadata = { title: "Results" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <ResultsView formId={id} />
    </Suspense>
  );
}

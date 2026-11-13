import type { Metadata } from "next";
import { Suspense } from "react";
import { TestsList } from "@/components/admin/tests/TestsList";

export const metadata: Metadata = { title: "Tests & Forms" };

export default function Page() {
  // useSearchParams (filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <TestsList />
    </Suspense>
  );
}

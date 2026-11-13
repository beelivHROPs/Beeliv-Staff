import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentationQueue } from "@/components/admin/documentation/DocumentationQueue";

export const metadata: Metadata = { title: "Documentation" };

export default function DocumentationPage() {
  // useSearchParams (the ?status= tab from Overview links) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading documents" />}>
      <DocumentationQueue />
    </Suspense>
  );
}

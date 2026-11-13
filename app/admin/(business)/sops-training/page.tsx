import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentList } from "@/components/admin/sops-training/ContentList";

export const metadata: Metadata = { title: "SOPs & Training" };

export default function Page() {
  // useSearchParams (tab and filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading SOPs and training" />}>
      <ContentList />
    </Suspense>
  );
}

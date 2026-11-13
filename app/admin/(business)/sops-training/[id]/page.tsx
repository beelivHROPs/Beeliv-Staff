import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentDetailView } from "@/components/admin/sops-training/ContentDetailView";

export const metadata: Metadata = { title: "SOPs & Training" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <ContentDetailView id={id} />
    </Suspense>
  );
}

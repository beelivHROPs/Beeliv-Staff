import type { Metadata } from "next";
import { Suspense } from "react";
import { ApprovalDetailView } from "@/components/admin/ops/ApprovalDetailView";

export const metadata: Metadata = { title: "Approval" };

export default async function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading approval" />}>
      <ApprovalDetailView id={id} />
    </Suspense>
  );
}

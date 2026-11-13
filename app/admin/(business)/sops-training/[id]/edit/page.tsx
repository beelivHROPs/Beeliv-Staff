import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentForm } from "@/components/admin/sops-training/ContentForm";

export const metadata: Metadata = { title: "Edit SOP or training" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading form" />}>
      <ContentForm contentId={id} />
    </Suspense>
  );
}

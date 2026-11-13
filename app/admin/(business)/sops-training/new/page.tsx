import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentForm } from "@/components/admin/sops-training/ContentForm";

export const metadata: Metadata = { title: "New SOP or training" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading form" />}>
      <ContentForm />
    </Suspense>
  );
}

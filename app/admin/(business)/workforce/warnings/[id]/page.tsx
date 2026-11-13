import type { Metadata } from "next";
import { Suspense } from "react";
import { WarningDetail } from "@/components/admin/workforce/WarningDetail";

export const metadata: Metadata = { title: "Warning" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Warning" />}>
      <WarningDetail id={id} />
    </Suspense>
  );
}

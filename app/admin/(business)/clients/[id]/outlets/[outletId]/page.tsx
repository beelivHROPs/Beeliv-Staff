import type { Metadata } from "next";
import { Suspense } from "react";
import { OutletDetailView } from "@/components/admin/clients/OutletDetailView";

export const metadata: Metadata = { title: "Outlet" };

export default async function OutletPage({ params }: { params: Promise<{ id: string; outletId: string }> }) {
  const { id, outletId } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading outlet" />}>
      <OutletDetailView clientId={id} outletId={outletId} />
    </Suspense>
  );
}

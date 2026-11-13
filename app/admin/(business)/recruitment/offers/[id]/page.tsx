import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferDetailView } from "@/components/admin/offers/OfferDetailView";

export const metadata: Metadata = { title: "Offer" };

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The record is keyed by its internal id, never by a BLV-* reference.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading offer" />}>
      <OfferDetailView id={id} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferForm } from "@/components/admin/offers/OfferForm";

export const metadata: Metadata = { title: "Edit draft offer" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading the offer form" />}>
      <OfferForm offerId={id} />
    </Suspense>
  );
}

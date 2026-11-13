import type { Metadata } from "next";
import { Suspense } from "react";
import { OffersList } from "@/components/admin/offers/OffersList";

export const metadata: Metadata = { title: "Offers" };

export default function OffersPage() {
  // useSearchParams (tab and filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading offers" />}>
      <OffersList />
    </Suspense>
  );
}

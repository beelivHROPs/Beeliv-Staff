import type { Metadata } from "next";
import { Suspense } from "react";
import { OfferForm } from "@/components/admin/offers/OfferForm";

export const metadata: Metadata = { title: "New offer" };

export default function NewOfferPage() {
  // ?applicantId= (from Applicant 360) prefills the applicant.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading the offer form" />}>
      <OfferForm />
    </Suspense>
  );
}

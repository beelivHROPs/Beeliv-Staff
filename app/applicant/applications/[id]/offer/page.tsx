import type { Metadata } from "next";
import { OfferBody } from "@/components/applicant/OfferBody";

export const metadata: Metadata = { title: "Your offer" };

type Params = Promise<{ id: string }>;

export default async function ApplicantOfferPage({ params }: { params: Params }) {
  const { id } = await params;
  return <OfferBody key={id} applicationId={id} />;
}

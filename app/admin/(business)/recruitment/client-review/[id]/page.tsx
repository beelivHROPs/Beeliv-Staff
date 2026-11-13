import type { Metadata } from "next";
import { ClientReviewDetailView } from "@/components/admin/client-review/ClientReviewDetailView";

export const metadata: Metadata = { title: "Client Review" };

export default async function ClientReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed by the internal submission id, never by a BLV-* reference.
  return <ClientReviewDetailView id={id} />;
}

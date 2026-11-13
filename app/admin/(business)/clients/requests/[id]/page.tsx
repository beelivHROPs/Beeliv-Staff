import type { Metadata } from "next";
import { ClientRequestDetailView } from "@/components/admin/client-requests/ClientRequestDetailView";

export const metadata: Metadata = { title: "Client Request" };

export default async function ClientRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed by the internal request id, never by a BLV-* reference.
  return <ClientRequestDetailView id={id} />;
}

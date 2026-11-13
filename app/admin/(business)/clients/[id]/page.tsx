import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientDetailView } from "@/components/admin/clients/ClientDetailView";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading client" />}>
      <ClientDetailView id={id} />
    </Suspense>
  );
}

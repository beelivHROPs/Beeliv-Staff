import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientRequestsList } from "@/components/admin/client-requests/ClientRequestsList";

export const metadata: Metadata = { title: "Client Requests" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Client Requests" />}>
      <ClientRequestsList />
    </Suspense>
  );
}

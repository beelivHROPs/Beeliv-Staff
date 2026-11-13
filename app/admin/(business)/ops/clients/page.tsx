import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientsDirectory } from "@/components/admin/ops/orgs/ClientsDirectory";

export const metadata: Metadata = { title: "Clients & Outlets" };

export default function OpsClientsPage() {
  // useSearchParams (filters live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading clients" />}>
      <ClientsDirectory />
    </Suspense>
  );
}

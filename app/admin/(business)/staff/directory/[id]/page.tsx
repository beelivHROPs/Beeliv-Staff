import type { Metadata } from "next";
import { Suspense } from "react";
import { StaffDetailView } from "@/components/admin/staff/StaffDetailView";

export const metadata: Metadata = { title: "Staff record" };

export default async function StaffRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed by the internal id, never a BLV-* reference.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading staff record" />}>
      <StaffDetailView id={id} />
    </Suspense>
  );
}

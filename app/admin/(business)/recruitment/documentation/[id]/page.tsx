import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentViewer } from "@/components/admin/documentation/DocumentViewer";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The record is keyed by its internal id, never by a BLV-* reference.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading document" />}>
      <DocumentViewer id={id} />
    </Suspense>
  );
}

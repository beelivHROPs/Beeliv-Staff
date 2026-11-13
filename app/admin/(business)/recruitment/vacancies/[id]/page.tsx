import type { Metadata } from "next";
import { Suspense } from "react";
import { VacancyDetailView } from "@/components/admin/vacancies/VacancyDetailView";

export const metadata: Metadata = { title: "Vacancy" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Keyed by the internal id, never a BLV-* reference.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading vacancy" />}>
      <VacancyDetailView id={id} />
    </Suspense>
  );
}

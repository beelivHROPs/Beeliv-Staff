import type { Metadata } from "next";
import { Suspense } from "react";
import { VacancyForm } from "@/components/admin/vacancies/VacancyForm";

export const metadata: Metadata = { title: "Edit vacancy" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading form" />}>
      <VacancyForm vacancyId={id} />
    </Suspense>
  );
}

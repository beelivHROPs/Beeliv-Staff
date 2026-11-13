import type { Metadata } from "next";
import { Suspense } from "react";
import { VacancyForm } from "@/components/admin/vacancies/VacancyForm";

export const metadata: Metadata = { title: "New vacancy" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading form" />}>
      <VacancyForm />
    </Suspense>
  );
}

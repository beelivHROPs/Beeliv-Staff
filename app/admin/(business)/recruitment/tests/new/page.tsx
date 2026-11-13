import type { Metadata } from "next";
import { Suspense } from "react";
import { FormBuilder } from "@/components/admin/tests/FormBuilder";

export const metadata: Metadata = { title: "New test or form" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />}>
      <FormBuilder id={null} />
    </Suspense>
  );
}

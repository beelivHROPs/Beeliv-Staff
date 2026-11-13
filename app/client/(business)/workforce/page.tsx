import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkforceBody } from "@/components/client/workforce/WorkforceBody";
import { WorkforceSkeleton } from "@/components/client/workforce/WorkforceStates";

export const metadata: Metadata = { title: "My Workforce" };

export default function ClientWorkforcePage() {
  // useSearchParams (department / role / outlet filters) needs a Suspense boundary.
  return (
    <Suspense fallback={<WorkforceSkeleton />}>
      <WorkforceBody />
    </Suspense>
  );
}

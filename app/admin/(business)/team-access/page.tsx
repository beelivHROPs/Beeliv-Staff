import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamAccess } from "@/components/admin/team-access/TeamAccess";

export const metadata: Metadata = { title: "Team & Access" };

export default function Page() {
  // useSearchParams (?tab=) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading Team and Access" />}>
      <TeamAccess />
    </Suspense>
  );
}

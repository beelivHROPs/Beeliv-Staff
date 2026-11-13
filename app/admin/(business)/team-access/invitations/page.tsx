import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamAccess } from "@/components/admin/team-access/TeamAccess";

export const metadata: Metadata = { title: "Invitations" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading invitations" />}>
      <TeamAccess initialTab="invitations" />
    </Suspense>
  );
}

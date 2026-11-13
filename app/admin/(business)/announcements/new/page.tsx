import type { Metadata } from "next";
import { Suspense } from "react";
import { AnnouncementForm } from "@/components/admin/announcements/AnnouncementForm";

export const metadata: Metadata = { title: "New announcement" };

export default function Page() {
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading form" />}>
      <AnnouncementForm />
    </Suspense>
  );
}

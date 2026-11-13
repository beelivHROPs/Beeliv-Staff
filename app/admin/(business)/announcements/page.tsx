import type { Metadata } from "next";
import { Suspense } from "react";
import { AnnouncementsList } from "@/components/admin/announcements/AnnouncementsList";

export const metadata: Metadata = { title: "Announcements" };

export default function Page() {
  // useSearchParams (search and status live in the URL) needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="ap-shimmer h-[320px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading announcements" />}>
      <AnnouncementsList />
    </Suspense>
  );
}

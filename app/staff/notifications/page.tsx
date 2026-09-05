import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Notifications" };

export default function StaffNotificationsPage() {
  return (
    <div>
      <PageHeading title="Notifications" />
      <EmptyState
        variant="tray"
        title="No notifications yet"
        description="HR and operational notices will appear here."
      />
    </div>
  );
}

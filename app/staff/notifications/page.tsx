import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { SAMPLE_STAFF_NOTICES } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Now reflects SAMPLE_STAFF_NOTICES — the same list the AppShell bell's
 * popover shows — instead of always rendering the empty state regardless
 * of real data.
 */
export default function StaffNotificationsPage() {
  return (
    <div>
      <PageHeading title="Notifications" />
      {SAMPLE_STAFF_NOTICES.length > 0 ? (
        <ul className="m-0 list-none divide-y divide-border rounded-lg border border-border bg-card p-0">
          {SAMPLE_STAFF_NOTICES.map((notice) => (
            <li key={notice.id} className="flex items-start gap-2.5 px-4 py-3">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{notice.title}</div>
                <div className="text-xs text-muted-foreground">{notice.date}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          variant="tray"
          title="No notifications yet"
          description="HR and operational notices will appear here."
        />
      )}
    </div>
  );
}

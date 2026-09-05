import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { ActivityTimeline } from "@/components/applicant/ActivityTimeline";
import { SAMPLE_APPLICATION_ACTIVITY } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Applicant Notifications — mirrors SAMPLE_APPLICATION_ACTIVITY, the same
 * status/history log already surfaced on the Overview page's "Recent
 * Activity" panel, rather than inventing separate notification sample data.
 * Reuses ActivityTimeline as-is (components/applicant/ActivityTimeline.tsx)
 * since its ActivityItem shape already matches this data exactly. No
 * read/unread state: neither placeholder-data.ts nor rbac.md backs that
 * field, so it isn't rendered here (unlike AppShell's bell-icon count,
 * which is a simple length, not a per-item flag).
 */
export default function ApplicantNotificationsPage() {
  const notifications = SAMPLE_APPLICATION_ACTIVITY;

  return (
    <div>
      <PageHeading
        title="Notifications"
        description="Updates about your application and documentation appear here."
      />
      {notifications.length === 0 ? (
        <EmptyState
          variant="tray"
          title="No notifications yet"
          description="You'll see updates about your application and documentation here."
        />
      ) : (
        <Card>
          <CardContent>
            <ActivityTimeline items={notifications} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

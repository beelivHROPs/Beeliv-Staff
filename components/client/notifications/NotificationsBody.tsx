"use client";

/**
 * Client notifications: the shared notification set (components/shared/notifications), the same design
 * every Beeliv app uses. This file maps the Client data onto it and keeps the Client behaviour:
 * opening marks read, delete asks first, "Mark all read", role-restricted and error states.
 */
import { useMemo } from "react";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { PageHeading } from "@/components/applicant/primitives";
import { NotificationList } from "@/components/shared/notifications/NotificationList";
import { NotificationError, NotificationSkeleton } from "@/components/shared/notifications/NotificationStates";
import { toast } from "@/components/ui/toast";
import { useNotifications } from "@/lib/client/hooks";
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/client/service";
import { fromClient } from "@/lib/notifications/adapters";

export function NotificationsBody() {
  const { data, status, retry } = useNotifications();
  const items = useMemo(() => (data ?? []).map(fromClient), [data]);

  async function markAll() {
    try {
      await markAllNotificationsRead();
      toast.add({ title: "All notifications marked as read" });
    } catch {
      toast.add({ title: "We couldn't update your notifications", description: "Please try again.", type: "error" });
    }
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[720px]">
        <PageHeading title="Notifications" />
      </div>
      {status === "loading" ? (
        <div className="mx-auto w-full max-w-[720px]">
          <NotificationSkeleton />
        </div>
      ) : status === "error" || status === "restricted" ? (
        <div className="mx-auto w-full max-w-[720px]">
          <NotificationError onRetry={retry} restricted={status === "restricted"} />
        </div>
      ) : (
        <NotificationList
          items={items}
          emptyText="Updates about candidates, workforce requests and documents will show up here."
          onOpen={(n) => {
            if (n.readAt === null) void markNotificationRead(n.id);
          }}
          onMarkAllRead={markAll}
          onDelete={async (n) => {
            const ok = await confirmAction({
              tone: "danger",
              title: "Delete this notification?",
              description: `"${n.title}" will be removed from your notifications. This can't be undone.`,
              confirmLabel: "Delete",
            });
            if (!ok) return;
            void deleteNotification(n.id);
            toast.add({ title: "Notification deleted" });
          }}
        />
      )}
    </div>
  );
}

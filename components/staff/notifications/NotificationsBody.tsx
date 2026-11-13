"use client";

/**
 * Staff notifications: the shared notification set (components/shared/notifications), the same design
 * every Beeliv app uses. This file maps the Staff data onto it and keeps the Staff behaviour: opening
 * marks read, delete (with an undo-free toast, as before), "Mark all read". One list at every width.
 */
import { useMemo } from "react";
import { NotificationList } from "@/components/shared/notifications/NotificationList";
import { NotificationError } from "@/components/shared/notifications/NotificationStates";
import { toast } from "@/components/ui/toast";
import { useNotifications } from "@/lib/staff/hooks";
import { deleteNotification, markNotificationRead } from "@/lib/staff/service";
import { fromStaff } from "@/lib/notifications/adapters";
import { confirmAction } from "../kit";
import { NotificationsSkeleton } from "./NotificationsSkeleton";

export function NotificationsBody() {
  const { data, status, retry } = useNotifications();
  const { items, labels } = useMemo(() => {
    const labels = new Map<string, string>();
    const items = (data ?? []).map((n) => {
      if (n.destination.label) labels.set(n.id, n.destination.label);
      return fromStaff(n);
    });
    return { items, labels };
  }, [data]);

  if (status === "loading") return <NotificationsSkeleton />;
  if (status === "error")
    return (
      <div className="mx-auto w-full max-w-[720px] pt-2 min-[768px]:pt-6">
        <h1 className="sr-only">Notifications</h1>
        <NotificationError onRetry={retry} />
      </div>
    );

  async function markAll() {
    try {
      await Promise.all(items.filter((n) => n.readAt === null).map((n) => markNotificationRead(n.id)));
      toast.add({ title: "All notifications marked as read" });
    } catch {
      toast.add({ title: "We couldn't update your notifications", description: "Please try again.", type: "error" });
    }
  }

  return (
    <div className="w-full pt-2 pb-2 min-[768px]:pt-3">
      <h1 className="mb-5 hidden text-[32px] leading-tight font-bold text-(--ap-ink) min-[768px]:block">Notifications</h1>
      <NotificationList
        wide
        tiles
        items={items}
        emptyText="Updates about your shifts, leave, documents and assignment will show up here."
        actionLabelFor={(n) => labels.get(n.id)}
        onOpen={(n) => {
          if (n.readAt === null) void markNotificationRead(n.id);
        }}
        onMarkAllRead={markAll}
        onDelete={async (n) => {
          const ok = await confirmAction({
            tone: "danger",
            title: "Delete this notification?",
            description: "It will be removed from your list. This can't be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Keep it",
          });
          if (!ok) return;
          void deleteNotification(n.id);
          toast.add({ title: "Notification deleted" });
        }}
      />
    </div>
  );
}

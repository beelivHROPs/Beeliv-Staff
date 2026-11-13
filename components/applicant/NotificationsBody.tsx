"use client";

/**
 * Applicant notifications: the shared notification set (components/shared/notifications), the same
 * design every Beeliv app uses. This file only maps the Applicant data onto it and keeps the Applicant
 * behaviour: opening marks read, delete asks first, "Mark all read".
 */
import { useMemo } from "react";
import { toast } from "@/components/ui/toast";
import { NotificationList } from "@/components/shared/notifications/NotificationList";
import { deleteNotification, markAllNotificationsRead, markNotificationRead, useApplicantStore } from "@/lib/applicant/service";
import { formatDateShort, formatTime } from "@/lib/applicant/time";
import type { AppNotification, Interview } from "@/lib/applicant/types";
import { fromApplicant } from "@/lib/notifications/adapters";
import { confirmAction } from "./ConfirmDialog";
import { PageHeading } from "./primitives";

/** Adds the scheduled date/time to an "Interview scheduled" notice, from the live interview record. */
function detailFor(n: AppNotification, interviews: Interview[]) {
  // Only invitations get the date appended; reminders already carry their own wording.
  // Notices raised with a shared event code (interview changed / cancelled) already carry the new time in their own text.
  const invite = n.code ? false : n.kind ? n.kind === "interview-invitation" : n.icon === "cal";
  if (!invite || / on [A-Z][a-z]{2},/.test(n.detail)) return n.detail;
  const iv = interviews.find((i) => i.status === "scheduled" && i.scheduledAt);
  if (!iv?.scheduledAt) return n.detail;
  const wd = new Date(iv.scheduledAt).toLocaleDateString("en-US", { weekday: "short" });
  return `${n.detail.replace(/\.$/, "")} on ${wd}, ${formatDateShort(iv.scheduledAt)} at ${formatTime(iv.scheduledAt)}.`;
}

export function NotificationsBody() {
  const store = useApplicantStore();
  const { shared, labels } = useMemo(() => {
    const labels = new Map<string, string>();
    const shared = store.notifications.map((n: AppNotification) => {
      if (n.link) labels.set(n.id, n.link.label);
      return { ...fromApplicant(n), body: detailFor(n, store.interviews) };
    });
    return { shared, labels };
  }, [store.notifications, store.interviews]);

  return (
    <div>
      <PageHeading title="Notifications" />
      <NotificationList
        wide
        tiles
        items={shared}
        emptyText="Updates about your applications, interviews and documents will show up here."
        actionLabelFor={(n) => labels.get(n.id)}
        onOpen={(n) => {
          if (n.readAt === null) void markNotificationRead(n.id);
        }}
        onMarkAllRead={() => {
          void markAllNotificationsRead();
          toast.add({ title: "All notifications marked as read" });
        }}
        onDelete={async (n) => {
          const ok = await confirmAction({
            tone: "danger",
            title: "Delete this notification?",
            description: `"${n.title}" will be removed from your notifications. This can't be undone.`,
            confirmLabel: "Delete notification",
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

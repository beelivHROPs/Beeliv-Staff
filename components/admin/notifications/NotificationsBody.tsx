"use client";

/**
 * /admin/notifications: the full list behind the bell, drawn with the shared notification set
 * (components/shared/notifications), the same design every Beeliv app uses. Every notification points
 * to its record; there is no delete in Admin. Opening one, or "Mark all read", marks it read. Read
 * state is kept here until the backend persists it.
 */
import { useMemo, useState } from "react";
import { PageHeading } from "@/components/applicant/primitives";
import { NotificationList } from "@/components/shared/notifications/NotificationList";
import { NotificationError, NotificationSkeleton } from "@/components/shared/notifications/NotificationStates";
import { useNotifications } from "@/lib/admin/hooks";
import { fromAdmin } from "@/lib/notifications/adapters";

export function NotificationsBody() {
  const { data, status, retry } = useNotifications();
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [allRead, setAllRead] = useState(false);

  const items = useMemo(
    () =>
      (data ?? []).map((n) => {
        const s = fromAdmin(n);
        return s.readAt || !(allRead || seen.has(n.id)) ? s : { ...s, readAt: s.createdAt };
      }),
    [data, seen, allRead],
  );

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
          emptyText="New notifications will appear here as things happen."
          onOpen={(n) => setSeen((s) => new Set(s).add(n.id))}
          onMarkAllRead={() => setAllRead(true)}
        />
      )}
    </div>
  );
}

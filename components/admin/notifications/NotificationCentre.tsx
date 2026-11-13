"use client";

/**
 * Notification Centre: the CONTENT of the bell dropdown (spec 31.3). The shell
 * owns the popover / trigger; this renders inside it. It is not the Inbox
 * (case management) and not Activity (audit trail): each item just points to
 * its record. In-app is the operational source of truth, email is only the
 * attention layer.
 *
 * Wiring: pass `useNotifications()` data. `requiresAction` is not on the shell's
 * AdminNotification yet - without it the "Requires action" tab is simply empty.
 * Read state is tracked locally (optimistic) until `onMarkRead` persists it.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Bell, CircleAlert } from "@/components/applicant/icons";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { ADMIN_NOTIFICATIONS_HREF } from "@/lib/admin/links";

export interface NotificationCentreItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** Where the record lives. Use the internal id, never a BLV-* reference. */
  href: string;
  /** Needs the person to act (spec 31.3 "action required"). */
  requiresAction?: boolean;
}

type Filter = "all" | "unread" | "action";

export function UnreadCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ap-dot-pop absolute top-1.5 right-1 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[11px] leading-none font-bold text-white shadow-[0_0_0_2px_#f5eef9]">
      <span className="sr-only">{count} unread</span>
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
    </span>
  );
}

export function NotificationCentre({
  items,
  status,
  onRetry,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: {
  items: NotificationCentreItem[];
  status: "loading" | "ready" | "empty" | "error" | "restricted";
  onRetry?: () => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  /** Called after an item or "View all" is followed, so the shell can close the dropdown. */
  onNavigate?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [allRead, setAllRead] = useState(false);

  const rows = useMemo(() => items.map((n) => ({ ...n, read: n.read || allRead || seen.has(n.id) })), [items, seen, allRead]);
  const unread = rows.filter((n) => !n.read).length;
  const action = rows.filter((n) => n.requiresAction && !n.read).length;
  const shown = rows.filter((n) => (filter === "unread" ? !n.read : filter === "action" ? n.requiresAction : true));

  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unread },
    { key: "action", label: "Requires action", count: action },
  ];

  function follow(id: string) {
    setSeen((s) => new Set(s).add(id));
    onMarkRead?.(id);
    onNavigate?.();
  }

  let body: React.ReactNode;
  if (status === "loading") {
    body = (
      <div role="status" aria-busy="true" aria-label="Loading notifications" className="flex flex-col gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div aria-hidden="true" className="ap-shimmer size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div aria-hidden="true" className="ap-shimmer h-4 w-3/5 rounded-md" />
              <div aria-hidden="true" className="ap-shimmer h-3.5 w-4/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (status === "error" || status === "restricted") {
    body = (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <CircleAlert className="size-6 text-(--ap-rose)" aria-hidden="true" />
        <b>{status === "restricted" ? "Notifications are not available for your role" : "Could not load notifications"}</b>
        {status === "error" && onRetry ? (
          <button type="button" onClick={onRetry} className="ap-btn ap-btn-s ap-btn-sm">
            Try again
          </button>
        ) : null}
      </div>
    );
  } else if (status === "empty" || rows.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <Bell className="size-6 text-(--ap-faint)" aria-hidden="true" />
        <b>You are all caught up</b>
        <span className="text-sm text-(--ap-muted)">New notifications will appear here.</span>
      </div>
    );
  } else if (shown.length === 0) {
    body = (
      <p className="m-0 px-4 py-8 text-center text-sm text-(--ap-muted)">
        {filter === "unread" ? "No unread notifications." : "Nothing needs your action right now."}
      </p>
    );
  } else {
    body = (
      <ul className="m-0 list-none p-0">
        {shown.map((n) => (
          <li key={n.id} className="border-b border-(--ap-line-2) last:border-b-0">
            <Link href={n.href} onClick={() => follow(n.id)} className={`flex gap-3 px-4 py-3 hover:bg-(--ap-line-2)/60 ${n.read ? "" : "bg-(--ap-tint)/50"}`}>
              {n.requiresAction && !n.read ? (
                <span className="mt-0.5 shrink-0">
                  <AttentionBadge className="size-8" halo={false} />
                  <span className="sr-only">Requires action</span>
                </span>
              ) : (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-(--ap-lilac) text-(--ap-violet)" aria-hidden="true">
                  <Bell className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <b className={`text-[15px] wrap-anywhere ${n.read ? "font-semibold" : ""}`}>
                    {n.title}
                    {!n.read ? <span className="sr-only"> (unread)</span> : null}
                  </b>
                  {!n.read ? <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-(--ap-violet)" /> : null}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-sm wrap-anywhere text-(--ap-muted)">{n.message}</span>
                <RelativeTime iso={n.createdAt} className="mt-1 block text-[13px] text-(--ap-faint)" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex max-h-[min(640px,80dvh)] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="ap-serif m-0 text-[18px]">Notifications</h2>
        {unread > 0 && onMarkAllRead ? (
          <button
            type="button"
            onClick={() => {
              setAllRead(true);
              onMarkAllRead();
            }}
            className="text-[13px] font-bold text-(--ap-violet) hover:underline"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Filter notifications" className="ap-scrollbar-none flex gap-1.5 overflow-x-auto px-4 pb-3">
        {tabs.map((t) => {
          const on = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(t.key)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-bold whitespace-nowrap ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-white text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 ? <span className={`text-[13px] tabular-nums ${on ? "text-white/80" : "text-(--ap-muted)"}`}>{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-(--ap-line)">{body}</div>

      <div className="border-t border-(--ap-line) px-4 py-3 text-center">
        <Link href={ADMIN_NOTIFICATIONS_HREF} onClick={onNavigate} className="text-[13px] font-bold text-(--ap-violet) hover:underline">
          View all
        </Link>
      </div>
    </div>
  );
}

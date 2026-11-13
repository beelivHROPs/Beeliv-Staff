"use client";

/**
 * Compact notification for the bell popover (about 380px): a small tinted disc, bold title, one-line
 * body, time and an unread dot. The whole row is the link (no pill here; the pill lives on the page).
 * `NotificationPopoverBody` is the complete popover content: header, up to 5 rows, designed empty state.
 */
import Link from "next/link";
import { Bell } from "@/components/applicant/icons";
import type { SharedNotification } from "@/lib/notifications/types";
import { BoldTile } from "@/components/shared/icons";
import { NOTIF_TONE, glyphFor, iconFor, relativeTime, tileTintFor, toneFor } from "./meta";

export function NotificationRow({ n, onOpen, timeLabel, tiles = false }: { n: SharedNotification; onOpen?: () => void; timeLabel?: string; tiles?: boolean }) {
  const Icon = iconFor(n.kind);
  const unread = n.readAt === null;
  const inner = (
    <>
      {tiles ? (
        <BoldTile glyph={glyphFor(n.kind).glyph} weight={glyphFor(n.kind).weight} tint={tileTintFor(toneFor(n))} size={40} />
      ) : (
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${NOTIF_TONE[toneFor(n)]}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1 leading-snug">
        <span className="flex items-start justify-between gap-2">
          <b className={`block text-[15px] text-(--ap-ink) ${unread ? "" : "font-semibold"}`}>
            {n.title}
            {unread ? <span className="sr-only"> (unread)</span> : null}
          </b>
          {unread ? <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-(--ap-violet)" /> : null}
        </span>
        {n.body ? <span className="mt-0.5 line-clamp-1 block text-[14px] text-(--ap-ink-2)">{n.body}</span> : null}
        <time dateTime={n.createdAt} suppressHydrationWarning className="mt-0.5 block text-[13px] text-(--ap-muted)">
          {timeLabel ?? relativeTime(n.createdAt)}
        </time>
      </span>
    </>
  );
  const cls = "flex gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-(--ap-tint-soft) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";
  return n.href ? (
    <Link href={n.href} onClick={onOpen} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function NotificationPopoverBody({
  items,
  viewAllHref,
  onNavigate,
  onOpen,
  timeLabelFor,
  headerExtra,
  tiles = false,
}: {
  /** Icon direction B tiles (Applicant and Staff only). */
  tiles?: boolean;
  /** Extra control beside "View all" (Admin: "Acknowledge" while the service bell rings). */
  headerExtra?: React.ReactNode;
  items: SharedNotification[];
  viewAllHref: string;
  /** Close the popover after a link is followed. */
  onNavigate?: () => void;
  /** Mark the item read in the app's own store. */
  onOpen?: (n: SharedNotification) => void;
  timeLabelFor?: (n: SharedNotification) => string | undefined;
}) {
  const rows = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="ap-serif m-0 text-[17px]">Notifications</h2>
        <span className="flex items-center gap-3">
          {headerExtra}
          <Link href={viewAllHref} onClick={onNavigate} className="text-[13px] font-bold text-(--ap-violet) hover:underline">
            View all
          </Link>
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-(--ap-tint-soft) px-4 py-7 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-(--ap-surface,#fff) text-(--ap-violet) shadow-[0_2px_6px_rgba(41,32,82,.12)]">
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <b className="text-[15px]">All caught up</b>
          <span className="text-[14px] text-(--ap-ink-2)">New notifications will appear here.</span>
        </div>
      ) : (
        <ul className="m-0 flex max-h-[min(440px,70dvh)] list-none flex-col gap-0.5 overflow-y-auto p-0">
          {rows.map((n) => (
            <li key={n.id}>
              <NotificationRow
                n={n}
                tiles={tiles}
                timeLabel={timeLabelFor?.(n)}
                onOpen={() => {
                  onOpen?.(n);
                  onNavigate?.();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

/**
 * The full notifications list for any app: All / Unread toggle with counts, "Mark all read", cards
 * grouped by day (Today / Earlier), and the designed empty state. One readable column (max 720px) at
 * every width. The app owns the data and the handlers; this only draws and filters.
 *   - `onDelete` omitted  = no delete control (apps where deleting is not allowed).
 *   - loading and error states are the app's call: render NotificationSkeleton / NotificationError.
 */
import { useState } from "react";
import { Check } from "@/components/applicant/icons";
import type { SharedNotification } from "@/lib/notifications/types";
import { NotificationCard } from "./NotificationCard";
import { NotificationEmpty } from "./NotificationStates";
import { defaultActionLabel, isToday } from "./meta";

const STEP = 20;

export function NotificationList({
  items,
  onOpen,
  onDelete,
  onMarkAllRead,
  actionLabelFor,
  timeLabelFor,
  emptyText,
  wide = false,
  tiles = false,
}: {
  /** Icon direction B tiles on the cards (Applicant and Staff only). */
  tiles?: boolean;
  items: SharedNotification[];
  onOpen: (n: SharedNotification) => void;
  onDelete?: (n: SharedNotification) => void;
  onMarkAllRead: () => void;
  actionLabelFor?: (n: SharedNotification) => string | undefined;
  timeLabelFor?: (n: SharedNotification) => string | undefined;
  /** What this app's notifications are about, for the empty state. */
  emptyText?: string;
  /** Page-width layout (Applicant desktop): fills the page container, cards in two columns from 900px, action pill under the text. Default stays the one 720px column. */
  wide?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [shown, setShown] = useState(STEP);
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = sorted.filter((n) => n.readAt === null);
  const list = filter === "unread" ? unread : sorted;
  const visible = list.slice(0, shown);
  const groups = (["Today", "Earlier"] as const).filter((g) => visible.some((n) => (isToday(n.createdAt) ? "Today" : "Earlier") === g));

  return (
    <div className={wide ? "flex w-full flex-col gap-5" : "mx-auto flex w-full max-w-[720px] flex-col gap-5"}>
      {sorted.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter notifications" className="inline-flex rounded-full bg-(--ap-surface,#fff) p-1 shadow-[inset_0_0_0_1px_var(--ap-line)]">
            {(["all", "unread"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => {
                  setFilter(k);
                  setShown(STEP);
                }}
                className={`inline-flex h-11 min-w-[84px] items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${filter === k ? "bg-(--notif-toggle,var(--staff-deep,var(--ap-ink))) text-(--ap-surface,#fff)" : "text-(--ap-ink-2)"}`}
              >
                {k === "all" ? (
                  `All ${sorted.length}`
                ) : (
                  <>
                    Unread
                    {unread.length > 0 ? (
                      <span className="bv-badge [--bv-badge-ring:transparent]">
                        <span className="sr-only">{unread.length}</span>
                        <span aria-hidden="true">{unread.length > 9 ? "9+" : unread.length}</span>
                      </span>
                    ) : (
                      <span aria-hidden="true">0</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
          {unread.length > 0 ? (
            <button type="button" onClick={onMarkAllRead} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
              <Check className="size-4" aria-hidden="true" /> Mark all read
            </button>
          ) : null}
        </div>
      ) : null}

      {list.length === 0 ? (
        <NotificationEmpty glass unreadView={filter === "unread"} text={emptyText} onShowAll={sorted.length > 0 ? () => setFilter("all") : undefined} />
      ) : (
        <>
          {groups.map((g) => (
            <section key={g} aria-labelledby={`notif-${g}`}>
              <h2 id={`notif-${g}`} className="mb-3 text-[18px] font-bold text-(--ap-ink)">
                {g}
              </h2>
              <ul className={wide ? "m-0 grid list-none grid-cols-1 items-start gap-3 p-0 min-[900px]:grid-cols-2 min-[900px]:gap-4" : "m-0 flex list-none flex-col gap-3 p-0"}>
                {visible
                  .filter((n) => (isToday(n.createdAt) ? "Today" : "Earlier") === g)
                  .map((n) => (
                    <NotificationCard
                      key={n.id}
                      n={n}
                      actionLabel={actionLabelFor?.(n) ?? defaultActionLabel(n.kind)}
                      timeLabel={timeLabelFor?.(n)}
                      compact={wide}
                      tiles={tiles}
                      onOpen={() => onOpen(n)}
                      onDelete={onDelete ? () => onDelete(n) : undefined}
                    />
                  ))}
              </ul>
            </section>
          ))}
          {list.length > shown ? (
            <button type="button" onClick={() => setShown((s) => s + STEP)} className="mx-auto inline-flex min-h-11 items-center rounded-full bg-(--ap-surface,#fff) px-5 text-[15px] font-bold text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)]">
              Show more ({list.length - shown})
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

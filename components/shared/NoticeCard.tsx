"use client";

import Link from "next/link";
import { ArrowRight, Trash2 } from "@/components/applicant/icons";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Reveal } from "@/components/applicant/motion";

/**
 * One notification, kept simple: bold title, the message, the time bottom-left and a single button
 * bottom-right. Unread shows a dot; "needs attention" swaps it for a bold red "!" with a red edge and
 * button so it cannot be missed. Used by the Staff and Client notification pages.
 */
export function NoticeCard({
  title,
  message,
  time,
  dateTime,
  unread,
  attention,
  href,
  linkLabel,
  onRead,
  onDelete,
}: {
  title: string;
  message: string;
  time: string;
  dateTime: string;
  unread: boolean;
  attention: boolean;
  href: string;
  linkLabel: string;
  onRead: () => void;
  onDelete: () => void;
}) {
  return (
    <Reveal
      as="li"
      onClick={onRead}
      className={`relative rounded-[16px] border bg-(--ap-surface,#fff) p-4 ${
        attention ? "border-(--ap-line)" : unread ? "cursor-pointer border-(--ap-tint-2)" : "border-(--ap-line)"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {attention ? <AttentionBadge className="mt-px size-7" /> : unread ? <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-(--ap-violet)" /> : null}
        <b className={`block text-[18px] leading-snug ${attention ? "text-(--ap-rose)" : "text-(--ap-ink)"} ${unread || attention ? "" : "font-semibold"}`}>
          {title}
          {unread ? <span className="sr-only"> (unread)</span> : null}
        </b>
        <button
          type="button"
          aria-label={`Delete notification: ${title}`}
          onClick={async (e) => {
            e.stopPropagation();
            if (await await confirmAction({ tone: "danger", title: "Delete this notification?", description: `"${title}" will be removed from your notifications. This can't be undone.`, confirmLabel: "Delete" })) onDelete();
          }}
          className="-mt-1.5 -mr-2 ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[#C8102E] hover:bg-[rgba(200,16,46,.08)]"
        >
          <Trash2 className="size-[22px]" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-2 text-base leading-relaxed text-(--ap-ink-2)">{message}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <time dateTime={dateTime} suppressHydrationWarning className="text-[14px] font-semibold text-(--ap-muted)">
          {time}
        </time>
        <Link href={href} onClick={onRead} className={`ap-btn ap-btn-sm ${attention ? "bg-[#C8102E]! text-white! hover:bg-[#9B0C24]!" : "ap-btn-p"}`}>
          {linkLabel} <ArrowRight className="size-[15px]" aria-hidden="true" />
        </Link>
      </div>
    </Reveal>
  );
}

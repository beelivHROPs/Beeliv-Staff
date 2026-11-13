"use client";

/**
 * ONE notification as a soft card (the approved Staff design, used in every app): a round icon disc,
 * a tint that says what it is about (see ./meta.ts), relative time with an unread dot, a clear title,
 * a short body, ONE action pill when there is somewhere to go, and a quiet delete (only where the app
 * allows it). Presentation only: the app supplies the handlers. Colours are the app's own `--ap-*` tokens.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Trash2 } from "@/components/applicant/icons";
import type { SharedNotification } from "@/lib/notifications/types";
import { BoldTile } from "@/components/shared/icons";
import { NOTIF_TONE, glyphFor, iconFor, relativeTime, tileTintFor, toneFor } from "./meta";

/** Solid fill for pills: each app defines one of these; the Applicant app falls back to its violet. */
const FILL = "var(--staff-fill, var(--client-fill, var(--admin-fill, var(--ap-violet))))";

const SOFT_SHADOW = "shadow-[0_1px_2px_rgba(41,32,82,.05),0_14px_28px_-14px_rgba(41,32,82,.22)]";

/** The one action on a card. `strong` (you owe something) is a filled pill; otherwise a quiet outlined one. */
export function NotifAction({ href, children, onClick, strong = false, className = "" }: { href: string; children: ReactNode; onClick?: () => void; strong?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={strong ? { backgroundColor: FILL } : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold transition-transform active:scale-[.985] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-2 focus-visible:outline-none ${
        strong ? "text-white hover:brightness-110" : "bg-(--ap-surface,#fff) text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)] hover:shadow-[inset_0_0_0_1.5px_var(--ap-violet)]"
      } ${className}`}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}

export interface NotificationCardProps {
  n: SharedNotification;
  /** Action text. Defaults come from the caller (see defaultActionLabel). */
  actionLabel: string;
  /** Called when the card's action is followed (mark it read). */
  onOpen?: () => void;
  /** Present only where the app lets the person delete. */
  onDelete?: () => void;
  /** Override for the relative time text (apps with their own clock). */
  timeLabel?: string;
  /** Compact: the action pill sits under the text instead of at the far right (wide page layouts). */
  compact?: boolean;
  /** Icon direction B: a bold glyph tile instead of the white disc (Applicant and Staff only). */
  tiles?: boolean;
}

export function NotificationCard({ n, actionLabel, onOpen, onDelete, timeLabel, compact = false, tiles = false }: NotificationCardProps) {
  const tone = toneFor(n);
  const Icon = iconFor(n.kind);
  const unread = n.readAt === null;
  return (
    <li className={`relative rounded-[22px] p-4 min-[768px]:p-5 ${NOTIF_TONE[tone]} ${SOFT_SHADOW} ${unread ? "" : "opacity-85"}`}>
      <div className="flex items-start gap-3.5">
        {tiles ? (
          <BoldTile glyph={glyphFor(n.kind).glyph} weight={glyphFor(n.kind).weight} tint={tileTintFor(tone)} size={48} />
        ) : (
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-(--ap-surface,#fff) shadow-[0_2px_6px_rgba(41,32,82,.12)]">
            <Icon className="size-[22px]" aria-hidden="true" />
          </span>
        )}
        <div className={`min-w-0 flex-1 leading-snug ${onDelete ? "max-[639px]:pr-8" : ""}`}>
          <p className="flex items-center gap-2 text-[14px] text-(--ap-ink-2)">
            {unread ? <span className="size-2 shrink-0 rounded-full bg-(--ap-violet)" role="img" aria-label="Unread" /> : null}
            <time dateTime={n.createdAt} suppressHydrationWarning>
              {timeLabel ?? relativeTime(n.createdAt)}
            </time>
          </p>
          <b className="mt-0.5 block text-[17px] text-(--ap-ink) wrap-anywhere">{n.title}</b>
          {n.body ? <span className="mt-0.5 block text-[15px] text-(--ap-ink-2) wrap-anywhere">{n.body}</span> : null}
        </div>
        {onDelete ? (
          <button
            type="button"
            aria-label={`Delete: ${n.title}`}
            onClick={onDelete}
            className="-mt-1 -mr-1.5 flex size-11 max-[639px]:absolute max-[639px]:top-2 max-[639px]:right-2 max-[639px]:m-0 shrink-0 items-center justify-center rounded-full text-(--ap-ink-2) hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none"
          >
            <Trash2 className="size-[18px]" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {n.href ? (
        <div className={compact ? "mt-3.5 flex min-[640px]:justify-start min-[640px]:pl-[62px]" : "mt-3.5 flex min-[640px]:justify-end"}>
          <NotifAction href={n.href} onClick={onOpen} strong={n.severity === "attention" || tone === "rose"} className="w-full min-[640px]:w-auto">
            {actionLabel}
          </NotifAction>
        </div>
      ) : null}
    </li>
  );
}

"use client";

/**
 * Empty, error and loading states for notifications, in the same soft-card language as the cards.
 * Shared by every app; colours are the app's own tokens.
 */
import type { ReactNode } from "react";
import { Bell, CircleAlert, LockKeyhole } from "@/components/applicant/icons";
import { GlassIcon } from "@/components/shared/icons";
import { NOTIF_TONE, type NotifTone } from "./meta";

const SOFT_SHADOW = "shadow-[0_1px_2px_rgba(41,32,82,.05),0_14px_28px_-14px_rgba(41,32,82,.22)]";

function StateBox({ tone, icon, title, text, action, glass = false }: { tone: NotifTone; icon: ReactNode; title: string; text?: string; action?: ReactNode; glass?: boolean }) {
  return (
    <div role="status" className={`flex flex-col items-center gap-3 rounded-[22px] px-6 py-9 text-center ${NOTIF_TONE[tone]} ${SOFT_SHADOW}`}>
      {glass ? (
        <GlassIcon name="notifications" size={96} />
      ) : (
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-(--ap-surface,#fff) shadow-[0_2px_6px_rgba(41,32,82,.12)]">{icon}</span>
      )}
      <p className="m-0 text-[18px] leading-snug font-bold text-(--ap-ink)">{title}</p>
      {text ? <p className="m-0 max-w-[320px] text-[15px] leading-snug text-(--ap-ink-2)">{text}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

const BTN = "inline-flex min-h-11 items-center justify-center rounded-full bg-(--ap-surface,#fff) px-5 text-[15px] font-bold text-(--ap-ink) shadow-[inset_0_0_0_1.5px_var(--ap-line)] hover:shadow-[inset_0_0_0_1.5px_var(--ap-violet)] focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";

export function NotificationEmpty({ unreadView = false, text, onShowAll, glass = false }: { unreadView?: boolean; /** What will show up here, in the app's own words. */ text?: string; onShowAll?: () => void; /** Glass hero icon (Applicant and Staff only). */ glass?: boolean }) {
  return (
    <StateBox
      glass={glass}
      tone="lavender"
      icon={<Bell className="size-6 text-(--ap-violet)" aria-hidden="true" />}
      title={unreadView ? "All caught up" : "Nothing new yet"}
      text={unreadView ? "You have read everything. Switch to All to see earlier updates." : (text ?? "Updates will show up here as things happen.")}
      action={
        unreadView && onShowAll ? (
          <button type="button" onClick={onShowAll} className={BTN}>
            Show all
          </button>
        ) : undefined
      }
    />
  );
}

export function NotificationError({ onRetry, restricted = false }: { onRetry?: () => void; restricted?: boolean }) {
  return (
    <StateBox
      tone={restricted ? "lavender" : "rose"}
      icon={restricted ? <LockKeyhole className="size-6 text-(--ap-violet)" aria-hidden="true" /> : <CircleAlert className="size-6 text-(--ap-rose)" aria-hidden="true" />}
      title={restricted ? "Notifications are not available for your role" : "We couldn't load your notifications"}
      text={restricted ? undefined : "Check your connection and try again. Nothing on your account has changed."}
      action={
        !restricted && onRetry ? (
          <button type="button" onClick={onRetry} className={BTN}>
            Try again
          </button>
        ) : undefined
      }
    />
  );
}

/** Whole-page loading shape for route-level loading.tsx: heading shimmer (wide screens) plus the list skeleton, in the same 720px column. */
export function NotificationsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[720px] pt-2 pb-2 min-[768px]:pt-6">
      <h1 className="sr-only">Notifications</h1>
      <div aria-hidden="true" className="ap-shimmer mb-5 hidden h-9 w-56 rounded-md min-[768px]:block" />
      <NotificationSkeleton />
    </div>
  );
}

/** Matches the list: toggle row, a day heading, three cards. */
export function NotificationSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
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
  }
  return (
    <div role="status" aria-busy="true" aria-label="Loading your notifications" className="flex flex-col gap-5">
      <div aria-hidden="true" className="ap-shimmer h-12 w-60 max-w-full rounded-full" />
      <div aria-hidden="true" className="ap-shimmer h-6 w-24 rounded-md" />
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="ap-shimmer h-[132px] w-full rounded-[22px]" />
      ))}
    </div>
  );
}

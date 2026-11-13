import type { ReactNode } from "react";
import { StateCard } from "@/components/shared/premium";
import { EmptyArt, artFor } from "@/components/applicant/EmptyArt";
import { GlassIcon, glassForIcon } from "@/components/shared/icons";
import { Exclaim, LockKeyhole, RefreshCw } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";

/** Solid pulsing tile at the chart's real height (the approved skeleton style). */
export function ChartSkeleton({ height = 200, label = "Loading chart" }: { height?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div aria-hidden="true" className="ap-shimmer w-full rounded-xl" style={{ height }} />
    </div>
  );
}

/** Intentional empty state: says what is missing and what happens next. Never invents activity. */
export function ChartEmptyState({ icon: Icon, title, description, action, height = 200 }: { icon: LucideIcon; title: string; description: string; action?: ReactNode; height?: number }) {
  return (
    <>
      <StateCard icon={Icon} title={title} text={description} action={action} className="min-[768px]:hidden" />
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-5 text-center max-[767px]:hidden" style={{ minHeight: height }}>
        {glassForIcon(Icon, title) ? <GlassIcon name={glassForIcon(Icon, title)!} size={80} /> : <EmptyArt kind={artFor(Icon)} className="h-[80px] w-[100px]" />}
        <b className="text-[17px] text-(--ap-ink)">{title}</b>
        <p className="max-w-[36ch] text-[14px] leading-[1.5] text-(--ap-muted)">{description}</p>
        {action ? <div className="mt-2.5">{action}</div> : null}
      </div>
    </>
  );
}

/** "Couldn't load" with retry - the data did not arrive, nothing about the account changed. */
export function ChartErrorState({ retry, height = 200, title = "We couldn't load this" }: { retry: () => void; height?: number; title?: string }) {
  return (
    <>
      <StateCard
        error
        tone="rose"
        icon={Exclaim}
        title={title}
        text="Check your connection and try again."
        action={
          <button type="button" onClick={retry} className="ap-btn ap-btn-p h-12 w-full text-white!">
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </button>
        }
        className="min-[768px]:hidden"
      />
      <div role="alert" className="flex flex-col items-start justify-center gap-1.5 rounded-xl bg-(--ap-rose-bg) px-4 py-5 max-[767px]:hidden" style={{ minHeight: height }}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#C8102E] text-white">
          <Exclaim className="size-5" aria-hidden="true" />
        </span>
        <b className="text-[15px] text-(--ap-ink)">{title}</b>
        <p className="text-[14px] text-(--ap-ink-2)">Check your connection and try again.</p>
        <button type="button" onClick={retry} className="ap-btn ap-btn-s ap-btn-sm mt-1">
          <RefreshCw className="size-4" aria-hidden="true" /> Try again
        </button>
      </div>
    </>
  );
}

/** Unauthorised / restricted: the backend said this account may not see it. */
export function ChartRestrictedState({ what, height = 200 }: { what: string; height?: number }) {
  return (
    <>
      <StateCard icon={LockKeyhole} title="Restricted" text={`${what} isn't available to your account. Ask your Beeliv team if you think you should have access.`} className="min-[768px]:hidden" />
      <div className="flex flex-col items-start justify-center gap-1.5 rounded-xl border border-(--ap-line) bg-(--ap-line-2) px-4 py-5 max-[767px]:hidden" style={{ minHeight: height }}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-(--ap-surface) text-(--ap-muted)">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <b className="text-[15px] text-(--ap-ink)">Restricted</b>
        <p className="max-w-[46ch] text-[14px] leading-[1.5] text-(--ap-muted)">{what} isn&apos;t available to your account. Ask your Beeliv team if you think you should have access.</p>
      </div>
    </>
  );
}

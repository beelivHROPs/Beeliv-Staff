"use client";

/**
 * Admin Staff directory, PHONE top block only (<768px): eyebrow + title and ONE plum
 * hero (team members, departments, active). Same structure as the Client People page;
 * all numbers come from the existing staff list page (statusCounts, facets). Desktop is untouched.
 */
import { HeroCard } from "@/components/shared/premium";

export function PhoneStaffTop({ total, active, departments }: { total: number; active: number; departments: number; onLeave?: number }) {
  return (
    <div className="mb-4 flex flex-col gap-5 min-[768px]:hidden">
      <header>
        <p className="text-[12px] font-bold tracking-[.14em] text-(--ap-violet) uppercase">Your team</p>
        <h1 className="mt-1 text-[32px] leading-none font-bold text-(--ap-ink)">Staff</h1>
        <p className="mt-2 text-[14.5px] text-(--ap-muted)">Everyone working across your clients</p>
      </header>
      <HeroCard eyebrow="Your workforce" ariaLabel="Workforce summary">
        <div className="flex items-stretch gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <b className="text-[52px] leading-none font-bold tabular-nums">{total}</b>
              <span className="text-[14px] text-white/90">team members</span>
            </p>
          </div>
          <div className="w-px bg-white/25" aria-hidden="true" />
          <div className="flex shrink-0 flex-col justify-center gap-1.5 text-[13px] text-white/90">
            <span>
              <b className="mr-1 text-[20px] font-bold text-white tabular-nums">{departments}</b>departments
            </span>
            <span>
              <b className="mr-1 text-[20px] font-bold text-white tabular-nums">{active}</b>active
            </span>
          </div>
        </div>
      </HeroCard>
      <h2 className="-mb-3 text-[16px] font-semibold text-(--ap-ink)">Find a team member</h2>
    </div>
  );
}

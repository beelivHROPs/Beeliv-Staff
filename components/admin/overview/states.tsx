import Link from "next/link";
import { Plus } from "@/components/applicant/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { NEW_VACANCY_HREF } from "@/lib/admin/links";

const sk = "ap-shimmer rounded-[10px]";

/** Solid skeleton at the calm layout's proportions (greeting, needs list, stat strip, panels). */
export function OverviewSkeleton() {
  return (
    <div className="calm-home flex flex-col gap-5 min-[768px]:gap-4" role="status" aria-busy="true" aria-label="Loading your Overview">
      <h1 className="sr-only">Overview</h1>
      <div className="grid grid-cols-1 gap-5 min-[768px]:gap-4 min-[1241px]:grid-cols-12">
        <div className={`${sk} h-[96px] min-[768px]:h-[190px] min-[1241px]:col-span-7`} />
        <div className={`${sk} h-[200px] min-[1241px]:col-span-5`} />
      </div>
      <div className={`${sk} h-[78px]`} />
      <div className="grid grid-cols-1 gap-5 min-[768px]:gap-4 min-[1241px]:grid-cols-12">
        <div className={`${sk} h-[260px] min-[1241px]:col-span-8`} />
        <div className={`${sk} h-[260px] min-[1241px]:col-span-4`} />
        <div className={`${sk} h-[240px] max-[767px]:hidden min-[1241px]:col-span-5`} />
        <div className={`${sk} h-[240px] max-[767px]:hidden min-[1241px]:col-span-7`} />
      </div>
    </div>
  );
}

export function OverviewError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-[860px] pt-4 min-[768px]:pt-10">
      <h1 className="sr-only">Overview</h1>
      <ErrorPanel title="We couldn't load your Overview" retry={retry} />
    </div>
  );
}

/** No recruitment activity at all: an intentional empty state, not a page of zeros. */
export function OverviewEmpty({ canCreateVacancy }: { canCreateVacancy: boolean }) {
  return (
    <section className="flex flex-col items-start gap-2 border-t border-(--ap-line) pt-4 min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:bg-(--ap-surface) min-[768px]:p-6">
      <h2 className="text-[15px] font-semibold text-(--ap-ink)">No recruitment activity yet</h2>
      <p className="max-w-[58ch] text-[14px] leading-[1.5] text-(--ap-muted)">When vacancies are published and applications arrive, your briefing shows here: what needs you today, interviews, documents and your talent pool.</p>
      {canCreateVacancy ? (
        <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p mt-1 h-11 text-white! min-[768px]:h-10 max-[480px]:w-full">
          <Plus className="size-4" aria-hidden="true" /> Create Vacancy
        </Link>
      ) : null}
    </section>
  );
}

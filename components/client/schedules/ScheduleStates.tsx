import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { PhoneSkeleton } from "../phone";

const sk = "ap-shimmer rounded-2xl";

/** Skeleton for the schedule area at the real proportions (three shift cards). */
export function ScheduleAreaSkeleton({ label = "Loading schedule" }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="flex flex-col gap-4 min-[768px]:gap-5">
      <div className={`${sk} h-[300px]`} />
      <div className={`${sk} h-[300px]`} />
    </div>
  );
}

/** Full-page skeleton (route loading.tsx / Suspense fallback). */
export function ScheduleSkeleton() {
  return (
    <div>
      <PhoneSkeleton label="Loading schedule" hero={false} cards={3} />
      <div className="max-[767px]:hidden">
        <PageHeading title="Schedules" subtitle="Shifts, times and the staff assigned to them." />
        <div className={`${sk} mb-4 h-[112px] min-[768px]:mb-5`} />
        <ScheduleAreaSkeleton />
      </div>
    </div>
  );
}

export function ScheduleError({ retry }: { retry: () => void }) {
  return <ErrorPanel title="We couldn't load the schedule" retry={retry} />;
}

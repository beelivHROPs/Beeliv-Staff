import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { PhoneSkeleton } from "../phone";

const sk = "ap-shimmer rounded-2xl";

/** Skeleton for everything below the filter bar, at the real proportions. */
export function AttendanceBodySkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading attendance" className="flex flex-col gap-4 min-[768px]:gap-5 max-[767px]:hidden">
      <div className="grid grid-cols-6 gap-2.5 min-[768px]:grid-cols-5 min-[768px]:gap-3.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${sk} h-[104px] ${i < 3 ? "col-span-2" : "col-span-3"} min-[768px]:col-span-1 min-[768px]:h-[84px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1241px]:grid-cols-12">
        <div className={`${sk} h-[420px] min-[1241px]:col-span-4`} />
        <div className={`${sk} h-[320px] min-[1241px]:col-span-8 min-[1241px]:h-[420px]`} />
      </div>
      <div className={`${sk} h-[420px]`} />
    </div>
  );
}

/** Full-page skeleton (route loading.tsx / Suspense fallback): heading + filter bar + body. */
export function AttendanceSkeleton() {
  return (
    <div>
      <PhoneSkeleton label="Loading attendance" tiles={4} cards={3} />
      <div className="max-[767px]:hidden">
        <PageHeading title="Attendance" subtitle="Who is working, who is late and who is away." />
        <div className={`${sk} mb-4 h-[132px] min-[768px]:mb-5`} />
        <AttendanceBodySkeleton />
      </div>
    </div>
  );
}

export function AttendanceError({ retry }: { retry: () => void }) {
  return <ErrorPanel title="We couldn't load attendance" retry={retry} />;
}

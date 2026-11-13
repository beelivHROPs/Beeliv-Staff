import Link from "next/link";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Plus, UsersRound } from "@/components/applicant/icons";
import { NEW_REQUEST_HREF } from "@/lib/client/links";

const sk = "ap-shimmer rounded-[10px]";

/** Solid skeleton at the real layout's proportions (banner, 5 tiles, editorial grid). */
export function OverviewSkeleton() {
  return (
    <div className="calm-client flex flex-col gap-5" role="status" aria-busy="true" aria-label="Loading your Overview">
      <h1 className="sr-only">Overview</h1>
      <div className={`${sk} h-[150px] min-[768px]:h-[176px]`} />
      <div className="grid grid-cols-6 gap-2.5 min-[768px]:grid-cols-5 min-[768px]:gap-3.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${sk} h-[84px] ${i < 3 ? "col-span-2" : "col-span-3"} min-[768px]:col-span-1 min-[768px]:h-[84px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-12 min-[1241px]:gap-5">
        <div className={`${sk} h-[340px] min-[768px]:col-span-2 min-[1241px]:col-span-8`} />
        <div className={`${sk} h-[250px] min-[1241px]:col-span-4 min-[1241px]:h-[340px]`} />
        <div className={`${sk} h-[380px] min-[1241px]:col-span-4`} />
        <div className={`${sk} h-[300px] min-[768px]:col-span-2 min-[1241px]:col-span-8 min-[1241px]:h-[380px]`} />
        <div className={`${sk} h-[230px] min-[768px]:col-span-2 min-[1241px]:col-span-8`} />
        <div className={`${sk} h-[300px] min-[1241px]:col-span-4`} />
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

/** Active client, but no staff assigned yet: an intentional empty state, not a page of zeros. */
export function NoWorkforce() {
  return (
    <section className="ap-card flex flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-9">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-(--ap-tint) text-(--ap-violet)">
        <UsersRound className="size-7" aria-hidden="true" />
      </span>
      <h2 className="ap-serif text-[28px] leading-tight min-[768px]:text-[34px]">No workforce assigned yet</h2>
      <p className="ap-bd max-w-[58ch]">Once Beeliv places staff at your outlet, you&apos;ll see who&apos;s on shift, attendance, schedules and compliance right here. If you need people, tell us what you&apos;re looking for.</p>
      <Link href={NEW_REQUEST_HREF} className="ap-btn ap-btn-p mt-1 h-12 text-white! max-[480px]:w-full">
        <Plus className="size-4" aria-hidden="true" /> Request staff
      </Link>
    </section>
  );
}

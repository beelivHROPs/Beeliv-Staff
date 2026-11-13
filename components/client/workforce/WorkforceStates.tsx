import Link from "next/link";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Plus, UsersRound } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { NEW_REQUEST_HREF } from "@/lib/client/links";
import { PhoneSkeleton } from "../phone";

const sk = "ap-shimmer rounded-2xl";

/** Solid skeleton at the real layout's proportions (heading, list card, insights). */
export function WorkforceSkeleton() {
  return (
    <>
      <PhoneSkeleton label="Loading Workforce" cards={5} />
      <div role="status" aria-busy="true" aria-label="Loading My Workforce" className="max-[767px]:hidden">
        <PageHeading title="My Workforce" subtitle="Search and review the staff Beeliv has placed at your outlets." />
        <div className="grid grid-cols-1 gap-4 min-[1241px]:grid-cols-12 min-[1241px]:gap-5">
          <div className={`${sk} order-2 h-[560px] min-[1241px]:order-none min-[1241px]:col-span-8`} />
          <div className={`${sk} order-1 h-[260px] min-[1241px]:order-none min-[1241px]:col-span-4`} />
        </div>
      </div>
    </>
  );
}

export function WorkforceError({ retry }: { retry: () => void }) {
  return (
    <>
      <PageHeading title="My Workforce" subtitle="Search and review the staff Beeliv has placed at your outlets." />
      <ErrorPanel title="We couldn't load your workforce" retry={retry} />
    </>
  );
}

/** Active client, but no staff assigned yet: an intentional empty state. */
export function NoStaffYet() {
  return (
    <section className="ap-card flex flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-9">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-(--ap-tint) text-(--ap-violet)">
        <UsersRound className="size-7" aria-hidden="true" />
      </span>
      <h2 className="ap-serif text-[28px] leading-tight min-[768px]:text-[34px]">No workforce assigned yet</h2>
      <p className="ap-bd max-w-[58ch]">Once Beeliv places staff at this outlet, you&apos;ll find them here with their role, department and assignment. If you need people, tell us what you&apos;re looking for.</p>
      <Link href={NEW_REQUEST_HREF} className="ap-btn ap-btn-p mt-1 h-12 text-white! max-[480px]:w-full">
        <Plus className="size-4" aria-hidden="true" /> Request staff
      </Link>
    </section>
  );
}

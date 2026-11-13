import Link from "next/link";
import { ArrowRight } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import type { LucideIcon } from "@/components/applicant/icons";

/** Placeholder for Staff sections that phase 2 fills. Keeps navigation complete. */
export function BeingBuilt({ title, subtitle, icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <>
      <PageHeading title={title} subtitle={subtitle} />
      <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
        <EmptyState
          icon={icon}
          title="This section is being built"
          description="It arrives in the next phase of the Staff Hub. Your Home screen already shows what needs your attention today."
          action={
            <Link href="/staff" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
              Back to Home <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowRight } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";

/** Placeholder for Client sections a later build step fills in. Keeps navigation complete. */
export function BeingBuilt({ title, subtitle, icon }: { title: string; subtitle: string; icon: LucideIcon }) {
  return (
    <>
      <PageHeading title={title} subtitle={subtitle} />
      <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
        <EmptyState
          icon={icon}
          title="This section is being built"
          description="It arrives in the next phase of the Client app. Your Overview already shows what needs your attention today."
          action={
            <Link href="/client" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
              Back to Overview <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    </>
  );
}

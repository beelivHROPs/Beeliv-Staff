import Link from "next/link";
import { ArrowRight } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";

/** Placeholder for Admin sections a later build step fills in. Keeps navigation complete. No mock data, no invented content. */
export function BeingBuilt({ title, icon, description = "It arrives in a later phase of the Admin app. The Overview already shows what needs your attention today." }: { title: string; icon: LucideIcon; description?: string }) {
  return (
    <>
      <PageHeading title={title} />
      <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
        <EmptyState
          icon={icon}
          title="This section is being built"
          description={description}
          action={
            <Link href="/admin" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
              Back to Overview <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    </>
  );
}

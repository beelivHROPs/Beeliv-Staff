import Link from "next/link";
import { ChevronLeft, Search } from "@/components/applicant/icons";
import { StatusChrome } from "@/components/applicant/StatusChrome";

/**
 * Shown instead of a job page or the apply flow when the job ended more than 5 days ago (lib/jobs/status.ts):
 * the job is no longer shown, but the person's own applications for it stay in My Applications.
 */
export function JobUnavailable({ context = "job" }: { context?: "job" | "apply" }) {
  return (
    <div>
      <StatusChrome />
      <Link href="/applicant/jobs" className="mb-1.5 inline-flex items-center gap-1.5 py-1 text-[14px] font-bold max-[1100px]:min-h-11">
        <ChevronLeft className="size-[15px]" strokeWidth={1.8} aria-hidden="true" />
        All jobs
      </Link>
      <section className="ap-card flex flex-col items-center gap-3 rounded-[20px] px-6 py-12 text-center max-[767px]:rounded-[18px]">
        <h1 className="ap-serif text-[35px] max-[767px]:text-[30px]">This job is no longer available</h1>
        <p className="ap-bd max-w-[52ch]">
          {context === "apply"
            ? "This role closed some time ago, so new applications are not possible. Any application you already made stays in My Applications."
            : "It closed some time ago or was taken down. Any application you made for it stays in My Applications. Similar roles open often, so take a look at what is open now."}
        </p>
        <div className="mt-2 flex w-full flex-wrap justify-center gap-2.5 max-[767px]:[&>a]:flex-1">
          <Link href="/applicant/jobs" className="ap-btn ap-btn-p ap-btn-hero !text-white">
            <Search className="size-4" strokeWidth={1.8} aria-hidden="true" />
            Browse open jobs
          </Link>
          <Link href="/applicant/applications" className="ap-btn ap-btn-o">
            My Applications
          </Link>
        </div>
      </section>
    </div>
  );
}

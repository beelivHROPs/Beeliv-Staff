"use client";

/**
 * The public site's job card: the SAME card as the Applicant app (components/applicant/jobs/JobCard), with
 * the public job page as its link, no applied/draft state and no match tag (signed-out visitors have no
 * profile), and a bookmark that remembers in this browser until sign-in (lib/jobs/guest-saved.ts).
 * The card's colour variables are provided by `.jc-public` in app/(public)/public-site.css, so no
 * Applicant stylesheet is imported.
 */
import { Bookmark } from "@/components/applicant/icons";
import { JobCard } from "@/components/applicant/jobs/JobCard";
import { toggleGuestSavedJob, useGuestSavedJobs } from "@/lib/jobs/guest-saved";
import type { JobCardData } from "@/lib/jobs/card";

function GuestSaveButton({ jobId, role }: { jobId: string; role: string }) {
  const saved = useGuestSavedJobs().includes(jobId);
  return (
    <button
      type="button"
      onClick={() => toggleGuestSavedJob(jobId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${role} from saved jobs` : `Save ${role}`}
      title={saved ? "Saved on this device" : "Save role"}
      className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent -mt-1 -mr-1 transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-(--ap-line-2) hover:text-(--ap-violet) max-[1100px]:-mt-2 max-[1100px]:-mr-2 max-[1100px]:size-[42px] ${saved ? "text-(--ap-violet)" : "text-(--ap-muted)"}`}
    >
      <Bookmark className="size-5" strokeWidth={1.6} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

export function PublicJobCard({ job }: { job: JobCardData }) {
  return (
    <div className="jc-public">
      <JobCard job={job} state={null} showMatch={false} detailHref={`/jobs/${job.id}`} saveSlot={<GuestSaveButton jobId={job.id} role={job.role} />} />
    </div>
  );
}

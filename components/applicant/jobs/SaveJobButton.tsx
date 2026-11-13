"use client";

import { Bookmark, Share } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { toggleSavedJob, useSavedJobs } from "@/lib/applicant/saved";
import { shareOrOpenSheet } from "@/lib/share/share-link";
import { jobShareText } from "@/lib/share/share-urls";

/** Share a job: the browser's own share sheet where there is one, otherwise the in-app ShareSheet. */
export function shareJob(role: string, company: string) {
  return shareOrOpenSheet({ title: `${role} at ${company}`, text: jobShareText(role, company) });
}

/** Toggle a job's saved state with the wireframe's confirmation toast. */
export function toggleSaveWithToast(jobId: string) {
  const now = toggleSavedJob(jobId);
  toast.add({ title: now ? "Saved to your jobs" : "Removed from saved jobs", type: now ? "success" : undefined });
}

/**
 * Wireframe `.save` bookmark: 32px ghost icon button (42px tap target
 * <=1100px), muted -> violet, filled bookmark when pressed.
 */
export function SaveJobButton({ jobId, role, className = "" }: { jobId: string; role: string; className?: string }) {
  const saved = useSavedJobs().includes(jobId);
  return (
    <button
      type="button"
      onClick={() => toggleSaveWithToast(jobId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${role} from saved jobs` : `Save ${role}`}
      title={saved ? "Saved" : "Save role"}
      className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-(--ap-line-2) hover:text-(--ap-violet) max-[1100px]:size-[42px] max-[1100px]:before:-inset-[3px] ${
        saved ? "text-(--ap-violet)" : "text-(--ap-muted)"
      } ${className}`}
    >
      <Bookmark key={saved ? "on" : "off"} className={`size-5 ${saved ? "ap-bump" : ""}`} strokeWidth={1.6} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

/** Share icon for the job header (tablet and desktop); phones get it in the apply bar. */
export function ShareJobButton({ role, company, className = "" }: { role: string; company: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => void shareJob(role, company)}
      aria-label={`Share ${role}`}
      title="Share role"
      className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-(--ap-muted) transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-(--ap-line-2) hover:text-(--ap-violet) ${className}`}
    >
      <Share className="size-5" strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}

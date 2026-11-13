"use client";

/**
 * Save and Share for the public job page. Same icons and button styles as the Applicant job page
 * (Bookmark / Share from the Applicant icon set). Save is the guest bookmark (lib/jobs/guest-saved.ts:
 * remembered in this browser, merged into the person's Saved jobs after sign-up). Share opens the phone's
 * share sheet, else copies the link (same helper the Applicant page uses).
 * `icon` = round icon-only button (phones, under the title); `button` = pill with a label (side column).
 */
import { Bookmark, Share } from "@/components/applicant/icons";
import { toggleGuestSavedJob, useGuestSavedJobs } from "@/lib/jobs/guest-saved";
import { shareOrOpenSheet } from "@/lib/share/share-link";

const ICON_BTN = "inline-flex size-11 items-center justify-center rounded-full border border-(--ap-line) bg-white text-(--ap-ink) active:bg-black/5";

export function SaveAction({ jobId, role, variant }: { jobId: string; role: string; variant: "icon" | "button" }) {
  const saved = useGuestSavedJobs().includes(jobId);
  const label = saved ? `Remove ${role} from saved jobs` : `Save ${role}`;
  return (
    <button
      type="button"
      onClick={() => toggleGuestSavedJob(jobId)}
      aria-pressed={saved}
      aria-label={variant === "icon" ? label : undefined}
      title={saved ? "Saved on this device" : "Save role"}
      className={variant === "icon" ? `${ICON_BTN} ${saved ? "text-(--ap-violet)" : ""}` : "ap-btn ap-btn-s"}
    >
      <Bookmark className={variant === "icon" ? "size-5" : "size-[17px]"} strokeWidth={1.7} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      {variant === "button" ? (saved ? "Saved" : "Save") : null}
    </button>
  );
}

export function ShareAction({ title, text, variant }: { title: string; text: string; variant: "icon" | "button" }) {
  return (
    <button
      type="button"
      // Straight from the click: the native share needs the user gesture.
      onClick={() => void shareOrOpenSheet({ title, text })}
      aria-label={variant === "icon" ? `Share ${title}` : undefined}
      className={variant === "icon" ? ICON_BTN : "ap-btn ap-btn-s"}
    >
      <Share className={variant === "icon" ? "size-5" : "size-[17px]"} strokeWidth={1.7} aria-hidden="true" />
      {variant === "button" ? "Share" : null}
    </button>
  );
}

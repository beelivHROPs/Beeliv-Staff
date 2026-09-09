import type { Metadata } from "next";
import { PageHeading } from "@/components/shared/PageHeading";
import { ProfileAvatarUpload } from "@/components/shared/ProfileAvatarUpload";
import { SAMPLE_STAFF_PROFILE } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile — same structural pattern as the Applicant Profile page
 * (app/applicant/profile/page.tsx): identity/contact fields only, no
 * submit handler since no backend exists yet in this Stage 1 slice (per
 * CLAUDE.md, no data mutation without the relevant architecture being
 * implemented). Sources from SAMPLE_STAFF_PROFILE, the same record the
 * Staff dashboard's "My Profile" tile already uses.
 */
export default function StaffProfilePage() {
  const { name, position, outlet, department } = SAMPLE_STAFF_PROFILE;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading title="Profile" description="Update your personal information." />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" defaultValue={name} />
            <Field label="Phone number" defaultValue="+234 805 678 9012" />
          </div>
          <div className="mt-4">
            <Field label="Email address" defaultValue="tobi.adewale@example.com" full />
          </div>
          <div className="mt-4">
            <Field label="Home address" defaultValue="7 Allen Avenue, Lagos" full />
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled
              title="Not available yet"
              className="rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 sm:w-64">
          <div className="flex items-center gap-3">
            <ProfileAvatarUpload name={name} />
            <div>
              <div className="text-sm font-semibold text-foreground">{name}</div>
              <div className="text-xs text-muted-foreground">
                {position} · {department} · {outlet}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  full,
}: {
  label: string;
  defaultValue: string;
  full?: boolean;
}) {
  // Derived from label, not a separate prop — labels are unique within
  // each page's Field usages, so this is enough to give every label/input
  // pair a real htmlFor/id association (found missing via a QA sweep).
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        defaultValue={defaultValue}
        disabled
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-70"
      />
    </div>
  );
}

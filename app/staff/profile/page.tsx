import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BookOpen, CalendarClock, Clock, FileStack } from "lucide-react";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProfileAvatarUpload } from "@/components/shared/ProfileAvatarUpload";
import { SAMPLE_STAFF_PROFILE } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "Profile" };

// Real nav destinations only (My Documentation/Schedule/Attendance/SOPs/
// Notifications — the same routes lib/nav-config.ts already links to for
// this role), not invented ones like the GloCafé reference's "Live Chat"/
// "Transaction History" — this app has no such capability.
const QUICK_LINKS = [
  { href: "/staff/documentation", label: "My Documentation", icon: FileStack },
  { href: "/staff/schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/staff/attendance", label: "My Attendance", icon: Clock },
  { href: "/staff/sops", label: "SOPs & Training", icon: BookOpen },
  { href: "/staff/notifications", label: "Notifications", icon: Bell },
] as const;

/**
 * Profile — same structural pattern as the Applicant Profile page
 * (app/applicant/profile/page.tsx): identity/contact fields only, no
 * submit handler since no backend exists yet in this Stage 1 slice (per
 * CLAUDE.md, no data mutation without the relevant architecture being
 * implemented). Sources from SAMPLE_STAFF_PROFILE, the same record the
 * Staff dashboard's "My Profile" tile already uses.
 *
 * Mobile gets its own consumer-app-style header (project-lead: a GloCafé
 * reference — colored hero with avatar/name/status, then a quick-link
 * tile grid) instead of reusing the desktop edit-form layout verbatim —
 * "we have to have different designs for mobile and desktop," and this
 * role (an individual staff member's own account, not an oversight
 * dashboard) is one of the two the project-lead picked for this treatment
 * (the other being Applicant). No fake "Dark Mode"/"Enable Biometric"
 * toggles from that reference — neither is a real Beeliv capability, and
 * the project rules explicitly rule out inventing UI for features that
 * don't exist. The edit-fields form (the one real, confirmed capability
 * here) stays below, unchanged, on both breakpoints.
 */
export default function StaffProfilePage() {
  const { name, position, outlet, department, employmentStatus } = SAMPLE_STAFF_PROFILE;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Full-bleed edge-to-edge, not a rounded card — project-lead:
          "should be like this full page when clicked," pointing at the
          reference's actual execution (color spanning the full screen
          width, a curved white cutout), not the contained-card
          approximation this had before. -mx-4 -mt-4 cancels AppShell's
          own p-4 mobile padding so the color reaches the true edges; the
          curve is a real SVG path (same technique AuthMobileShell's wave
          header already uses elsewhere in this app), not a CSS trick. */}
      <div className="relative -mx-4 -mt-4 mb-4 h-[300px] overflow-hidden sm:hidden">
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          <path d="M0,0 H400 V240 Q200,130 0,240 Z" fill="var(--chart-2)" />
        </svg>
        <div className="relative z-10 px-6 pt-12 text-center text-white">
          <div className="mx-auto flex w-fit justify-center">
            <ProfileAvatarUpload name={name} size="xl" />
          </div>
          <h1 className="font-heading mt-4 text-xl font-semibold">{name}</h1>
          <p className="mt-1 text-sm text-white/70">
            {position} · {outlet}
          </p>
          <div className="mt-3 flex justify-center">
            <StatusBadge label={employmentStatus} tone="success" />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 sm:hidden">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 px-2 py-3 text-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[color:var(--chart-2)]/10 text-[color:var(--chart-2)]">
              <Icon className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="text-xs font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>

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

        {/* Hidden on mobile — the new hero above already shows this same
            identity (avatar/name/position/outlet), just more richly. */}
        <div className="hidden rounded-lg border border-border bg-card p-5 sm:block sm:w-64">
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
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-100"
      />
    </div>
  );
}

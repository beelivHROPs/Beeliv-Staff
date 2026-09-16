import type { Metadata } from "next";
import Link from "next/link";
import { Bell, FileText, FolderOpen, HelpCircle } from "lucide-react";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar } from "@/components/shared/Avatar";
import { SAMPLE_APPLICANT } from "@/lib/placeholder-data";

export const metadata: Metadata = { title: "Profile" };

// Real nav destinations only (My Application/Documents/Notifications/Help —
// the same routes lib/nav-config.ts already links to for this role), not
// invented ones like the GloCafé reference's "Live Chat"/"Transaction
// History" — this app has no such capability.
const QUICK_LINKS = [
  { href: "/applicant/application", label: "My Application", icon: FileText },
  { href: "/applicant/documentation", label: "Documents", icon: FolderOpen },
  { href: "/applicant/notifications", label: "Notifications", icon: Bell },
  { href: "/applicant/help", label: "Help & Support", icon: HelpCircle },
] as const;

/**
 * Profile — matches the confirmed "update personal information" capability
 * (Proposal §2B). Deliberately kept to identity/contact fields only; NIN,
 * banking, and other onboarding documentation live in Documents instead, so
 * this page doesn't duplicate the full onboarding field set.
 *
 * Form is structural/uncontrolled — no submit handler, since no backend
 * exists yet in this Stage 1 slice (per CLAUDE.md, no data mutation without
 * the relevant architecture being implemented).
 *
 * Mobile gets its own consumer-app-style header (project-lead: a GloCafé
 * reference — colored hero with avatar/name/status, then a quick-link tile
 * grid), same treatment as the Staff profile page and for the same reason:
 * an individual's own account, not an oversight dashboard. Uses bg-brand-wash
 * (the same hero wash the Applicant dashboard's own welcome header already
 * uses) rather than a "dashboard tone" color, since Applicant is the one
 * role with no dedicated brand tone (AppShell navTone="default"). No fake
 * "Dark Mode"/"Enable Biometric" toggles — neither is a real capability
 * here.
 */
export default function ApplicantProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Full-bleed edge-to-edge, not a rounded card — project-lead:
          "should be like this full page when clicked," matching the
          reference's actual execution (same technique as the Staff
          profile page's hero). Solid var(--primary) rather than the
          subtle bg-brand-wash tint used elsewhere: that wash was designed
          for dark text on a barely-tinted background (dashboard welcome
          headers), not the bold colored-hero-with-white-text look this
          reference actually shows. Applicant has no assigned dashboard
          tone (AppShell navTone="default"), so this uses the app's own
          primary purple rather than inventing a new color. */}
      <div className="relative -mx-4 -mt-4 mb-4 h-[300px] overflow-hidden sm:hidden">
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          <path d="M0,0 H400 V240 Q200,130 0,240 Z" fill="var(--primary)" />
        </svg>
        <div className="relative z-10 px-6 pt-12 text-center text-white">
          <div className="mx-auto flex w-fit justify-center">
            <Avatar name={SAMPLE_APPLICANT.name} size="xl" ring />
          </div>
          <h1 className="font-heading mt-4 text-xl font-semibold">{SAMPLE_APPLICANT.name}</h1>
          <p className="mt-1 text-sm text-white/70">{SAMPLE_APPLICANT.position}</p>
          <div className="mt-3 flex justify-center">
            <StatusBadge label={SAMPLE_APPLICANT.status} tone="info" />
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3 sm:hidden">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 px-1.5 py-3 text-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
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
            <Field label="Full name" defaultValue={SAMPLE_APPLICANT.name} />
            <Field label="Phone number" defaultValue="+234 801 234 5678" />
          </div>
          <div className="mt-4">
            <Field label="Email address" defaultValue="amaka.okoye@example.com" full />
          </div>
          <div className="mt-4">
            <Field label="Home address" defaultValue="14 Adeola Street, Lagos" full />
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
            identity (avatar/name), just more richly. */}
        <div className="hidden rounded-lg border border-border bg-card p-5 sm:block sm:w-64">
          <div className="flex items-center gap-3">
            <Avatar name={SAMPLE_APPLICANT.name} size="lg" ring />
            <div>
              <div className="text-sm font-semibold text-foreground">{SAMPLE_APPLICANT.name}</div>
              <div className="text-xs text-muted-foreground">Applicant since Aug 12, 2026</div>
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

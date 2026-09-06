import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Briefcase, CalendarClock, Clock, FileStack } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MetricCard } from "@/components/shared/MetricCard";
import { CountUp } from "@/components/shared/CountUp";
import {
  SAMPLE_STAFF_PROFILE,
  SAMPLE_UPCOMING_SHIFTS,
  SAMPLE_STAFF_NOTICES,
  SAMPLE_STAFF_DOCUMENTS,
} from "@/lib/placeholder-data";
import { DASHBOARD_ACCENT_BG } from "@/lib/dashboard-accent";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Assigned Staff Dashboard — docs/architecture/ui-ux-framework.md §3 (major
 * wireframe). The four widgets map 1:1 onto the four CONFIRMED capabilities
 * (rbac.md §2) named in that wireframe: "My Profile" summary (outlet,
 * department, position), "Upcoming Shifts", "Documentation Status", and a
 * "Notices" feed — each also surfaced as one of the top metric tiles, same
 * pattern as the Assigned HR dashboard's widget-per-tile mapping.
 *
 * Deliberately excludes an attendance/leave widget: whether Assigned Staff
 * have self-service access to their own attendance/leave is unresolved
 * (rbac.md §2, STAGE-1-MASTER-PLAN.md §5 item 4). Do not add that widget
 * without a Beeliv/user decision.
 */
export default function StaffDashboardPage() {
  const { name, position, outlet, department, employmentStatus } = SAMPLE_STAFF_PROFILE;
  const firstName = name.split(" ")[0];
  const nextShift = SAMPLE_UPCOMING_SHIFTS[0];
  const latestNotice = SAMPLE_STAFF_NOTICES[0];

  // Derived from SAMPLE_STAFF_DOCUMENTS — the same per-document list
  // app/staff/documentation renders — instead of a hardcoded true. That
  // page previously always showed "Complete" regardless of actual status;
  // this keeps both screens in sync with one source of truth.
  const documentationComplete = SAMPLE_STAFF_DOCUMENTS.every(
    (doc) => doc.status === "submitted" || doc.status === "approved"
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* Welcome header — the one hero moment on this screen. Enriched with
          a "Next Shift" callout (project-lead: give Staff its own feel,
          distinct from HR/Ops's plain scope-text headers and Applicant's
          plain greeting) — the shift that used to only show as one of four
          equal-weight tiles below now leads the page, since "what's my next
          shift" is this role's single most immediate question. Same data
          (SAMPLE_UPCOMING_SHIFTS[0]) still also drives the Upcoming Shifts
          tile — kept per that tile's own 1:1 capability mapping, not
          removed. */}
      <div className="bg-brand-wash mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-5 sm:px-6">
        <div>
          <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-warning uppercase">
            Assigned Staff
          </p>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Good afternoon, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {position} · {outlet}
          </p>
        </div>

        {nextShift ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Next Shift
              </p>
              <p className="text-sm font-semibold text-foreground">
                {nextShift.label} · {nextShift.date}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{nextShift.time}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Key metrics — one tile per wireframe widget, staggered entrance
          (~70ms/tile, design-system.md §15). */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          <MetricCard
            key="profile"
            icon={Briefcase}
            label="My Profile"
            value={
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">{position}</span>
                <StatusBadge label={employmentStatus} tone="success" />
              </div>
            }
            caption={`${department} · ${outlet}`}
          />,
          <MetricCard
            key="shifts"
            icon={CalendarClock}
            label="Upcoming Shifts"
            value={<CountUp value={SAMPLE_UPCOMING_SHIFTS.length} />}
            caption={nextShift ? `Next: ${nextShift.date} · ${nextShift.time}` : "No shifts scheduled"}
          />,
          <MetricCard
            key="documentation"
            icon={FileStack}
            label="Documentation Status"
            value={
              <StatusBadge
                label={documentationComplete ? "Complete" : "Incomplete"}
                tone={documentationComplete ? "success" : "warning"}
              />
            }
            caption={documentationComplete ? "All required items on file" : "Action needed"}
          />,
          <MetricCard
            key="notices"
            icon={Bell}
            label="Notices"
            value={<CountUp value={SAMPLE_STAFF_NOTICES.length} />}
            caption={latestNotice ? latestNotice.title : "No new notices"}
          />,
        ].map((card, i) => (
          <div key={card.key} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            {card}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {/* Primary action: context-dependent per ui-ux-framework.md §3
              ("Complete Outstanding Documentation" if applicable). Secondary
              action: "View SOPs". Leads the page (project-lead: an
              outstanding action shouldn't sit below reference-only lists)
              — was previously last, after Upcoming Shifts/Notices/
              Documentation Status detail. */}
          <Card>
            <CardContent>
              <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Quick Actions
              </h2>
              {/* bg matches this dashboard's own nav color (navTone="lavender"
                  on AppShell, app/staff/layout.tsx). */}
              <div className="flex flex-col gap-2">
                {documentationComplete ? (
                  <Link
                    href="/staff/documentation"
                    className={DASHBOARD_ACCENT_BG.lavender}
                  >
                    View Documentation
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                ) : (
                  <Link
                    href="/staff/documentation"
                    className={DASHBOARD_ACCENT_BG.lavender}
                  >
                    Complete Outstanding Documentation
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                )}
                <Link href="/staff/sops" className={buttonVariants({ variant: "outline" })}>
                  <BookOpen data-icon="inline-start" />
                  View SOPs
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Status detail */}
          <Card>
            <CardContent>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Documentation Status
                </h2>
                <StatusBadge
                  label={documentationComplete ? "Complete" : "Incomplete"}
                  tone={documentationComplete ? "success" : "warning"}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {documentationComplete
                  ? "All required documentation is on file."
                  : "Some required documentation is outstanding."}
              </p>
              <Link
                href="/staff/documentation"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                View Documentation →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Upcoming Shifts */}
          <Card>
            <CardContent>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Upcoming Shifts
                </h2>
                <Link href="/staff/schedule" className="text-xs font-medium text-primary hover:underline">
                  View Schedule →
                </Link>
              </div>
              {SAMPLE_UPCOMING_SHIFTS.length > 0 ? (
                <ul className="m-0 list-none space-y-2.5 p-0">
                  {SAMPLE_UPCOMING_SHIFTS.map((shift) => (
                    <li
                      key={shift.id}
                      className="flex items-center justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{shift.label}</div>
                        <div className="text-xs text-muted-foreground">{shift.date}</div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{shift.time}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
              )}
            </CardContent>
          </Card>

          {/* Notices feed */}
          <Card>
            <CardContent>
              <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Notices
              </h2>
              {SAMPLE_STAFF_NOTICES.length > 0 ? (
                <ul className="m-0 list-none space-y-2.5 p-0">
                  {SAMPLE_STAFF_NOTICES.map((notice) => (
                    <li
                      key={notice.id}
                      className="flex items-start gap-2.5 border-b border-border pb-2.5 last:border-0 last:pb-0"
                    >
                      <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{notice.title}</div>
                        <div className="text-xs text-muted-foreground">{notice.date}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No new notices.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

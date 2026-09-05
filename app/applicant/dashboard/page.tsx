import type { Metadata } from "next";
import { ClipboardCheck, Clock, FileStack, Lightbulb, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { MetricCard } from "@/components/shared/MetricCard";
import { TrendChart } from "@/components/shared/TrendChart";
import { CountUp } from "@/components/shared/CountUp";
import { ApplicationJourney, type JourneyStage } from "@/components/applicant/ApplicationJourney";
import { RequiredActionCard, type OutstandingAction } from "@/components/applicant/RequiredActionCard";
import { ActivityTimeline } from "@/components/applicant/ActivityTimeline";
import { SAMPLE_APPLICANT, SAMPLE_APPLICATION_ACTIVITY } from "@/lib/placeholder-data";
import { MAX_UPLOAD_SIZE_MB } from "@/lib/constraints";

export const metadata: Metadata = { title: "Overview" };

/**
 * Applicant Overview — the real implementation of the Applicant Portal
 * Overview design reviewed and approved as an artifact. Widget sourcing:
 * - Application status/position/ID: CONFIRMED capability (Proposal §2B);
 *   the journey stage labels/sequencing are PROPOSED (recruitment-workflow.md §B).
 * - Outstanding documentation: CONFIRMED (Proposal §2B).
 * - Recent activity: CONFIRMED that status/history is tracked; the specific
 *   log-entry shape shown here is PROPOSED (Proposal §2B: "status AND history").
 * - No assessment widget, no charts beyond a compact trend line of the
 *   applicant's own progress-over-time (recharts, via components/shared/
 *   TrendChart) — no invented business metrics.
 */
export default function ApplicantDashboardPage() {
  const {
    name,
    position,
    applicationId,
    appliedOn,
    outlet,
    status,
    isShortlisted,
    documentsComplete,
    documentsTotal,
    progressPercent,
  } = SAMPLE_APPLICANT;

  const firstName = name.split(" ")[0];
  const outstandingCount = documentsTotal - documentsComplete;
  const documentsPercent = Math.round((documentsComplete / documentsTotal) * 100);

  // Applicant-facing simplification of the CONFIRMED 8-stage workflow
  // (BEELIV-SOURCE-OF-TRUTH.md §3) — see ApplicationJourney.tsx's own
  // comment for why it collapses to 5 stages. Replaces the earlier stale
  // "Applied → Under Review → Decision" 3-stage version.
  const journeyStages: JourneyStage[] = [
    { label: "Application", date: "Aug 12", state: "done" },
    { label: "Review", date: "Aug 14", state: "current" },
    { label: "Interview & Assessment", date: "Pending", state: "upcoming" },
    { label: "Documentation", date: "Pending", state: "upcoming" },
    { label: "Final Decision", date: "Pending", state: "upcoming" },
  ];

  // Documentation (and its NIN-upload outstanding action) only applies once
  // shortlisted — see lib/placeholder-data.ts's SAMPLE_APPLICANT comment.
  // Before that there's genuinely nothing for the applicant to do yet, so
  // this reuses RequiredActionCard's existing "all caught up" state (null)
  // rather than inventing a third UI state for "waiting on review."
  const outstandingAction: OutstandingAction | null =
    isShortlisted && outstandingCount > 0
      ? {
          title: "NIN Document",
          description: `Please upload a valid document to continue your application. Max file size: ${MAX_UPLOAD_SIZE_MB}MB.`,
          actionLabel: "Upload Document",
          actionHref: "/applicant/documentation",
        }
      : null;

  // Illustrative trend of the applicant's own progress % over each of the
  // last 5 status updates — not a business metric, just a compact rendering
  // of the same "progress" number already shown elsewhere on this page.
  const progressTrend = [8, 12, 18, 20, progressPercent];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Welcome header — the one hero moment on this screen, so it's also
          the one place carrying the bg-brand-wash gradient accent. */}
      <div className="bg-brand-wash mb-5 rounded-2xl px-4 py-5 sm:px-6">
        <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-warning uppercase">
          Applicant Portal
        </p>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Good afternoon, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s the latest on your application
          {outstandingAction ? " — one item needs your attention below." : "."}
        </p>
      </div>

      {/* Application summary */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">{position}</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                Application ID: {applicationId} · Applied {appliedOn} · {outlet}
              </div>
            </div>
            <div className="flex items-center gap-5">
              <StatusBadge label={status} tone="info" />
              <ProgressRing
                value={progressPercent}
                label={
                  <div>
                    <div className="text-lg leading-none font-semibold text-foreground">
                      <CountUp value={progressPercent} suffix="%" />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">progress</div>
                  </div>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application journey */}
      <div className="mb-4">
        <ApplicationJourney
          stages={journeyStages}
          note="Your application is being reviewed by the recruitment team. We'll notify you as soon as there's an update."
        />
      </div>

      {/* Key metrics — staggered entrance, ~70ms/tile (design-system.md §15). */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          <MetricCard
            key="status"
            icon={ClipboardCheck}
            label="Application Status"
            value={<StatusBadge label={status} tone="info" />}
            caption="Since Aug 14, 2026"
          />,
          <MetricCard
            key="documents"
            icon={FileStack}
            label="Documents"
            value={
              <>
                <CountUp value={documentsComplete} /> / {documentsTotal}
              </>
            }
            caption={<Progress value={documentsPercent} className="mt-1" />}
          />,
          <MetricCard
            key="progress"
            icon={TrendingUp}
            label="Application Progress"
            value={<CountUp value={progressPercent} suffix="%" />}
            trailing={<TrendChart values={progressTrend} />}
            caption="Overall completion"
          />,
          <MetricCard
            key="updated"
            icon={Clock}
            label="Last Updated"
            value="Today, 10:42 AM"
            caption="Aug 14, 2026"
          />,
          <MetricCard
            key="tip"
            icon={Lightbulb}
            label="Quick Tip"
            value={<span className="text-sm font-medium">Stay ready</span>}
            caption="Keep documents current — we'll notify you here the moment something changes."
            accent
          />,
        ].map((card, i) => (
          <div key={card.key} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            {card}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <RequiredActionCard action={outstandingAction} />

          <Card>
            <CardContent>
              <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Helpful Information
              </h2>
              <ul className="m-0 list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
                <li>Keep your documents up to date</li>
                <li>Check notifications regularly</li>
                <li>Respond promptly to document requests</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Recent Activity
            </h2>
            <ActivityTimeline items={SAMPLE_APPLICATION_ACTIVITY} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

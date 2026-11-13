"use client";

import "./calm.css";
import { useOnboarding, useOverview } from "@/lib/client/hooks";
import { useOutletState } from "@/lib/client/outlet";
import { ActivityCard, TeamCard } from "./ActivityTeam";
import { AttendanceTodayCard } from "./AttendanceCards";
import { AttentionCard } from "./AttentionCard";
import { Banner } from "./Banner";
import { FreshBanner, WhatHappensNext } from "./FreshAccount";
import { DistributionCard } from "./DistributionCard";
import { MetricStrip } from "./MetricStrip";
import { OnboardingWelcome } from "./OnboardingWelcome";
import { ComplianceCard, PayrollCard } from "./OpsCards";
import { OverviewError, OverviewSkeleton } from "./OverviewStates";
import { PhoneHome } from "./PhoneHome";
import { RecruitmentCard } from "./RecruitmentCard";
import { CoverageCard, WeekStripCard } from "./ScheduleCards";
import { WorkforceToday } from "./WorkforceToday";
import { usePilotMenu } from "@/lib/pilot/context";

/**
 * Overview = an operational briefing (brief section 7). One question: "how is
 * my operation doing today, and what needs my attention?" It answers in the
 * banner + five numbers, then an editorial grid where cards are deliberately
 * different sizes (12 columns from 1241px, 2 on tablets, 1 on phones).
 *
 * DOM order is the desktop reading order. On phones `order-*` reorders it on
 * purpose: attention first, then who is on today, then coverage, then the
 * two at-a-glance rings (charts live on Analytics), then the slower-moving sections. The Overview (banner, tiles,
 * attention) comes from one getOverview call; each card loads its own data, so
 * one slow or failed section never blanks the page.
 */
export function OverviewBody() {
  const { data: ov, status, retry } = useOverview();
  const outlet = useOutletState();
  const onboarding = useOnboarding();
  const pilot = usePilotMenu();

  if (status === "loading" || onboarding.status === "loading") return <OverviewSkeleton />;
  if (status === "error" || !ov) return <OverviewError retry={retry} />;

  const empty = ov.metrics.activeStaff === 0;
  return (
    <div className="calm-client flex flex-col gap-5 min-[768px]:gap-4">
      {/* New client: the non-blocking "Getting started" card above the Overview; renders nothing once everything is done. */}
      <OnboardingWelcome />
      {empty ? (
        <>
          <FreshBanner ov={ov} firstOutlet={outlet.outlets[0] ?? null} />
          <WhatHappensNext />
          <TeamCard team={ov.team} />
        </>
      ) : (
        <>
        {/* Phones get their own short Home (PhoneHome); the approved desktop Overview below is hidden under 768px. */}
        <PhoneHome ov={ov} />
        <div className="flex flex-col gap-4 max-[767px]:hidden">
        <Banner ov={ov} firstOutlet={outlet.outlets[0] ?? null} />
        <MetricStrip ov={ov} />
        {pilot ? (
          /* Pilot menu: attendance, schedule, compliance and payroll cards point only at later-stage screens, so they are left out. */
          <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2 min-[768px]:gap-4 min-[1241px]:grid-cols-12">
            <AttentionCard items={ov.attention} className="order-1 min-[768px]:order-none min-[1241px]:col-span-4 min-[1241px]:col-start-9 min-[1241px]:row-start-1" />
            <RecruitmentCard showOutlet={ov.scope === "all"} className="order-2 min-[768px]:order-none min-[1241px]:col-span-8 min-[1241px]:row-start-1" />
            <DistributionCard className="order-3 min-[768px]:order-none min-[1241px]:col-span-4" />
            <ActivityCard className="order-4 min-[768px]:order-none min-[1241px]:col-span-8" />
            <TeamCard team={ov.team} className="order-5 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-12" />
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-5 min-[768px]:grid-cols-2 min-[768px]:gap-4 min-[1241px]:grid-cols-12">
          <WorkforceToday className="order-2 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-8" />
          <AttentionCard items={ov.attention} className="order-1 min-[768px]:order-none min-[1241px]:col-span-4" />
          {/* Phone: the figures strip and Today's workforce already say this; the two charts live on desktop and in Analytics. */}
          <AttendanceTodayCard className="order-4 max-[767px]:hidden min-[768px]:order-none min-[1241px]:col-span-4" />
          <DistributionCard className="order-5 max-[767px]:hidden min-[768px]:order-none min-[1241px]:col-span-4" />
          <CoverageCard className="order-3 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-4" />
          <WeekStripCard className="order-6 max-[767px]:hidden min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-8" />
          <ComplianceCard className="order-9 min-[768px]:order-none min-[1241px]:col-span-4" />
          <RecruitmentCard showOutlet={ov.scope === "all"} className="order-7 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-8" />
          <PayrollCard className="order-10 min-[768px]:order-none min-[1241px]:col-span-4" />
          <ActivityCard className="order-11 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-12" />
          <TeamCard team={ov.team} className="order-12 min-[768px]:order-none min-[768px]:col-span-2 min-[1241px]:col-span-12" />
        </div>
        )}
        </div>
        </>
      )}
    </div>
  );
}

"use client";

import "./calm.css";
import { CHART_CSS } from "./meta";
import { greeting as greetingText } from "@/lib/admin/format";
import type { HrOverview } from "@/lib/admin/types";
import { AttendancePanel, DepartmentPanel, TasksPanel } from "./InteractiveDesktop";
import { ActivityFlat, ApplicationsFlat, AttentionFlat, ClientsFlat, GlanceLine, PipelineFlat, PlacementFlat, StatStrip, TalentFlat, VacanciesFlat, Greeting } from "./HomeDesktop";
import { NeedsToday } from "./NeedsToday";
import { useNeedsDesktop } from "./NeedsTodayDesktop";

/**
 * DESKTOP/TABLET (>=768px) Admin Home: the OLD calm layout (restored 2026-10-27 from git HEAD).
 * OverviewBody renders this beside the phone Home and switches them with CSS only
 * (this one is hidden below 768px). Phone-only pieces of the old file (PhoneTop, PhoneGlance,
 * PhoneLists, "Show more insights") are left out because they were hidden at this width anyway.
 */

export function LoadedDesktop({ ov, firstName, canCreate }: { ov: HrOverview; firstName: string; canCreate: boolean }) {
  const needs = useNeedsDesktop(ov);
  const wide = "min-[768px]:col-span-2";
  return (
    <div className="calm-home calm-desktop flex flex-col gap-6 pb-24">
      <style>{CHART_CSS}</style>
      <div className="grid grid-cols-1 gap-6 min-[1241px]:grid-cols-12">
        <Greeting greeting={greetingText()} firstName={firstName} needs={needs} interviews={ov.interviewsToday} canCreate={canCreate} bannerImageUrl={ov.bannerImageUrl ?? null} className="min-[1241px]:col-span-7" />
        <NeedsToday needs={needs} className="min-[1241px]:col-span-5" />
      </div>
      <div>
        <StatStrip metrics={ov.metrics} trends={ov.trends} />
      </div>
      <GlanceLine />
      <div className="grid grid-cols-1 gap-6 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-12">
        <ApplicationsFlat items={ov.recentApplications} className={`${wide} min-[1241px]:col-span-8 min-[1241px]:self-stretch`} />
        <AttentionFlat items={ov.attention} className={`${wide} min-[1241px]:col-span-4`} />
        <PipelineFlat pipeline={ov.pipeline} className={`${wide} min-[1241px]:col-span-5`} />
        <DepartmentPanel items={ov.applicantsByDepartment} className="min-[1241px]:col-span-3" />
        <AttendancePanel periods={ov.attendance} className="min-[1241px]:col-span-4" />
        <VacanciesFlat items={ov.vacancies} className={`${wide} min-[1241px]:col-span-8`} />
        <TasksPanel tasks={ov.tasks} className="min-[1241px]:col-span-4" />
        <ActivityFlat items={ov.activity} className={`${wide} min-[1241px]:col-span-8`} />
        <div className="flex flex-col gap-6 min-[768px]:col-span-2 min-[768px]:grid min-[768px]:grid-cols-3 min-[1241px]:col-span-4 min-[1241px]:flex">
          <PlacementFlat placement={ov.placement} />
          <ClientsFlat items={ov.clientsOutlets} />
          <TalentFlat summary={ov.talentPool} />
        </div>
      </div>
    </div>
  );
}

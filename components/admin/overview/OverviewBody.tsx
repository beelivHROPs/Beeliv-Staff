"use client";

import "./calm.css";
import { CHART_CSS } from "./meta";
import { greeting } from "@/lib/admin/format";
import { useAdminSession, useHrOverview } from "@/lib/admin/hooks";
import type { HrLevel, HrOverview } from "@/lib/admin/types";
import { AttendancePanel, DepartmentPanel, TasksPanel } from "./Interactive";
import { ActivityFlat, ApplicationsFlat, AttentionFlat, ClientsFlat, Greeting, HomeNumbers, PipelineFlat, PlacementFlat, TalentFlat, VacanciesFlat } from "./Home";
import { HomeMore } from "./BannerControl";
import { Greeting as GreetingDesktop } from "./HomeDesktop";
import { LoadedDesktop } from "./OverviewDesktop";
import { NeedsToday, useNeeds } from "./NeedsToday";
import { RoleHomePhone } from "./RoleHome";
import { OverviewEmpty, OverviewError, OverviewSkeleton } from "./states";
import { ScopeEmpty, ScopeNote } from "@/components/admin/ScopeNote";
import { useAdminScope } from "@/lib/admin/scope";
import { OPS_USER, useAdminIdentity } from "@/lib/admin/ops/identity";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * HR Home (calm redesign, sample). Reading order: a short greeting that says
 * how many things need you, the "Needs you today" list, one stat strip, then
 * today's work (interviews, recent applications, attention). Everything else
 * is quieter and, on phones, sits behind "Show more insights".
 * Capabilities come from the session: HR can submit for approval but never
 * approves, so no approval action appears anywhere on this page.
 */
export function OverviewBody() {
  const { data: ov, status, retry } = useHrOverview();
  const { data: session } = useAdminSession();
  const scope = useAdminScope();
  const identity = useAdminIdentity();

  if (status === "loading" || (status !== "error" && !session)) return <OverviewSkeleton />;
  if (status === "error" || (!ov && status !== "empty") || !session) return <OverviewError retry={retry} />;

  const canCreate = session.capabilities.canCreateVacancy;
  // Operations uses the HR Home but is a different person (the shell header already says so).
  const firstName = identity === "ops" ? OPS_USER.firstName : session.user.firstName;
  if (status === "empty" || !ov) {
    return (
      <>
        <div className="calm-home flex flex-col gap-4 min-[768px]:hidden">
          <Greeting greeting={greeting()} firstName={firstName} needs={[]} bannerImageUrl={null} />
          {scope.none ? <ScopeEmpty /> : <OverviewEmpty canCreateVacancy={canCreate} />}
        </div>
        <div className="calm-home flex flex-col gap-4 max-[767px]:hidden">
          <GreetingDesktop greeting={greeting()} firstName={firstName} needs={[]} canCreate={canCreate} bannerImageUrl={null} />
          {scope.none ? <ScopeEmpty /> : <OverviewEmpty canCreateVacancy={canCreate} />}
        </div>
      </>
    );
  }
  // Phone (<768px) keeps the current Home; desktop and tablet (>=768px) get the OLD Home. CSS-only switch, same data hooks.
  return (
    <>
      <div className="min-[768px]:hidden">
        <Loaded ov={ov} firstName={firstName} canCreate={canCreate} hrLevel={session.hrLevel} />
      </div>
      <div className="max-[767px]:hidden">
        <LoadedDesktop ov={ov} firstName={firstName} canCreate={canCreate} />
      </div>
    </>
  );
}

function Loaded({ ov, firstName, canCreate, hrLevel }: { ov: HrOverview; firstName: string; canCreate: boolean; hrLevel: HrLevel }) {
  const needs = useNeeds(ov);
  // Pilot menu: the Attendance chart points only at a later-stage screen, so it is left out and its neighbour takes the room.
  const showAttendance = !usePilotHidden()("/admin/workforce/attendance");

  // Secondary panels: desktop only. The phone Home is RoleHomePhone and ends after "Up next".
  const rest = "max-[767px]:hidden";
  const wide = "min-[768px]:col-span-2";
  return (
    <div className="calm-home flex flex-col gap-4 pb-24">
      <style>{CHART_CSS}</style>
      <div className="flex items-center justify-between gap-3 max-[767px]:px-1">
        <ScopeNote className="" />
        <span className="max-[767px]:hidden">
          <HomeMore canCreate={canCreate} />
        </span>
      </div>
      <RoleHomePhone ov={ov} needs={needs} hrLevel={hrLevel} />
      <div className="grid grid-cols-1 gap-4 max-[767px]:hidden min-[1241px]:grid-cols-12">
        <Greeting greeting={greeting()} firstName={firstName} needs={needs} interviews={ov.interviewsToday} bannerImageUrl={ov.bannerImageUrl ?? null} className="min-[1241px]:col-span-7" />
        <NeedsToday needs={needs} className="min-[1241px]:col-span-5" />
      </div>
      <div className="max-[767px]:hidden">
        <HomeNumbers metrics={ov.metrics} trends={ov.trends} />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-12">
        <ApplicationsFlat items={ov.recentApplications} className={`max-[767px]:hidden ${wide} min-[1241px]:col-span-8 min-[1241px]:self-stretch`} />
        <AttentionFlat items={ov.attention} className={`max-[767px]:hidden ${wide} min-[1241px]:col-span-4`} />
        <PipelineFlat pipeline={ov.pipeline} className={`${rest} ${wide} min-[1241px]:col-span-5`} />
        <DepartmentPanel items={ov.applicantsByDepartment} className={`${rest} ${showAttendance ? "min-[1241px]:col-span-3" : "min-[1241px]:col-span-7"}`} />
        {showAttendance ? <AttendancePanel periods={ov.attendance} className={`${rest} min-[1241px]:col-span-4`} /> : null}
        <VacanciesFlat items={ov.vacancies} className={`${rest} ${wide} min-[1241px]:col-span-8`} />
        <TasksPanel tasks={ov.tasks} className={`${rest} min-[1241px]:col-span-4`} />
        <ActivityFlat items={ov.activity} className={`${rest} ${wide} min-[1241px]:col-span-8`} />
        <div className={`${rest} flex flex-col gap-4 min-[768px]:col-span-2 min-[768px]:grid min-[768px]:grid-cols-3 min-[1241px]:col-span-4 min-[1241px]:flex`}>
          <PlacementFlat placement={ov.placement} />
          <ClientsFlat items={ov.clientsOutlets} />
          <TalentFlat summary={ov.talentPool} />
        </div>
      </div>
    </div>
  );
}

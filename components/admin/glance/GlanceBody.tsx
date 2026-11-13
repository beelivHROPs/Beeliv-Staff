"use client";

/**
 * Business at a glance (/admin/reports/glance). Client-style page: serif title,
 * one card per section: key-number tiles, two charts, By client, and (Operations
 * preview only) By HR officer. COUNTS ONLY, never money. HR sees only its own
 * assigned clients. Reused: PageHeading, EmptyState, SelectMenu, ErrorPanel,
 * Restricted, Reports ChartPanel (client charts), ByClient/ByHr tables.
 */
import Link from "next/link";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { Restricted } from "@/components/admin/offers/parts";
import { ChevronLeft } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { BarChart3 } from "@/components/client/icons";
import { ReportChartPanel } from "@/components/admin/reports/ReportCharts";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useGlance, usePreviewScope } from "@/lib/admin/glance/hooks";
import type { GlanceScope } from "@/lib/admin/glance/types";
import { ByClientTable } from "./ByClientTable";
import { ByHrTable } from "./ByHrTable";
import { GlanceTiles } from "./GlanceTiles";

const SCOPE_LABEL: Record<GlanceScope, string> = { hr: "HR Officer", all: "Operations" };

/** DEV ONLY: pretends to be an HR Officer (own clients) or Operations (all). Delete with the mock. */
function PreviewScopeSwitch() {
  const [scope, setScope] = usePreviewScope();
  if (!SHOW_PROTOTYPE_CONTROLS) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-[12px] text-(--ap-muted)">
      <span className="font-bold">Prototype: previewing as</span>
      <div className="w-[150px]">
        <SelectMenu label="Preview as" variant="compact" value={SCOPE_LABEL[scope]} onChange={(v) => setScope(v === "Operations" ? "all" : "hr")} options={["HR Officer", "Operations"]} className="h-9 w-full text-[13px]" />
      </div>
    </div>
  );
}

export function GlanceBody() {
  const [scope] = usePreviewScope();
  const { data, status, retry } = useGlance(scope);
  const head = (
    <>
      <Link href="/admin/reports" className="mb-2 inline-flex items-center gap-1 text-[13px] font-bold text-(--ap-violet)">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Reports
      </Link>
      <PageHeading title="Business at a glance" />
      <div className="mb-4">
        <PreviewScopeSwitch />
      </div>
    </>
  );

  if (status === "error")
    return (
      <>
        {head}
        <ErrorPanel title="We could not load the numbers" retry={retry} />
      </>
    );
  if (status === "restricted")
    return (
      <>
        {head}
        <Restricted what="Business at a glance" />
      </>
    );
  if (status === "empty")
    return (
      <>
        {head}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BarChart3} title="Numbers appear once there is activity" description="Placements, jobs and client requests will be counted here as they happen." />
        </div>
      </>
    );
  if (!data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading the numbers">
        {head}
        <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-3 min-[1241px]:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ap-shimmer h-[150px] rounded-2xl" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2">
          <div className="ap-shimmer h-[300px] rounded-[20px]" />
          <div className="ap-shimmer h-[300px] rounded-[20px]" />
        </div>
        <div className="ap-shimmer mt-5 h-[260px] rounded-[20px]" />
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <div>{head}</div>
      <GlanceTiles tiles={data.tiles} />
      {data.notShown.map((n) => (
        <p key={n} className="-mt-3 text-[12px] text-(--ap-muted)">
          Not shown: {n}
        </p>
      ))}
      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2 min-[1241px]:gap-5">
        {data.charts.map((c) => (
          <ReportChartPanel key={c.id} chart={c} />
        ))}
      </div>
      <ByClientTable rows={data.byClient} />
      {data.byHr ? <ByHrTable rows={data.byHr} /> : null}
    </div>
  );
}

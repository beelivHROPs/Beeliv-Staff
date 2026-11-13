"use client";

/**
 * Reports hub (spec 14 "Recruitment Reports", 28.1 Reports). Recruitment
 * reports first; Workforce / Attendance and Compliance are read-only entries
 * marked "later" (not built in this phase). Report list is adapter data.
 */
import Link from "next/link";
import { Disc } from "@/components/admin/overview/Disc";
import { Restricted } from "@/components/admin/offers/parts";
import { ArrowRight, Briefcase, CalendarCheck, Clock3, FileText, ShieldCheck, Users } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { BarChart3 } from "@/components/client/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useReportList } from "@/lib/admin/reports/hooks";
import type { ReportEntry } from "@/lib/admin/reports/types";
import { reportHref } from "./meta";

const ICON: Record<string, LucideIcon> = { vacancy: Briefcase, pipeline: Users, interview: CalendarCheck, placement: ShieldCheck, history: FileText, workforce: Clock3, compliance: ShieldCheck };

export function ReportsHub() {
  const live = useReportList();
  const heading = <PageHeading title="Reports" />;
  if (live.status === "error")
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load the reports" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {heading}
        <Restricted what="Reports" />
      </>
    );
  if (live.status === "empty")
    return (
      <>
        {heading}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BarChart3} title="No reports available" description="Reports appear here once your account has access to them." />
        </div>
      </>
    );
  if (!live.data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading reports">
        {heading}
        <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ap-shimmer h-[132px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  const rec = live.data.filter((r) => r.group === "recruitment");
  const later = live.data.filter((r) => r.group !== "recruitment");
  return (
    <div>
      {heading}
      <Link href="/admin/reports/glance" className="ap-card ap-card-hover mb-6 flex items-center gap-4 rounded-2xl p-4.5">
        <Disc icon={BarChart3} tone="brand" />
        <div className="min-w-0 flex-1">
          <b className="block text-[17px] leading-tight">Business at a glance</b>
          <p className="mt-1 text-[14px] leading-snug text-(--ap-muted)">The main numbers in one view: placements, open jobs, client requests and your clients.</p>
        </div>
        <ArrowRight className="size-4 text-(--ap-violet)" aria-hidden="true" />
      </Link>
      <h2 className="ap-serif mb-3 text-[18px] leading-tight">Recruitment reports</h2>
      <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
        {rec.map((r) => (
          <Card key={r.id} r={r} />
        ))}
      </div>
      {later.length ? (
        <>
          <h2 className="ap-serif mt-8 mb-3 text-[18px] leading-tight">Coming later</h2>
          <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3">
            {later.map((r) => (
              <Card key={r.id} r={r} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Card({ r }: { r: ReportEntry }) {
  const body = (
    <>
      <Disc icon={ICON[r.id] ?? BarChart3} tone={r.availability === "later" ? "info" : "brand"} />
      <div className="min-w-0 flex-1">
        <b className="block text-[17px] leading-tight">{r.title}</b>
        <p className="mt-1 text-[14px] leading-snug text-(--ap-muted)">{r.description}</p>
        {r.availability === "later" ? (
          <span className="mt-2 inline-flex h-6 items-center rounded-full bg-(--ap-line-2) px-2.5 text-[12px] font-bold text-(--ap-muted)">Later</span>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-(--ap-violet)">
            Open report <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );
  const cls = "ap-card flex items-start gap-4 rounded-2xl p-4.5";
  return r.availability === "available" && r.report ? (
    <Link href={reportHref(r.report)} className={`${cls} ap-card-hover`}>
      {body}
    </Link>
  ) : (
    <div className={`${cls} opacity-80`} aria-disabled="true">
      {body}
    </div>
  );
}

"use client";

/**
 * Company reports hub: a calm list of five counts-only reports in one container.
 * Each row: name, one line, a small headline figure, chevron. No money anywhere.
 * States: loading, empty, error, restricted.
 */
import Link from "next/link";
import { GROUP, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { BarChart3 } from "@/components/client/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsReportList } from "@/lib/admin/ops/opsreports-hooks";
import { opsReportHref } from "./meta";

export function OpsReportsHub() {
  return (
    <OpsOnly what="Company reports" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const live = useOpsReportList();
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
        <Restricted what="Company reports" />
      </>
    );
  if (live.status === "loading") return <Skeleton />;
  if (!live.data)
    return (
      <>
        {heading}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={BarChart3} title="No reports yet" description="Reports appear once recruitment records exist." />
        </div>
      </>
    );
  return (
    <div>
      {heading}
      <p className="-mt-1 mb-4 max-w-[60ch] text-[14px] text-(--ap-muted)">Company-wide counts across every client and HR officer. No money figures here.</p>
      <ul className={`${GROUP} m-0 max-w-[820px] list-none p-0`}>
        {live.data.map((r) => (
          <li key={r.id} className={ROW_LINE}>
            <Link href={opsReportHref(r.id)} className="flex min-h-[68px] items-center gap-4 px-4 py-3 hover:bg-(--ap-tint-soft)">
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] leading-tight font-semibold text-(--ap-ink)">{r.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">{r.description}</span>
              </span>
              {r.headline ? (
                <span className="shrink-0 text-right leading-tight">
                  <b className={`block text-[17px] tabular-nums ${r.headline.tone === "bad" ? "text-(--ap-rose)" : "text-(--ap-ink)"}`}>{r.headline.value}</b>
                  <span className="block text-[12px] text-(--ap-muted)">{r.headline.label}</span>
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading reports">
      <PageHeading title="Reports" />
      <div className="flex max-w-[820px] flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="ap-shimmer h-[68px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

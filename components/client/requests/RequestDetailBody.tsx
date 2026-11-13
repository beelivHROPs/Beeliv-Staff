"use client";

import Link from "next/link";
import { ArrowUpLeft, Check, CircleHelp, UsersRound } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { useCandidates, useWorkforceRequest } from "@/lib/client/hooks";
import { dayMonth, fullDate, plural } from "@/lib/client/format";
import { DEPARTMENT_LABEL } from "@/lib/client/labels";
import { recruitmentHref } from "@/lib/client/links";
import { useOutletState } from "@/lib/client/outlet";
import { AnalyticsPanel } from "../charts";
import { BackRow, PageError, PageSkeleton } from "../recruitment/states";
import { REQUEST_STATUS_LABEL, REQUEST_STEPS, RequestStatusChip } from "./meta";

const BACK = (
  <BackRow>
    <Link href="/client/requests" className="ap-hit inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
      <ArrowUpLeft className="size-4" aria-hidden="true" /> Back to Workforce Requests
    </Link>
  </BackRow>
);

/** One request: what was asked, where it stands, and the candidates Beeliv has submitted for it. */
export function RequestDetailBody({ id }: { id: string }) {
  const { data, status, retry } = useWorkforceRequest(id);
  const cands = useCandidates();
  const outlet = useOutletState();

  if (status === "loading") return <PageSkeleton title="Workforce request" label="Loading request" blocks={[130, 220, 160]} />;
  if (status === "error") return <PageError heading="Workforce request" title="We couldn't load this request" retry={retry} />;
  if (!data) {
    return (
      <div>
        {BACK}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <h1 className="sr-only">Request not found</h1>
          <EmptyState icon={CircleHelp} title="Request not found" description="This request isn't in your outlet scope." action={<Link href="/client/requests" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">View requests</Link>} />
        </div>
      </div>
    );
  }

  const r = data;
  const closed = r.status === "closed";
  const stepIdx = closed ? REQUEST_STEPS.length : REQUEST_STEPS.indexOf(r.status);
  const ready = (cands.data ?? []).filter((c) => c.outletId === r.outletId && c.position === r.role && c.feedback === null).length;
  const facts: [string, string][] = [
    ["Outlet", outlet.outlets.find((o) => o.id === r.outletId)?.name ?? ""],
    ["Department", DEPARTMENT_LABEL[r.departmentId]],
    ["Number required", String(r.count)],
    ["Desired resumption", fullDate(r.resumptionDate)],
    ["Reason", r.reason],
    ["Submitted", fullDate(r.submittedOn)],
    ["Last updated", fullDate(r.updatedOn)],
  ];

  return (
    <div>
      {BACK}
      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        <header className="ap-card flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-5 min-[768px]:p-6">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[30px]">
              {r.role} <span className="font-semibold text-(--ap-muted)">x {r.count}</span>
            </h1>
            <p className="mt-1 text-[15px] text-(--ap-muted)">{r.publicId} · Sent to Beeliv on {dayMonth(r.submittedOn)}</p>
          </div>
          <RequestStatusChip status={r.status} />
        </header>

        {r.hasUpdate ? (
          <p className="rounded-xl bg-(--ap-tint) px-4 py-3 text-[14px] font-semibold text-(--ap-violet)" role="status">
            Beeliv updated this request on {dayMonth(r.updatedOn)}.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1101px]:grid-cols-2">
          <AnalyticsPanel title="Progress" subtitle={REQUEST_STATUS_LABEL[r.status]}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {REQUEST_STEPS.map((s, i) => {
                const done = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <li key={s} className="flex items-center gap-3" aria-current={current ? "step" : undefined}>
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-(--ap-ok-bg) text-(--ap-ok)" : current ? "bg-(--ap-violet) text-white" : "bg-(--ap-line-2) text-(--ap-muted)"}`}>
                      {done ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={`text-[14.5px] ${current ? "font-bold text-(--ap-ink)" : done ? "text-(--ap-ink-2)" : "text-(--ap-muted)"}`}>{REQUEST_STATUS_LABEL[s]}</span>
                  </li>
                );
              })}
            </ol>
            {closed ? <p className="mt-3 border-t border-(--ap-line-2) pt-2.5 text-[13px] text-(--ap-muted)">This request is closed.</p> : null}
          </AnalyticsPanel>

          <AnalyticsPanel title="Request details">
            <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 min-[520px]:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">{k}</dt>
                  <dd className="m-0 mt-0.5 text-[15px] text-(--ap-ink)">{v}</dd>
                </div>
              ))}
            </dl>
            {r.notes ? (
              <div className="mt-4 border-t border-(--ap-line-2) pt-3">
                <h3 className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Notes</h3>
                <p className="mt-0.5 text-[15px] leading-snug text-(--ap-ink-2)">{r.notes}</p>
              </div>
            ) : null}
          </AnalyticsPanel>
        </div>

        {ready > 0 ? (
          <AnalyticsPanel title="Candidates for this request">
            <Link href={recruitmentHref({ status: "awaiting-feedback" })} className="flex items-center gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3.5 py-3 hover:border-(--ap-tint-2)">
              <UsersRound className="size-5 text-(--ap-violet)" aria-hidden="true" />
              <b className="flex-1 text-[14.5px] text-(--ap-ink)">{plural(ready, "candidate")} ready for your review</b>
              <span className="text-[13px] font-bold text-(--ap-violet)">Review</span>
            </Link>
          </AnalyticsPanel>
        ) : null}
      </div>
    </div>
  );
}

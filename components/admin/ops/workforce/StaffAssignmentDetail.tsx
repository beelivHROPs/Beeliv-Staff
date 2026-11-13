"use client";

/**
 * One staff member for Operations: where they work now, the history of earlier
 * placements, and compliance flags (document STATUS only). NIN and banking are
 * shown to Operations directly through SensitiveValue, with a silent audit record
 * (project lead 2026-10-17; the server must enforce the role and record the view). The one main button is "Reassign". There are no HR-only
 * actions here (no warning, leave or document review). States: loading, not
 * found, error, restricted. Success only after the adapter confirms.
 */
import { SensitiveValue } from "@/components/admin/SensitiveValue";
import Link from "next/link";
import { useState } from "react";
import { BackHeader, BackLink, Banner, GROUP, MAIN_BTN, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Block, EmptyLine, Line, OPS_STAFF_HREF, opsClientHref, opsOutletHref, PageSkeleton, StaffStateChip } from "@/components/admin/ops/orgs/parts";
import { DocStateChip } from "@/components/admin/staff/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { Users } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsStaffMember } from "@/lib/admin/ops/staffassign-hooks";
import { formatDate } from "@/lib/applicant/time";
import { ReassignSheet, type ReassignDone } from "./ReassignSheet";
import { rangeText, RULES_NOTE, UnassignedChip } from "./parts";

export function StaffAssignmentDetail({ id }: { id: string }) {
  return (
    <OpsOnly what="This staff member" fallback={<PageSkeleton label="Loading staff member" />}>
      <Inner id={id} />
    </OpsOnly>
  );
}

function Inner({ id }: { id: string }) {
  const live = useOpsStaffMember(id);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const d = live.data;
  const top = (title: string) => (
    <>
      <BackHeader href={OPS_STAFF_HREF} label="Staff Assignments" title={title} />
      <BackLink href={OPS_STAFF_HREF} label="Staff Assignments" />
    </>
  );

  if (live.status === "error")
    return (
      <>
        {top("Staff member")}
        <ErrorPanel title="We could not load this person" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {top("Staff member")}
        <Restricted what="This staff member" />
      </>
    );
  if (live.status === "loading" && !d) return <PageSkeleton label="Loading staff member" />;
  if (!d)
    return (
      <>
        {top("Staff member")}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={Users} title="Staff member not found" description="This person does not exist." />
        </div>
      </>
    );

  const onDone = (r: ReassignDone) => {
    setSheet(false);
    const to = r.detail.current;
    setDone(r.previous ? `Saved. Moved from ${r.previous.client} to ${to?.client}, ${to?.outlet}. The earlier placement is in the history below.` : `Saved. Now at ${to?.client}, ${to?.outlet}.`);
  };
  const main = (
    <button type="button" onClick={() => setSheet(true)} className={MAIN_BTN}>
      Reassign
    </button>
  );
  const chips = (
    <span className="flex flex-wrap items-center gap-2">
      {d.current ? null : <UnassignedChip />}
      {d.status !== "active" ? <StaffStateChip status={d.status} /> : null}
    </span>
  );
  const docs = d.documents;
  const timeline = d.history;

  return (
    <div>
      {top(d.name)}
      <div className="max-[767px]:hidden">
        <PageHeading title={d.name} right={<div className="flex items-center gap-3">{chips}{main}</div>} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 min-[768px]:hidden">
        {main}
        {chips}
      </div>
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done}
        </Banner>
      ) : null}

      <div className="flex max-w-[760px] flex-col gap-6">
        <Block title="Current placement">
          {d.current ? (
            <dl className="m-0">
              <Line label="Client">
                <Link href={opsClientHref(d.current.clientId)} className="font-semibold text-(--ap-violet)">
                  {d.current.client}
                </Link>
              </Line>
              <Line label="Outlet">
                <Link href={opsOutletHref(d.current.clientId, d.current.outletId)} className="font-semibold text-(--ap-violet)">
                  {d.current.outlet}
                </Link>
              </Line>
              <Line label="Role">{d.current.role}</Line>
              <Line label="Since">{formatDate(d.current.start)}</Line>
              <Line label="Recorded by">{d.current.changedBy}</Line>
            </dl>
          ) : (
            <EmptyLine>Not placed yet. This person is approved and waiting for a client. Use Reassign to place them.</EmptyLine>
          )}
        </Block>

        <Block title={`History (${d.history.length})`} note="The same person stays on record. Every reassignment keeps the earlier placement here; nothing is overwritten or deleted.">
          {timeline.length === 0 ? (
            <EmptyLine>No earlier placements. This is the first one.</EmptyLine>
          ) : (
            <ol className="m-0 list-none p-0">
              {timeline.map((p) => (
                <li key={p.id} className={`px-4 py-3 ${ROW_LINE}`}>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-[15px] leading-tight font-semibold text-(--ap-ink)">
                      {p.client}, {p.outlet}
                    </span>
                    {p.current ? <StatusChip tone="plum">Current</StatusChip> : null}
                  </div>
                  <p className={`mt-0.5 ${MUTED_NOTE}`}>
                    {p.role} · {rangeText(p)}
                  </p>
                  <p className={MUTED_NOTE}>
                    Recorded by {p.changedBy}
                  </p>
                  {p.note ? <p className="mt-1 text-[13px] text-(--ap-ink-2)">&ldquo;{p.note}&rdquo;</p> : null}
                </li>
              ))}
            </ol>
          )}
        </Block>

        <Block title="Compliance" note="Document status only. NIN and bank details are hidden until revealed with a reason, which is recorded. Reviewing documents is done by HR.">
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 ${ROW_LINE}`}>
            <span className="text-[15px] font-semibold text-(--ap-ink)">
              {docs.verified} of {docs.total} documents verified
            </span>
            {docs.needAttention > 0 ? <StatusChip tone="warn">{docs.needAttention} need attention</StatusChip> : <StatusChip tone="ok">All in order</StatusChip>}
          </div>
          {docs.items.map((x) => (
            <div key={x.type} className={`flex min-h-12 items-center justify-between gap-3 px-4 py-2 ${ROW_LINE}`}>
              <span className="text-[14px] text-(--ap-ink-2)">{x.type}</span>
              <DocStateChip state={x.state} />
            </div>
          ))}
          <div className={`flex min-h-12 items-center justify-between gap-3 px-4 py-2 ${ROW_LINE}`}>
            <span className="text-[14px] text-(--ap-ink-2)">NIN</span>
            <SensitiveValue label="NIN" record={`NIN, ${d.name}`} subject={{ kind: "staff", inScope: true }} />
          </div>
          <div className={`flex min-h-12 items-center justify-between gap-3 px-4 py-2 ${ROW_LINE}`}>
            <span className="text-[14px] text-(--ap-ink-2)">Bank details</span>
            <SensitiveValue label="Bank account" record={`Bank account, ${d.name}`} subject={{ kind: "staff", inScope: true }} />
          </div>
        </Block>

        <p className={MUTED_NOTE}>{RULES_NOTE} Reference {d.reference}.</p>
      </div>
      {sheet ? <ReassignSheet staffId={d.id} onClose={() => setSheet(false)} onDone={onDone} /> : null}
    </div>
  );
}

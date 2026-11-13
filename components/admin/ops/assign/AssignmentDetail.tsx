"use client";

/**
 * One client's HR assignment: who looks after it, the one main button
 * (Assign HR / Reassign HR), what is open at the client, and the history of
 * assignments. Three plain containers, no nested cards. States: loading, not
 * found, error, restricted. Success is shown only after the adapter confirms.
 */
import Link from "next/link";
import { useState } from "react";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { UsersRound } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useAssignment } from "@/lib/admin/ops/assignments-hooks";
import { timeAgo } from "@/lib/client/format";
import { AssignSheet, type AssignDone } from "./AssignSheet";
import { BackHeader, BackLink, Banner, GROUP, GROUP_HEAD, MAIN_BTN, MUTED_NOTE, ROW_LINE } from "./kit";
import { ASSIGNMENTS_HREF, ClientStatusChip, clientRecordHref, HrAvatar, NoHrChip } from "./parts";

export function AssignmentDetail({ id }: { id: string }) {
  return (
    <OpsOnly what="Clients & HR" fallback={<Skeleton />}>
      <Inner id={id} />
    </OpsOnly>
  );
}

function Inner({ id }: { id: string }) {
  const live = useAssignment(id);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const d = live.data;
  const top = (title: string) => (
    <>
      <BackHeader href={ASSIGNMENTS_HREF} label="Clients & HR" title={title} />
      <BackLink href={ASSIGNMENTS_HREF} label="Clients & HR" />
    </>
  );

  if (live.status === "error")
    return (
      <>
        {top("Client")}
        <ErrorPanel title="We could not load this client" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {top("Client")}
        <Restricted what="This client" />
      </>
    );
  if (live.status === "loading" && !d) return <Skeleton />;
  if (!d)
    return (
      <>
        {top("Client")}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={UsersRound} title="Client not found" description="This client does not exist." />
        </div>
      </>
    );

  const onDone = (r: AssignDone) => {
    setSheet(false);
    setDone(r.reassigned ? `Saved. Moved from ${r.previousHr} to ${r.detail.hr?.name}.` : `Saved. ${r.detail.hr?.name} now looks after ${r.detail.name}.`);
  };

  return (
    <div>
      {top(d.name)}
      <div className="max-[767px]:hidden">
        <PageHeading title={d.name} right={<ClientStatusChip row={d} />} />
      </div>
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done}
        </Banner>
      ) : null}
      <div className="flex max-w-[760px] flex-col gap-6">
        <section aria-label="Assigned HR">
          <h2 className={GROUP_HEAD}>HR officer</h2>
          <div className={`${GROUP} flex flex-col gap-4 p-4 min-[768px]:flex-row min-[768px]:items-center`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <HrAvatar hr={d.hr} size={48} />
              <div className="min-w-0">
                {d.hr ? (
                  <>
                    <p className="text-[16px] leading-tight font-semibold text-(--ap-ink)">{d.hr.name}</p>
                    <p className={`mt-0.5 ${MUTED_NOTE}`}>{d.assignedAt ? `Since ${timeAgo(d.assignedAt)}` : ""}</p>
                  </>
                ) : (
                  <>
                    <NoHrChip />
                    <p className={`mt-1 ${MUTED_NOTE}`}>Requests from this client wait in the Operations queue until you assign someone.</p>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setSheet(true)} className={MAIN_BTN}>
              {d.hr ? "Reassign HR" : "Assign HR"}
            </button>
          </div>
        </section>

        <section aria-label="At this client">
          <h2 className={GROUP_HEAD}>At this client</h2>
          <dl className={`${GROUP} m-0`}>
            <div className={`flex min-h-14 items-center justify-between px-4 ${ROW_LINE}`}>
              <dt className="text-[14px] text-(--ap-ink-2)">Open vacancies</dt>
              <dd className="m-0 text-[15px] font-semibold tabular-nums">{d.openVacancies}</dd>
            </div>
            <div className={`flex min-h-14 items-center justify-between px-4 ${ROW_LINE}`}>
              <dt className="text-[14px] text-(--ap-ink-2)">Waiting requests</dt>
              <dd className="m-0 text-[15px] font-semibold tabular-nums">{d.pendingItems}</dd>
            </div>
            <div className={`flex min-h-14 items-center justify-between px-4 ${ROW_LINE}`}>
              <dt className="text-[14px] text-(--ap-ink-2)">Client record</dt>
              <dd className="m-0">
                <Link href={clientRecordHref(d.id)} className="text-[14px] font-semibold text-(--ap-violet)">
                  Open
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="Assignment history">
          <h2 className={GROUP_HEAD}>History</h2>
          {d.history.length === 0 ? (
            <p className={`${GROUP} px-4 py-4 text-[14px] text-(--ap-muted)`}>No assignments yet.</p>
          ) : (
            <ul className={`${GROUP} m-0 list-none p-0`}>
              {d.history.map((h) => (
                <li key={h.id} className={`px-4 py-3 ${ROW_LINE}`}>
                  <p className="text-[14.5px] leading-snug text-(--ap-ink)">{h.kind === "reassigned" ? `Moved from ${h.fromHr} to ${h.toHr}` : `Assigned to ${h.toHr}`}</p>
                  <p className={`mt-0.5 ${MUTED_NOTE}`}>
                    {h.actor} · {timeAgo(h.at)}
                  </p>
                  {h.note ? <p className="mt-1 text-[13px] text-(--ap-ink-2)">&ldquo;{h.note}&rdquo;</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {sheet ? <AssignSheet clientId={d.id} onClose={() => setSheet(false)} onDone={onDone} /> : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading client" className="flex max-w-[760px] flex-col gap-4 pt-4">
      <div className="ap-shimmer h-9 w-64 rounded-[14px]" />
      <div className="ap-shimmer h-24 rounded-[14px]" />
      <div className="ap-shimmer h-40 rounded-[14px]" />
    </div>
  );
}


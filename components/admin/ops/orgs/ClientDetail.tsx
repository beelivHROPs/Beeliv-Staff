"use client";

/**
 * Client 360 for Operations. Read-only oversight: overview facts, assigned HR
 * and its history, outlets, workforce (deployed staff per outlet, viewable here;
 * a person opens their own Operations staff page), open vacancies, client
 * requests, and client users with their invitation status. One main button,
 * "Assign HR" (the existing sheet), and a "More" menu. Invitations are sent by
 * HR, who also set the business details (project-lead decision); Operations only
 * sees the state. Desktop: a wide column plus a narrow side column. Phone: one
 * column in reading order (HR, facts, outlets, staff, vacancies, requests, users).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { AssignSheet, type AssignDone } from "@/components/admin/ops/assign/AssignSheet";
import { BackHeader, BackLink, Banner, GROUP, MAIN_BTN, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { ClientStatusChip, HrAvatar, NoHrChip } from "@/components/admin/ops/assign/parts";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight, Mail } from "@/components/applicant/icons";
import { ClientAdminMenu } from "@/components/admin/org-records/OrgActions";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { Store } from "@/components/client/icons";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsClient } from "@/lib/admin/ops/opsclients-hooks";
import { formatDate } from "@/lib/applicant/time";
import { plural, timeAgo } from "@/lib/client/format";
import { Block, EmptyLine, InviteChip, Line, OPS_CLIENTS_HREF, opsOutletHref, opsStaffOfClientHref, PageSkeleton, SiteStaffList } from "./parts";

const ASSIGNMENTS_HREF = "/admin/ops/assignments";

export function ClientDetail({ id }: { id: string }) {
  return (
    <OpsOnly what="This client" fallback={<PageSkeleton label="Loading client" />}>
      <Inner id={id} />
    </OpsOnly>
  );
}

function Inner({ id }: { id: string }) {
  const live = useOpsClient(id);
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const d = live.data;
  const top = (title: string) => (
    <>
      <BackHeader href={OPS_CLIENTS_HREF} label="Clients & Outlets" title={title} />
      <BackLink href={OPS_CLIENTS_HREF} label="Clients & Outlets" />
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
  if (live.status === "loading" && !d) return <PageSkeleton label="Loading client" />;
  if (!d)
    return (
      <>
        {top("Client")}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={Store} title="Client not found" description="This client does not exist." />
        </div>
      </>
    );

  const onDone = (r: AssignDone) => {
    setSheet(false);
    setDone(r.reassigned ? `Saved. Moved from ${r.previousHr} to ${r.detail.hr?.name}.` : `Saved. ${r.detail.hr?.name} now looks after ${r.detail.name}.`);
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2.5 max-[767px]:w-full">
      <div className="opsorg-more">
        <ActionsMenu
          items={[
            { label: "HR assignment history", onSelect: () => router.push(`${ASSIGNMENTS_HREF}/${d.id}`) },
            { label: "Staff at this client", onSelect: () => router.push(opsStaffOfClientHref(d.id)) },
            { label: "All clients and HR", onSelect: () => router.push(ASSIGNMENTS_HREF) },
          ]}
        />
      </div>
      <ClientAdminMenu client={{ id: d.id, name: d.name, status: d.statusKey, business: d.business }} />
      <button type="button" onClick={() => setSheet(true)} className={MAIN_BTN}>
        {d.hr ? "Reassign HR" : "Assign HR"}
      </button>
    </div>
  );
  const openRequests = d.requests;

  return (
    <div>
      {top(d.name)}
      <div className="max-[767px]:hidden">
        <PageHeading title={d.name} right={actions} />
      </div>
      <div className="mb-4 min-[768px]:hidden">{actions}</div>
      {done ? (
        <Banner tone="ok" onDismiss={() => setDone(null)}>
          {done}
        </Banner>
      ) : null}

      <div className="grid max-w-[1080px] grid-cols-1 items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px] min-[1100px]:grid-rows-[auto_1fr]">
        {/* A: HR + facts (desktop: top of the side column) */}
        <div className="flex flex-col gap-6 min-[1100px]:col-start-2 min-[1100px]:row-start-1">
          <Block
            title="HR officer"
            right={
              <Link href={`${ASSIGNMENTS_HREF}/${d.id}`} className="ap-hit text-[13px] font-semibold text-(--ap-violet)">
                Full history
              </Link>
            }
          >
            <div className={`flex items-center gap-3 px-4 py-3 ${ROW_LINE}`}>
              <HrAvatar hr={d.hr} size={44} />
              <div className="min-w-0">
                {d.hr ? (
                  <>
                    <p className="text-[16px] leading-tight font-semibold text-(--ap-ink)">{d.hr.name}</p>
                    <p className={`mt-0.5 ${MUTED_NOTE}`}>{d.assignedAt ? `Since ${timeAgo(d.assignedAt)}` : "Assigned"}</p>
                  </>
                ) : (
                  <>
                    <NoHrChip />
                    <p className={`mt-1 ${MUTED_NOTE}`}>Requests wait in the Operations queue until you assign someone.</p>
                  </>
                )}
              </div>
            </div>
            {d.hrHistory.slice(0, 3).map((h) => (
              <div key={h.id} className={`px-4 py-2.5 ${ROW_LINE}`}>
                <p className="text-[13.5px] leading-snug text-(--ap-ink-2)">{h.kind === "reassigned" ? `Moved from ${h.fromHr} to ${h.toHr}` : `Assigned to ${h.toHr}`}</p>
                <p className={MUTED_NOTE}>
                  {h.actor} · {timeAgo(h.at)}
                </p>
              </div>
            ))}
          </Block>

          <Block title="About this client">
            <dl className="m-0">
              <Line label="Status">
                <ClientStatusChip row={d} />
              </Line>
              <Line label="Type">{d.business.type}</Line>
              <Line label="City">{d.business.city}</Line>
              <Line label="Address">{d.business.address}</Line>
              <Line label="Client since">{formatDate(d.createdAt)}</Line>
              <Line label="Reference">{d.reference}</Line>
            </dl>
          </Block>
        </div>

        {/* B: the wide column */}
        <div className="flex min-w-0 flex-col gap-6 min-[1100px]:col-start-1 min-[1100px]:row-span-2 min-[1100px]:row-start-1">
          <Block title={`Outlets (${d.outlets.length})`}>
            {d.outlets.length === 0 ? (
              <EmptyLine>No outlets recorded yet. HR adds outlets when they set up the client.</EmptyLine>
            ) : (
              <ul className="m-0 list-none p-0">
                {d.outlets.map((o) => (
                  <li key={o.id} className={`ad-clickrow flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-(--ap-tint-soft) ${ROW_LINE}`}>
                    <div className="min-w-0 flex-1">
                      <Link href={opsOutletHref(d.id, o.id)} className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">
                        {o.name}
                      </Link>
                      <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">
                        {o.city} · {plural(o.deployedStaff, "staff", "staff")}
                        {o.openVacancies > 0 ? ` · ${o.openVacancies} open` : ""}
                      </span>
                    </div>
                    {o.statusLabel !== "Active" ? <StatusChip tone={o.statusTone}>{o.statusLabel}</StatusChip> : null}
                    <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <section aria-label="Workforce" className="min-w-0">
            <h2 className="mb-2 px-1 text-[12px] font-semibold tracking-[.08em] text-(--ap-muted) uppercase">Workforce ({d.workforce.length})</h2>
            {d.workforce.length === 0 ? (
              <div className={GROUP}>
                <EmptyLine>No staff deployed here yet.</EmptyLine>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {d.outlets
                  .filter((o) => d.workforce.some((s) => s.outletId === o.id))
                  .map((o) => {
                    const staff = d.workforce.filter((s) => s.outletId === o.id);
                    return (
                      <div key={o.id} className={GROUP}>
                        <p className="border-b border-(--ap-line-2) px-4 py-2 text-[12.5px] font-semibold text-(--ap-muted)">
                          {o.name} · {plural(staff.length, "person", "people")}
                        </p>
                        <SiteStaffList staff={staff} />
                      </div>
                    );
                  })}
              </div>
            )}
            <p className={`mt-2 px-1 ${MUTED_NOTE}`}>Open a person to see their placements and reassign them.</p>
          </section>

          <Block title={`Open vacancies (${d.openVacancies})`}>
            {d.vacancies.length === 0 ? (
              <EmptyLine>No open vacancies.</EmptyLine>
            ) : (
              <ul className="m-0 list-none p-0">
                {d.vacancies.map((v) => (
                  <li key={v.id} className={`flex min-h-14 items-center gap-3 px-4 py-2 ${ROW_LINE}`}>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{v.title}</span>
                      <span className="mt-0.5 block text-[13px] text-(--ap-muted)">{v.outlet}</span>
                    </div>
                    <span className="text-[14px] text-(--ap-ink-2) tabular-nums">{plural(v.openings, "opening")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title={`Requests (${d.requestsWaiting} waiting)`}>
            {openRequests.length === 0 ? (
              <EmptyLine>No open requests from this client.</EmptyLine>
            ) : (
              <ul className="m-0 list-none p-0">
                {openRequests.map((r) => (
                  <li key={r.id} className={`flex min-h-14 items-center gap-3 px-4 py-2 ${ROW_LINE}`}>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{r.title}</span>
                      <span className="mt-0.5 block text-[13px] text-(--ap-muted)">
                        {r.outlet ? `${r.outlet} · ` : ""}
                        {timeAgo(r.submittedAt)}
                      </span>
                    </div>
                    <StatusChip tone={r.waiting ? "warn" : "info"}>{r.statusLabel}</StatusChip>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        {/* C: client users, under the facts on desktop */}
        <div className="min-[1100px]:col-start-2 min-[1100px]:row-start-2">
          <Block title="Client users" note="HR sets the business details and sends the invitation; Operations can only see its status here.">
            {d.users.length === 0 ? (
              <EmptyLine>No client users yet.</EmptyLine>
            ) : (
              <ul className="m-0 list-none p-0">
                {d.users.map((u) => (
                  <li key={u.id} className={`flex min-h-14 flex-col gap-1 px-4 py-2.5 ${ROW_LINE}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{u.name}</span>
                        <span className="mt-0.5 block text-[13px] text-(--ap-muted)">{u.title}</span>
                      </div>
                      <InviteChip state={u.invite} />
                    </div>
                    <span className="flex items-center gap-1.5 text-[13px] break-all text-(--ap-ink-2)">
                      <Mail className="size-3.5 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                      {u.email}
                    </span>
                    {u.invitedAt ? (
                      <span className={MUTED_NOTE}>
                        Invited by {u.invitedBy} · {timeAgo(u.invitedAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
      {sheet ? <AssignSheet clientId={d.id} onClose={() => setSheet(false)} onDone={onDone} /> : null}
    </div>
  );
}


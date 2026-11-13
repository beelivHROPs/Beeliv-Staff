"use client";

/**
 * Client Request detail (HR). The full request as the client sent it, notes,
 * status, assigned HR user, linked vacancy and activity. Actions: Assign
 * (to me / another HR user), Acknowledge, Link or Create vacancy (links to the
 * Vacancies screens), Mark as fulfilled, Decline (reason required). Which
 * actions show comes from the adapter (`capabilities`); the backend re-checks
 * every action. What the client sees for each status is shown beside it.
 *
 * Reused: Section / Facts / ActivityList / Restricted (vacancies parts),
 * Client Review sheet + notice + skeleton pieces, RowMenu, EmptyState, ErrorPanel.
 */
import { useCan } from "@/lib/admin/role-access";
import Link from "next/link";
import { useState } from "react";
import { BackLink, DetailSkeleton, NoticeBanner, type Notice } from "@/components/admin/client-review/parts";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { ActivityList, Facts, Restricted, Section } from "@/components/admin/vacancies/parts";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Briefcase, CircleHelp } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useClientRequest } from "@/lib/admin/client-requests/hooks";
import { CLIENT_SEES } from "@/lib/admin/client-requests/types";
import { ACTION_LABEL, useRequestActions, type RequestAction } from "./actions";
import { clientText, createVacancyHref, LIST_HREF, RequestStatusChip, RequestStatusPill, sentText, vacancyHref, ymdText } from "./meta";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction } from "@/components/admin/PhoneDetail";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";

const BACK = (
  <div className="max-[767px]:hidden">
    <BackLink href={LIST_HREF} label="Client Requests" />
  </div>
);

export function ClientRequestDetailView({ id }: { id: string }) {
  const canCreateVacancy = useCan("vacancy.create");
  const live = useClientRequest(id);
  const [notice, setNotice] = useState<Notice | null>(null);
  const actions = useRequestActions({
    onDone: (d, text) => {
      live.setData(d);
      setNotice({ kind: "ok", text });
    },
    onError: (text) => setNotice({ kind: "error", text }),
  });

  if (live.status === "error") {
    return (
      <>
        {BACK}
        <ErrorPanel title="We could not load this request" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {BACK}
        <Restricted what="This request" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        {BACK}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <h1 className="sr-only">Request not found</h1>
          <EmptyState icon={CircleHelp} title="Request not found" description="This request does not exist or is outside your assigned clients and outlets." action={<Link href={LIST_HREF} className="ap-btn ap-btn-s ap-btn-sm">Back to Client Requests</Link>} />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) return <DetailSkeleton label="Client request" />;

  const cap = d.capabilities;
  const me = d.hrOptions.find((p) => p.isMe);
  const target = { id: d.id, label: `${d.role} request`, hrOptions: d.hrOptions, assignedId: d.assignedTo?.id ?? null };
  const secondary: RequestAction[] = [];
  if (cap.canAssign) secondary.push("assign");
  if (cap.canFulfil) secondary.push("fulfil");
  if (cap.canDecline) secondary.push("decline");

  // Phones: the first available main action is the ONE sticky button; the next two are the outline actions; the rest is in the cover's More menu.
  type Phone = { label: string; href?: string; onClick?: () => void };
  const phoneAll: Phone[] = [];
  if (cap.canAcknowledge) phoneAll.push({ label: "Acknowledge", onClick: () => actions.start(target, "acknowledge") });
  if (cap.canAssign && me && d.assignedTo?.id !== me.id) phoneAll.push({ label: "Assign to me", onClick: () => void actions.assign(target, me.id) });
  if (d.linkedVacancy) phoneAll.push({ label: "View vacancy", href: vacancyHref(d.linkedVacancy.id) });
  else if (cap.canAssign && canCreateVacancy) phoneAll.push({ label: "Create vacancy", href: createVacancyHref(d.id) });
  const phoneSticky = phoneAll[0] ?? null;
  const phoneOutline = phoneAll.slice(1, 3);

  return (
    <div>
      {BACK}
      {/* Phones: cover, one status, two actions, a short counted list, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref={LIST_HREF}
        backLabel="Client Requests"
        visual={{ kind: "icon", icon: <Briefcase aria-hidden="true" /> }}
        title={`${d.role} x ${d.headcount}`}
        status={<RequestStatusPill status={d.status} />}
        line={`${d.client}${d.outlet && d.outlet !== d.client ? `, ${d.outlet}` : ""} · ${d.department}`}
        actions={
          <>
            {phoneOutline.map((a) =>
              a.href ? <PhoneAction key={a.label} href={a.href} label={a.label} /> : <PhoneAction key={a.label} label={a.label} disabled={actions.busy} onClick={a.onClick} />,
            )}
          </>
        }
        menu={
          secondary.length > 0 ? (
            <ActionsMenu quiet alignEnd label="More actions" disabled={actions.busy} triggerClassName={COVER_ROUND} items={secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "decline" ? ("danger" as const) : ("default" as const), onSelect: () => actions.start(target, a) }))} />
          ) : null
        }
      />
      <PhoneFacts
        title="Request"
        rows={[
          { label: "Client", value: clientText(d) },
          { label: "Needed by", value: ymdText(d.neededBy) },
          { label: "Requested by", value: `${d.requestedBy.name}, ${d.requestedBy.role}` },
          { label: "Assigned HR", value: d.assignedTo?.name ?? "Unassigned" },
          { label: "Vacancy", value: d.linkedVacancy ? d.linkedVacancy.title : "Not linked" },
        ]}
      />
      {phoneSticky ? (
        <PhoneStickyAction>
          {phoneSticky.href ? (
            <Link href={phoneSticky.href} className={PD_CTA}>
              {phoneSticky.label}
            </Link>
          ) : (
            <button type="button" disabled={actions.busy} onClick={phoneSticky.onClick} className={PD_CTA}>
              {phoneSticky.label}
            </button>
          )}
        </PhoneStickyAction>
      ) : null}
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      <header className="ap-card mb-4 rounded-[20px] p-5 max-[767px]:hidden min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>
              {d.role} <span className="font-semibold text-(--ap-muted)">x {d.headcount}</span>
            </h1>
            <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{d.reference}</p>
            <p className="mt-2 text-[15px] leading-snug break-words">
              <b>{d.client}</b>
              {d.outlet && d.outlet !== d.client ? `, ${d.outlet}` : ""} · {d.department}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <RequestStatusChip status={d.status} />
              <span>HR: {d.assignedTo?.name ?? "Unassigned"}</span>
              <span>Needed by {ymdText(d.neededBy)}</span>
              {d.needsAttention ? (
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <AttentionBadge className="size-5" halo={false} /> Needs HR attention
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[480px] min-[1100px]:justify-end">
            {cap.canAcknowledge ? (
              <button type="button" disabled={actions.busy} onClick={() => actions.start(target, "acknowledge")} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                Acknowledge
              </button>
            ) : null}
            {cap.canAssign && me && d.assignedTo?.id !== me.id ? (
              <button type="button" disabled={actions.busy} onClick={() => void actions.assign(target, me.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                Assign to me
              </button>
            ) : null}
            {d.linkedVacancy ? (
              <Link href={vacancyHref(d.linkedVacancy.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                View vacancy
              </Link>
            ) : cap.canAssign && canCreateVacancy ? (
              <Link href={createVacancyHref(d.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                Create vacancy
              </Link>
            ) : null}
            {secondary.length > 0 ? <RowMenu label={`More actions for ${d.role} request`} items={secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "decline" ? ("danger" as const) : ("default" as const), onSelect: () => actions.start(target, a) }))} /> : null}
          </div>
        </div>
      </header>

      <PhoneMore title="More details">
      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Request">
            <div className="@container">
              <Facts
                items={[
                  { label: "Client / outlet", value: clientText(d) },
                  { label: "Role", value: d.role },
                  { label: "Department", value: d.department },
                  { label: "Number required", value: d.headcount },
                  { label: "Needed by", value: ymdText(d.neededBy) },
                  { label: "Reason", value: d.reason },
                  { label: "Requested by", value: `${d.requestedBy.name}, ${d.requestedBy.role}` },
                  { label: "Sent", value: sentText(d.submittedAt) },
                  { label: "Assigned HR", value: d.assignedTo?.name ?? "Unassigned" },
                ]}
              />
            </div>
            <div className="mt-4 border-t border-(--ap-line-2) pt-3">
              <h3 className="text-[12px] font-bold text-(--ap-muted)">Client&apos;s notes</h3>
              <p className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink-2)">{d.notes || "The client added no notes."}</p>
            </div>
            {d.closingNote ? (
              <div className="mt-4 border-t border-(--ap-line-2) pt-3">
                <h3 className="text-[12px] font-bold text-(--ap-muted)">{d.status === "declined" ? "Reason for declining" : "Fulfilment note"}</h3>
                <p className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink-2)">{d.closingNote}</p>
              </div>
            ) : null}
          </Section>

          <Section title="Linked vacancy">
            {d.linkedVacancy ? (
              <p className="text-[15px]">
                <Link href={vacancyHref(d.linkedVacancy.id)} className="font-bold text-(--ap-violet) hover:text-(--ap-plum)">
                  {d.linkedVacancy.title}
                </Link>
              </p>
            ) : (
              <p className="text-[14px] text-(--ap-muted)">No vacancy is linked yet. Create one from this request, or link an existing vacancy from the Vacancies screen.</p>
            )}
            {!d.linkedVacancy && cap.canAssign && canCreateVacancy ? (
              <Link href={createVacancyHref(d.id)} className="ap-btn ap-btn-s ap-btn-sm mt-3">
                Create vacancy from this request
              </Link>
            ) : null}
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="What the client sees">
            <p className="text-[15px] text-(--ap-ink-2)">
              <b>{CLIENT_SEES[d.status]}</b>
            </p>
            <p className="mt-1.5 text-[13px] text-(--ap-muted)">The Client app has one closed state, so Fulfilled and Declined both read Closed to the client. Whether a decline reason is shared needs Beeliv confirmation.</p>
          </Section>
          <Section title="Activity">
            <ActivityList items={d.activity.map((h) => ({ id: h.id, actor: h.actor, at: h.at, action: h.action, from: h.from, to: h.to, reason: h.note ?? undefined }))} />
          </Section>
        </div>
      </div>
      </PhoneMore>
      {actions.dialog}
    </div>
  );
}

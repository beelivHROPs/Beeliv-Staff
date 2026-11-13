"use client";

/**
 * Client page: Overview / Outlets / Staff / Vacancies / Requests / Contacts /
 * Compliance / Activity. Everything the Invite client wizard collected shows
 * here. Counts and "Staff" stay inside this page (nothing sends the user to the
 * Staff Directory list); a staff row opens that person's own profile, an outlet
 * row opens the outlet page. Unknown rules say "needs Beeliv confirmation".
 * Reuses: Disc, StatusChip, listKit rows (whole-row click), the Staff screens'
 * Card / Facts / DataTable / NeedsConfirmation, EmptyState, ClientPageSkeleton / Error.
 */
import { Can } from "@/components/admin/Can";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { ClientAdminMenu } from "@/components/admin/org-records/OrgActions";
import { Disc } from "@/components/admin/overview/Disc";
import { BODY_ROW, CARD_ITEM, CARD_LIST, HEAD_ROW, TABLE_CARD, TH } from "@/components/admin/listKit";
import { PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction } from "@/components/admin/PhoneDetail";
import { AdminState, Card, Facts, NeedsConfirmation, useUrlParams } from "@/components/admin/staff/parts";
import { Briefcase, Check, ChevronLeft, ChevronRight, Mail, Users } from "@/components/applicant/icons";
import { EmptyState, DETAIL_TITLE } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { Store } from "@/components/client/icons";
import { StatusChip } from "@/components/client/StatusChip";
import { formatDateTime } from "@/lib/admin/sort";
import { useClient } from "@/lib/admin/clients/hooks";
import type { ClientDetail } from "@/lib/admin/clients/types";
import { ActivityPanel, AssignedHrCard, OrgStaffPanel, PageTabs, VacanciesPanel } from "./OrgPanels";
import { CLIENTS_HREF, clientRequestsHref, clientVacanciesHref, createVacancyForHref, NoHrChip, OrgStatusChip, OrgStatusPill, outletHref } from "./parts";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "outlets", label: "Outlets" },
  { key: "staff", label: "Staff" },
  { key: "vacancies", label: "Vacancies" },
  { key: "requests", label: "Requests" },
  { key: "contacts", label: "Contacts" },
  { key: "compliance", label: "Compliance" },
  { key: "activity", label: "Activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ClientDetailView({ id }: { id: string }) {
  const live = useClient(id);
  const url = useUrlParams();
  const tabId = useId();
  const raw = url.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "overview";
  const setTab = (k: TabKey) => url.set({ tab: k === "overview" ? undefined : k });

  return (
    <AdminState status={live.status === "empty" ? "ready" : live.status} title="Client" what="this client" retry={live.retry}>
      <Link href={CLIENTS_HREF} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
        <ChevronLeft className="size-4" aria-hidden="true" /> Clients
      </Link>
      {live.status === "empty" || !live.data ? (
        <div className={`${CARD} p-6 min-[768px]:p-8`}>
          <EmptyState icon={Store} title="Client not found" description="This client does not exist or is not assigned to you." />
        </div>
      ) : (
        <Body c={live.data} tab={tab} tabId={tabId} setTab={setTab} />
      )}
    </AdminState>
  );
}

function Body({ c, tab, tabId, setTab }: { c: ClientDetail; tab: TabKey; tabId: string; setTab: (k: TabKey) => void }) {
  const router = useRouter();
  const panel = {
    overview: <Overview c={c} go={setTab} />,
    outlets: <Outlets c={c} />,
    staff: <OrgStaffPanel staff={c.staff} outlets={c.outlets.map((o) => ({ id: o.id, name: o.name }))} />,
    vacancies: <VacanciesPanel clientId={c.id} />,
    requests: <Requests c={c} />,
    contacts: <Contacts c={c} />,
    compliance: <Compliance c={c} />,
    activity: <ActivityPanel activity={c.activity} />,
  }[tab];
  return (
    <div>
      {/* Phones: cover, one status, Requests / Vacancies, a short counted list, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref={CLIENTS_HREF}
        backLabel="Clients"
        visual={{ kind: "icon", icon: <Store aria-hidden="true" /> }}
        title={c.name}
        status={<OrgStatusPill status={c.status} />}
        line={`${c.business.type} · ${c.business.city}`}
        actions={
          <>
            <PhoneAction href={clientRequestsHref(c.id)} label="Requests" />
            <PhoneAction href={clientVacanciesHref(c.id)} label="Vacancies" />
          </>
        }
      />
      <PhoneFacts
        title="Client"
        rows={[
          { label: "Outlets", value: String(c.outletsCount) },
          { label: "Active staff", value: String(c.activeStaff) },
          { label: "Open vacancies", value: String(c.openVacancies) },
          { label: "Assigned HR", value: c.assignedHr.primary?.name ?? "Not assigned" },
          { label: "Address", value: c.business.address },
        ]}
      />
      <Can cap="vacancy.create">
        <PhoneStickyAction>
          <Link href={createVacancyForHref(c.id)} className={PD_CTA}>
            Create vacancy
          </Link>
        </PhoneStickyAction>
      </Can>
      <header className={`${CARD} mb-4 max-[767px]:hidden`}>
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Disc icon={Store} className="size-14" />
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{c.name}</h1>
            <p className="mt-1 text-[13px] break-all text-(--ap-muted)">
              {c.reference} · {c.business.type} · {c.business.city}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <OrgStatusChip status={c.status} />
              {!c.assignedHr.primary ? <NoHrChip /> : null}
              <span>{c.outletsCount} {c.outletsCount === 1 ? "outlet" : "outlets"}</span>
              <span>{c.activeStaff} active staff</span>
              <span>{c.openVacancies} open {c.openVacancies === 1 ? "vacancy" : "vacancies"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 min-[1100px]:justify-end">
          <span data-admin-detail="" hidden />
          <Can cap="vacancy.create">
            <Link href={createVacancyForHref(c.id)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
              Create vacancy
            </Link>
          </Can>
          <ActionsMenu
            items={[
              { label: "View requests", onSelect: () => router.push(clientRequestsHref(c.id)) },
              { label: "View open vacancies", onSelect: () => router.push(clientVacanciesHref(c.id)) },
            ]}
          />
          <ClientAdminMenu client={c} />
        </div>
        </div>
      </header>
      <PhoneMore title="More details">
        <PageTabs label="Client sections" tabs={[...TABS]} value={tab} onChange={setTab} idBase={tabId} />
        <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
          {panel}
        </div>
      </PhoneMore>
    </div>
  );
}

function Overview({ c, go }: { c: ClientDetail; go: (k: TabKey) => void }) {
  const done = c.onboarding?.filter((s) => s.done).length ?? 0;
  const tiles: { icon: typeof Store; label: string; value: number; tab: TabKey }[] = [
    { icon: Store, label: "Outlets", value: c.outletsCount, tab: "outlets" },
    { icon: Users, label: "Active staff", value: c.activeStaff, tab: "staff" },
    { icon: Briefcase, label: "Open vacancies", value: c.openVacancies, tab: "vacancies" },
  ];
  return (
    <div className="@container flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 @min-[560px]:grid-cols-3">
        {tiles.map((t) => {
          const cls = "ap-card ap-card-hover flex items-center gap-3 rounded-[20px] p-4 text-left";
          const inner = (
            <>
              <Disc icon={t.icon} />
              <span>
                <b className="block text-[17px] tabular-nums">{t.value}</b>
                <span className="text-[13px] text-(--ap-muted)">{t.label}</span>
              </span>
            </>
          );
          // Open vacancies leads to the real open list for this client.
          return t.tab === "vacancies" ? (
            <Link key={t.label} href={clientVacanciesHref(c.id)} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={t.label} type="button" onClick={() => go(t.tab)} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
      <Card title="Business details">
        <Facts
          items={[
            { label: "Name", value: c.name },
            { label: "Type", value: c.business.type },
            { label: "City", value: c.business.city },
            { label: "Address", value: c.business.address },
            { label: "Status", value: <OrgStatusChip status={c.status} /> },
            { label: "Reference", value: c.reference },
            { label: "Created by", value: c.createdBy },
            { label: "Created", value: formatDateTime(c.createdAt) },
          ]}
        />
      </Card>
      {c.onboarding ? (
        <Card title="Onboarding" right={<span className="text-[13px] text-(--ap-muted)">{done} of {c.onboarding.length} done</span>}>
          <ul className="flex flex-col gap-2">
            {c.onboarding.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 text-[14px]">
                <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${s.done ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) text-transparent"}`}>
                  <Check className="size-3" />
                </span>
                <span className={s.done ? "text-(--ap-ink)" : "text-(--ap-muted)"}>{s.label}</span>
                <span className="sr-only">{s.done ? "(done)" : "(not yet)"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-(--ap-muted)">The list of onboarding steps needs Beeliv confirmation.</p>
        </Card>
      ) : null}
      <Card title="Agreements acknowledged">
        {c.agreements.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">None yet. They show here once the contact acknowledges them.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.agreements.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                <b>{a.name}</b>
                <span className="text-(--ap-muted)">{a.version}</span>
                {a.acknowledgedAt ? <span className="text-(--ap-muted)">acknowledged {formatDateTime(a.acknowledgedAt)}</span> : <StatusChip tone="warn">Not yet</StatusChip>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <NeedsConfirmation>Which agreements apply, and what HR may see of them, needs Beeliv confirmation.</NeedsConfirmation>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 @min-[760px]:grid-cols-2">
        <AssignedHrCard hrUsers={c.hrUsers} history={c.hrHistory} what="client" />
        <Card title="Who can sign in">
          <p className="text-[14px] leading-snug text-(--ap-ink-2)">{c.accessSummary}</p>
        </Card>
      </div>
    </div>
  );
}

function Outlets({ c }: { c: ClientDetail }) {
  if (c.outlets.length === 0)
    return (
      <Card title="Outlets">
        <EmptyState icon={Store} title="No outlets yet" description="Outlets appear here once they are set up for this client." />
      </Card>
    );
  const COLS = "grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_24px]";
  const staffText = (n: number, v: number) => `${n} active staff · ${v} open ${v === 1 ? "vacancy" : "vacancies"}`;
  return (
    <Card title="Outlets">
      <div className="@container">
        <div role="table" aria-label="Outlets" className={`${TABLE_CARD} hidden @min-[860px]:block`}>
          <div role="row" className={`grid ${COLS} items-end gap-x-4 ${HEAD_ROW} ${TH}`}>
            <span role="columnheader">Outlet</span>
            <span role="columnheader">Address / city</span>
            <span role="columnheader">Staff and vacancies</span>
            <span role="columnheader">Status / HR</span>
            <span role="columnheader" className="sr-only">Open</span>
          </div>
          {c.outlets.map((o) => (
            <div key={o.id} role="row" className={`grid ${COLS} items-center gap-x-4 ${BODY_ROW} min-h-[64px]`}>
              <div role="cell" className="min-w-0 leading-tight">
                <Link href={outletHref(c.id, o.id)} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                  {o.name}
                </Link>
                <span className="mt-0.5 block truncate text-[12px] text-(--ap-faint)">{o.reference}</span>
              </div>
              <div role="cell" className="min-w-0 leading-tight text-[14px]">
                <span className="block truncate" title={o.address}>{o.address}</span>
                <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{o.city}</span>
              </div>
              <div role="cell" className="min-w-0 text-[14px] leading-tight">
                <Link href={outletHref(c.id, o.id, "staff")} className="block truncate font-bold text-(--ap-violet) tabular-nums">
                  {o.activeStaff} active staff
                </Link>
                <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">{o.openVacancies} open {o.openVacancies === 1 ? "vacancy" : "vacancies"}</span>
              </div>
              <div role="cell" className="min-w-0">
                <OrgStatusChip status={o.status} />
                {o.assignedHr.primary ? (
                  <span className="mt-1 block truncate text-[12px] text-(--ap-muted)">
                    HR: {o.assignedHr.primary.name}
                    {o.assignedHr.additional ? ` +${o.assignedHr.additional}` : ""}
                  </span>
                ) : (
                  <span className="mt-1 block">
                    <NoHrChip />
                  </span>
                )}
              </div>
              <span role="cell" className="text-(--ap-faint)">
                <ChevronRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          ))}
        </div>
        <ul className={`${CARD_LIST} @min-[860px]:hidden`}>
          {c.outlets.map((o) => (
            <li key={o.id} className={CARD_ITEM}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 leading-tight">
                  <Link href={outletHref(c.id, o.id)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                    {o.name}
                  </Link>
                  <span className="block truncate text-[13px] text-(--ap-muted)">{o.address}, {o.city}</span>
                </div>
                <OrgStatusChip status={o.status} />
              </div>
              <p className="mt-2 truncate text-[13px] text-(--ap-muted) tabular-nums">{staffText(o.activeStaff, o.openVacancies)}</p>
              <p className="mt-0.5 truncate text-[12px] text-(--ap-muted)">
                HR: {o.assignedHr.primary?.name ?? "Unassigned"}
                {o.assignedHr.additional ? ` +${o.assignedHr.additional}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Requests({ c }: { c: ClientDetail }) {
  return (
    <Card title="Requests">
      <p className="mb-4 text-[14px] leading-snug text-(--ap-ink-2)">Staffing requests this client has sent to Beeliv are handled in Client Requests, filtered to {c.name}.</p>
      <Link href={clientRequestsHref(c.id)} className="ap-btn ap-btn-p h-11 px-5 text-[15px] font-semibold text-white!">
        Open requests for this client
      </Link>
    </Card>
  );
}

function Contacts({ c }: { c: ClientDetail }) {
  return (
    <Card title="Contacts">
      <div className="mb-4">
        <NeedsConfirmation>Which contact details HR may see needs Beeliv confirmation. Phone numbers show only when they are shared with your account.</NeedsConfirmation>
      </div>
      <Facts
        items={c.contacts.map((k) => ({
          label: k.title,
          value: (
            <span className="block">
              <b>{k.name}</b>
              <span className="mt-0.5 flex items-center gap-1.5 break-all text-(--ap-muted)">
                <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {k.email}
              </span>
              <span className="text-(--ap-muted)">{k.phone ?? "Phone not recorded"}</span>
            </span>
          ),
        }))}
      />
    </Card>
  );
}

function Compliance({ c }: { c: ClientDetail }) {
  const k = c.compliance;
  return (
    <Card title="Compliance">
      {k ? (
        <Facts items={[{ label: "Staff documents verified", value: `${k.verified} of ${k.total}` }, { label: "Documents needing attention", value: String(k.needAttention) }]} />
      ) : (
        <p className="text-[14px] text-(--ap-muted)">Later. There is nothing to summarise until staff are assigned to this client.</p>
      )}
      <div className="mt-4">
        <NeedsConfirmation>A full compliance view (what is checked, and how often) comes later and needs Beeliv confirmation. This only counts staff documents on file.</NeedsConfirmation>
      </div>
    </Card>
  );
}

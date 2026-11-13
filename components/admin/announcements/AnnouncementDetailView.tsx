"use client";

/**
 * Announcement detail (HR). Header with the allowed actions, and tabs:
 * Overview, Read receipts (per person: read / acknowledged), Activity and
 * "How staff see it" (the Staff Home announcements card, reused as is).
 * What actions show comes from the adapter (`allowedActions`); the backend
 * re-checks every action.
 *
 * Reused: DETAIL_TITLE / EmptyState (applicant), FilterDropdown + FilterTabs,
 * ErrorPanel (staff), Disc + RowMenu + Initials (admin overview), ShowMore,
 * Section / Facts / Restricted (Vacancies parts), CompletionBar, AnnouncementsCard
 * (Staff Home).
 */
import Link from "next/link";
import { useId, useState } from "react";
import { FilterDropdown, FilterTabs } from "@/components/applicant/FilterTabs";
import { Check, ChevronLeft, Exclaim, Eye, Pencil, X } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Megaphone } from "@/components/staff/icons";
import { AnnouncementsCard } from "@/components/staff/home/HomeSections";
import { useUrlParams } from "@/components/admin/applicants/url";
import { Disc } from "@/components/admin/overview/Disc";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { Initials } from "@/components/admin/overview/Sections";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { CompletionBar } from "@/components/admin/sops-training/parts";
import { useAnnouncement } from "@/lib/admin/announcements/hooks";
import type { AnnouncementAction, AnnouncementDetail, Receipt, ReceiptStatus } from "@/lib/admin/announcements/types";
import { useAnnouncementActions } from "./actions";
import { actionLabel, ANN_BASE, announcementEditHref, formatIso, formatIsoTime, formatYmd, staffHref } from "./meta";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction } from "@/components/admin/PhoneDetail";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { ActivityTimeline, AnnouncementStatusChip, AnnouncementStatusPill, Facts, ReceiptChip, Restricted, Section } from "./parts";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "receipts", label: "Read receipts" },
  { key: "activity", label: "Activity" },
  { key: "preview", label: "How staff see it" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SAVED_TEXT: Record<string, string> = {
  draft: "Saved as a draft.",
  updated: "Your changes were saved.",
  published: "The announcement was published or scheduled.",
};
const PRIMARY: AnnouncementAction[] = ["publish"];

export function AnnouncementDetailView({ id }: { id: string }) {
  const live = useAnnouncement(id);
  const url = useUrlParams();
  const tabId = useId();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(() => {
    const t = SAVED_TEXT[url.get("saved")];
    return t ? { kind: "ok", text: t } : null;
  });
  const actions = useAnnouncementActions({
    onDone: (d, text) => {
      live.setData(d);
      setNotice({ kind: "ok", text });
    },
    onError: (text) => setNotice({ kind: "error", text }),
  });

  if (live.status === "error") {
    return (
      <>
        <Back />
        <ErrorPanel title="We could not load this announcement" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <Back />
        <Restricted what="This announcement" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Megaphone} title="We can't find that announcement" description="It may not exist, or it is outside your scope. Go back to the list." />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) return <DetailSkeleton />;

  const rawTab = url.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "overview";
  const setTab = (k: TabKey) => url.set({ tab: k === "overview" ? undefined : k, saved: undefined });
  const primary = d.allowedActions.filter((a) => PRIMARY.includes(a));
  const secondary = d.allowedActions.filter((a) => !PRIMARY.includes(a));

  // Phones: the publish action is the ONE sticky button; every other allowed action is in the cover's More menu.
  const phonePrimary = primary[0] ?? null;
  const phoneMenu = d.allowedActions.filter((a) => a !== phonePrimary);

  const panel = {
    overview: <OverviewPanel d={d} />,
    receipts: <ReceiptsPanel d={d} />,
    activity: (
      <Section title="Activity">
        <ActivityTimeline items={d.activity} />
      </Section>
    ),
    preview: <PreviewPanel d={d} />,
  }[tab];

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, Edit, a short counted list, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref={ANN_BASE}
        backLabel="Announcements"
        visual={{ kind: "icon", icon: <Megaphone aria-hidden="true" /> }}
        title={d.title}
        status={<AnnouncementStatusPill status={d.status} />}
        line={`Audience: ${d.audienceLabel}`}
        actions={d.canEdit ? <PhoneAction href={announcementEditHref(d.id)} label="Edit" icon={<Pencil className="size-4" aria-hidden="true" />} /> : null}
        menu={
          phoneMenu.length > 0 ? (
            <ActionsMenu quiet alignEnd label="More actions" disabled={actions.busy} triggerClassName={COVER_ROUND} items={phoneMenu.map((a) => ({ label: actionLabel(a, d.status), tone: a === "end" ? ("default" as const) : ("danger" as const), onSelect: () => void actions.start(d, a) }))} />
          ) : null
        }
      />
      <PhoneFacts
        title="Announcement"
        rows={[
          { label: "Goes live", value: d.publishAt ? formatIsoTime(d.publishAt) : "Not published yet" },
          { label: "Expires", value: d.expiresOn ? formatYmd(d.expiresOn) : "No expiry" },
          { label: "Pinned", value: d.pinned ? "Yes" : "No" },
          { label: "Acknowledgement", value: d.requiresAcknowledgement ? "Requested" : "Not requested" },
        ]}
      />
      {phonePrimary ? (
        <PhoneStickyAction>
          <button type="button" disabled={actions.busy} onClick={() => void actions.start(d, phonePrimary)} className={PD_CTA}>
            {actionLabel(phonePrimary, d.status)}
          </button>
        </PhoneStickyAction>
      ) : null}
      <header className="ap-card mb-4 rounded-[20px] p-5 max-[767px]:hidden min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <AnnouncementStatusChip status={d.status} />
              <span>Audience: {d.audienceLabel}</span>
              {d.pinned ? <span className="ap-chip ap-chip-violet">Pinned</span> : null}
            </div>
            {d.status === "scheduled" && d.publishAt ? <p className="mt-3 text-[14px] text-(--ap-muted)">Goes live {formatIsoTime(d.publishAt)}. Staff cannot see it yet.</p> : null}
            {d.status === "draft" ? <p className="mt-3 text-[14px] text-(--ap-muted)">Staff cannot see this yet.</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[460px] min-[1100px]:justify-end">
            {d.canEdit ? (
              <Link href={announcementEditHref(d.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                <Pencil className="size-4" aria-hidden="true" /> Edit
              </Link>
            ) : null}
            {primary.map((a) => (
              <button key={a} type="button" disabled={actions.busy} onClick={() => void actions.start(d, a)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                {actionLabel(a, d.status)}
              </button>
            ))}
            {secondary.length > 0 ? <RowMenu label={`More actions for ${d.title}`} items={secondary.map((a) => ({ label: actionLabel(a, d.status), tone: a === "end" ? ("default" as const) : ("danger" as const), onSelect: () => void actions.start(d, a) }))} /> : null}
          </div>
        </div>
      </header>

      {notice ? (
        <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
          <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <PhoneMore title="Message and more">
      <div className="@container">
        <div className="mb-4">
          <div role="tablist" aria-label="Sections" className="hidden flex-wrap gap-1 rounded-xl border border-(--ap-line) bg-white/70 p-1 min-[768px]:flex">
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`${tabId}-${t.key}`}
                  aria-selected={on}
                  aria-controls={`${tabId}-panel`}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex h-10 items-center rounded-[9px] px-3.5 text-[14px] font-bold whitespace-nowrap transition-colors ${on ? "bg-(--ap-violet) text-white" : "text-(--ap-muted) hover:bg-(--ap-tint) hover:text-(--ap-ink)"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="min-[768px]:hidden">
            <FilterDropdown label="Section" prefix="Section" options={TABS.map((t) => ({ key: t.key, label: t.label }))} current={TABS.find((t) => t.key === tab) ?? TABS[0]} onChange={setTab} />
          </div>
        </div>
        <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} className="flex flex-col gap-4">
          {panel}
        </div>
      </div>
      </PhoneMore>
    </div>
  );
}

function Back() {
  return (
    <Link href={ANN_BASE} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Announcements
    </Link>
  );
}

function OverviewPanel({ d }: { d: AnnouncementDetail }) {
  return (
    <>
      <Section title="Message">
        <p className="max-w-[70ch] text-[15px] leading-relaxed break-words whitespace-pre-line text-(--ap-ink-2)">{d.body}</p>
      </Section>
      <Section title="Details">
        <Facts
          items={[
            { label: "Audience", value: d.audienceLabel },
            { label: "Channel", value: "In-app. Email needs Beeliv confirmation and is not sent in the demo." },
            { label: "Goes live", value: d.publishAt ? formatIsoTime(d.publishAt) : "Not published yet" },
            { label: "Expires", value: d.expiresOn ? formatYmd(d.expiresOn) : "No expiry" },
            { label: "Pinned", value: d.pinned ? "Yes" : "No" },
            { label: "Acknowledgement", value: d.requiresAcknowledgement ? "Requested" : "Not requested" },
            { label: "Also for applicants", value: d.includeApplicants ? "Yes (needs Beeliv confirmation)" : "No" },
            { label: "Last updated", value: formatIso(d.updatedAt) },
          ]}
        />
      </Section>
    </>
  );
}

const STATUS_FILTERS: ReceiptStatus[] = ["unread", "read", "acknowledged"];
const RLABEL: Record<ReceiptStatus, string> = { unread: "Not read yet", read: "Read", acknowledged: "Acknowledged" };

function ReceiptsPanel({ d }: { d: AnnouncementDetail }) {
  const [filter, setFilter] = useState<"all" | ReceiptStatus>("all");
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  if (d.receipts.length === 0) {
    return (
      <Section title="Read receipts">
        <EmptyState icon={Eye} title="No read receipts yet" description={d.status === "published" || d.status === "expired" ? "No staff match the audience." : "Read receipts appear once the announcement is live."} />
      </Section>
    );
  }
  const count = (s: ReceiptStatus) => d.receipts.filter((r) => r.status === s).length;
  const rows = d.receipts.filter((r) => filter === "all" || r.status === filter);
  const filters = d.requiresAcknowledgement ? STATUS_FILTERS : STATUS_FILTERS.filter((s) => s !== "acknowledged");
  const total = d.counts.recipients;
  const tiles: [string, string | number][] = [["Recipients", total], ["Read", d.counts.read], ["Acknowledged", d.requiresAcknowledgement ? d.counts.acknowledged : "n/a"]];
  return (
    <Section title="Read receipts">
      <dl className="mb-4 grid grid-cols-3 gap-3">
        {tiles.map(([label, n]) => (
          <div key={label} className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-3">
            <dd className="text-[26px] leading-none font-bold tabular-nums">{n}</dd>
            <dt className="mt-1 text-[12px] text-(--ap-muted)">{label}</dt>
          </div>
        ))}
      </dl>
      <CompletionBar done={d.counts.read} total={total} label="Read" />
      <FilterTabs
        label="Filter people by status"
        className="mt-4 mb-3"
        options={[{ key: "all" as const, label: "All", count: d.receipts.length }, ...filters.map((s) => ({ key: s, label: RLABEL[s], count: count(s) }))]}
        value={filter}
        onChange={(k) => {
          setFilter(k);
          setLimit(SHOW_MORE_STEP);
        }}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Eye} title="No one in this status" description="Pick another status to see the rest." />
      ) : (
        <div className="@container">
          <ReceiptTable rows={rows.slice(0, limit)} />
          <ReceiptCards rows={rows.slice(0, limit)} />
          <ShowMore shown={limit} total={rows.length} onMore={() => setLimit((l) => l + SHOW_MORE_STEP)} />
        </div>
      )}
    </Section>
  );
}

const RCOLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]";
const HEAD = "text-[12px] font-bold text-(--ap-muted)";
const at = (iso: string | null) => (iso ? formatIsoTime(iso) : "Not yet");

function ReceiptTable({ rows }: { rows: Receipt[] }) {
  return (
    <div role="table" aria-label="Read receipts" className="hidden overflow-hidden rounded-xl border border-(--ap-line) @min-[760px]:block">
      <div role="row" className={`grid ${RCOLS} gap-x-3 border-b border-(--ap-line) bg-(--ap-tint-soft) px-4 py-2.5`}>
        {["Person", "Role", "Client and outlet", "Status", "Read", "Acknowledged"].map((h) => (
          <span key={h} role="columnheader" className={HEAD}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} role="row" className={`grid ${RCOLS} items-center gap-x-3 border-b border-(--ap-line-2) px-4 py-2.5 last:border-b-0 hover:bg-(--ap-tint-soft)`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={r.name} size="size-9" />
            <Link href={staffHref(r.staffId)} className="min-w-0 truncate text-[14px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
              {r.name}
            </Link>
          </div>
          <span role="cell" className="text-[14px] text-(--ap-ink-2)">{r.role}</span>
          <span role="cell" className="min-w-0 text-[13px] leading-snug break-words text-(--ap-ink-2)">{r.placement}</span>
          <div role="cell"><ReceiptChip status={r.status} /></div>
          <span role="cell" className="text-[13px] text-(--ap-ink-2)">{at(r.readAt)}</span>
          <span role="cell" className="text-[13px] text-(--ap-ink-2)">{at(r.acknowledgedAt)}</span>
        </div>
      ))}
    </div>
  );
}

function ReceiptCards({ rows }: { rows: Receipt[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 @min-[760px]:hidden">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-(--ap-line) p-3.5">
          <div className="flex items-center gap-2.5">
            <Initials name={r.name} size="size-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={staffHref(r.staffId)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {r.name}
              </Link>
              <span className="block truncate text-[12px] text-(--ap-muted)">
                {r.role} · {r.placement}
              </span>
            </div>
            <ReceiptChip status={r.status} />
          </div>
          <p className="mt-2 text-[13px] text-(--ap-ink-2)">
            Read: {at(r.readAt)}
            {r.acknowledgedAt ? ` · Acknowledged: ${at(r.acknowledgedAt)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function PreviewPanel({ d }: { d: AnnouncementDetail }) {
  const item = { id: d.id, title: d.title, body: d.body, source: "beeliv" as const, publishedAt: d.publishAt ?? new Date().toISOString(), imageUrl: null };
  return (
    <>
      <div className="ap-card flex items-start gap-3 rounded-2xl p-4" role="note">
        <Eye className="mt-0.5 size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
        <p className="min-w-0 text-[14px] leading-snug text-(--ap-ink-2)">
          <b>Preview.</b> This is the Company Announcements card on the Staff Home screen. Staff see the first two lines. {d.status === "published" ? "" : "Staff cannot see it until it is published. "}
          The Staff app has no full announcement page, pinning or acknowledge button yet (Staff-app follow-up), so those are shown below instead.
        </p>
      </div>
      <div className="max-w-[560px]">
        <AnnouncementsCard items={[item]} className="" />
      </div>
      <Section title="Full text">
        <p className="max-w-[70ch] text-[15px] leading-relaxed break-words whitespace-pre-line text-(--ap-ink-2)">{d.body}</p>
        <p className="mt-3 text-[13px] text-(--ap-muted)">
          {d.pinned ? "Pinned: it stays at the top while it is live. " : ""}
          {d.requiresAcknowledgement ? "Staff are asked to acknowledge it. " : ""}
          {d.expiresOn ? `It stops showing on ${formatYmd(d.expiresOn)}.` : "It has no expiry date."}
        </p>
      </Section>
    </>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className={`${sk} mb-3 h-5 w-40`} />
      <div className={`${sk} mb-4 h-[130px]`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className={`${sk} h-[220px]`} />
    </div>
  );
}

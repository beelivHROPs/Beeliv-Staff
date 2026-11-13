"use client";

/**
 * SOP / training / agreement detail (HR). Header (title, status, version,
 * allowed actions) and tabs: Overview, Tracking (who is assigned and where they
 * are, with a staff drill-down), Versions, Activity, and "How staff see this"
 * (the Staff app's presentation, preview only). Which actions show comes from
 * the adapter (`allowedActions`, `canEdit`); hiding a button is presentation
 * only, the backend re-checks every action.
 *
 * Reused: DETAIL_TITLE / EmptyState / Chip (applicant), FilterDropdown +
 * FilterTabs, ErrorPanel (staff), Disc + RowMenu + Initials (admin overview),
 * ShowMore, Section / Facts / Restricted (Vacancies parts), StatusChip.
 */
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { FilterDropdown, FilterTabs } from "@/components/applicant/FilterTabs";
import { Check, ChevronLeft, Exclaim, FileText, Pencil, Video, X } from "@/components/applicant/icons";
import { Chip, DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { BoldTile } from "@/components/shared/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { BookOpen } from "@/components/staff/icons";
import { useUrlParams } from "@/components/admin/applicants/url";
import { Disc } from "@/components/admin/overview/Disc";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { Initials } from "@/components/admin/overview/Sections";
import { SHOW_MORE_STEP, ShowMore } from "@/components/admin/ShowMore";
import { useContent, useContentConfig } from "@/lib/admin/sops-training/hooks";
import type { Assignee, ContentAction, ContentDetail, TrackStatus } from "@/lib/admin/sops-training/types";
import { useContentActions } from "./actions";
import { ACTION_LABEL, contentEditHref, DONE_LABEL, formatIso, formatSize, formatYmd, KIND_ONE, KIND_TAB_LABEL, listHref, REQUIRED_LABEL, staffHref, TRACK_FILTERS, TRACK_LABEL } from "./meta";
import { ActivityTimeline, CompletionBar, ContentStatusChip, Facts, Restricted, Section, TrackChip } from "./parts";
import { StaffContentPreview } from "./StaffContentPreview";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "tracking", label: "Tracking" },
  { key: "versions", label: "Versions" },
  { key: "activity", label: "Activity" },
  { key: "preview", label: "How staff see this" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SAVED_TEXT: Record<string, string> = {
  draft: "Saved as a draft.",
  updated: "Your changes were saved.",
  version: "Saved as a new draft version. Staff keep seeing the published version until you publish this one.",
  published: "Published. Staff in the audience can now open it.",
  created: "Saved as a draft.",
};

const PRIMARY: ContentAction[] = ["publish", "restore"];

export function ContentDetailView({ id }: { id: string }) {
  const live = useContent(id);
  const url = useUrlParams();
  const tabId = useId();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(() => {
    const t = SAVED_TEXT[url.get("saved")];
    return t ? { kind: "ok", text: t } : null;
  });
  const actions = useContentActions({
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
        <ErrorPanel title="We could not load this item" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <Back />
        <Restricted what="This item" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BookOpen} title="We can't find that item" description="It may not exist, or it is outside your scope. Go back to the list." />
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

  const panel = {
    overview: <OverviewPanel d={d} />,
    tracking: <TrackingPanel d={d} />,
    versions: (
      <Section title="Version history">
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {d.versions.map((v) => (
            <li key={v.version} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-(--ap-line-2) p-3.5">
              <b className="text-[15px]">{v.version}</b>
              <Chip tone={v.state === "live" ? "ok" : v.state === "draft" ? "warn" : "mute"}>{v.state === "live" ? "Live" : v.state === "draft" ? "Draft" : "Replaced"}</Chip>
              <span className="min-w-0 flex-1 text-[14px] text-(--ap-ink-2)">{v.note}</span>
              <span className="text-[12px] text-(--ap-muted)">
                {v.by}, {formatIso(v.at)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] text-(--ap-muted)">
          {d.kind === "agreement"
            ? "Publishing a new version of an agreement asks everyone who accepted the earlier version to accept again. Earlier versions are kept."
            : "Editing a published item saves a new draft version. Staff keep seeing the live version until you publish the new one. Earlier versions are kept."}
        </p>
      </Section>
    ),
    activity: (
      <Section title="Activity">
        <ActivityTimeline items={d.activity} />
      </Section>
    ),
    preview: <StaffContentPreview d={d} />,
  }[tab];

  return (
    <div>
      <Back kind={d.kind} />
      <header className="ap-card mb-4 rounded-[20px] p-5 min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 flex-col gap-3 min-[768px]:flex-row min-[768px]:items-start min-[768px]:gap-4">
            <BoldTile glyph={d.kind === "sop" ? "clipboard" : d.kind === "training" ? "medal" : "shield"} tint={d.status === "published" ? "lavender" : "sage"} size={56} />
            <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.title}</h1>
            <p className="mt-2 text-[15px] leading-snug break-words">
              {KIND_ONE[d.kind]} · {d.category} · <b>{d.version}</b>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <ContentStatusChip status={d.status} />
              <span>Audience: {d.audienceLabel}</span>
              <span>{d.required ? REQUIRED_LABEL[d.kind].on : REQUIRED_LABEL[d.kind].off}</span>
            </div>
            {d.liveVersion ? <p className="mt-3 text-[14px] text-(--ap-muted)">Staff still see {d.liveVersion}. {d.version} is a draft until you publish it.</p> : null}
            {d.status === "draft" && !d.liveVersion ? <p className="mt-3 text-[14px] text-(--ap-muted)">Staff cannot see this yet.</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[460px] min-[1100px]:justify-end">
            {d.canEdit ? (
              <Link href={contentEditHref(d.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                <Pencil className="size-4" aria-hidden="true" /> {d.status === "published" ? "Edit (new version)" : "Edit"}
              </Link>
            ) : null}
            {primary.map((a) => (
              <button key={a} type="button" disabled={actions.busy} onClick={() => void actions.start(d, a)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                {ACTION_LABEL[a]}
              </button>
            ))}
            {secondary.length > 0 ? <RowMenu label={`More actions for ${d.title}`} items={secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "archive" ? ("danger" as const) : ("default" as const), onSelect: () => void actions.start(d, a) }))} /> : null}
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
    </div>
  );
}

function Back({ kind }: { kind?: ContentDetail["kind"] }) {
  return (
    <Link href={listHref(kind)} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> {kind ? KIND_TAB_LABEL[kind] : "SOPs & Training"}
    </Link>
  );
}

/* ---------- overview ---------- */

const TYPE_LABEL = { course: "Course", video: "Video", document: "Document", practical: "Practical" } as const;

function OverviewPanel({ d }: { d: ContentDetail }) {
  const config = useContentConfig();
  const dept = config.data?.departments.find((x) => x.id === d.departmentId)?.name;
  const facts: { label: string; value: ReactNode }[] = [
    { label: "Category", value: d.category },
    { label: "Version", value: d.liveVersion ? `${d.version} (draft), staff see ${d.liveVersion}` : d.version },
    { label: d.kind === "training" ? "Due date" : "Effective date", value: (d.kind === "training" ? d.dueDate : d.effectiveDate) ? formatYmd(d.kind === "training" ? d.dueDate : d.effectiveDate) : "Not set" },
    ...(d.kind === "sop" ? [{ label: "Due date", value: d.dueDate ? formatYmd(d.dueDate) : "Not set" }] : []),
    { label: d.kind === "agreement" ? "Acceptance" : d.kind === "sop" ? "Acknowledgement" : "Requirement", value: d.required ? REQUIRED_LABEL[d.kind].on : REQUIRED_LABEL[d.kind].off },
    { label: "Audience", value: d.audienceLabel },
    ...(d.kind === "sop" ? [{ label: "Department", value: dept ?? "Not set" }] : []),
    ...(d.kind === "training" ? [{ label: "Format", value: `${TYPE_LABEL[d.trainingType]}${d.durationMinutes ? `, ${d.durationMinutes} min` : ""}` }] : []),
    { label: "Last updated", value: formatIso(d.updatedAt) },
  ];
  return (
    <>
      <Section title="Details">
        <div className="mb-4 max-w-[70ch] text-[15px] leading-snug text-(--ap-ink-2)">{d.summary || <span className="text-(--ap-muted)">No summary added.</span>}</div>
        <Facts items={facts} />
      </Section>
      <Section title={d.kind === "agreement" ? "Agreement wording" : "Sections"}>
        {d.sections.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">No sections yet.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {d.sections.map((s, i) => (
              <li key={s.id} className="rounded-xl border border-(--ap-line-2) p-3.5">
                <b className="block text-[15px]">
                  {i + 1}. {s.title}
                </b>
                <p className="mt-1 line-clamp-3 text-[14px] leading-snug break-words whitespace-pre-line text-(--ap-ink-2)">{s.body}</p>
              </li>
            ))}
          </ol>
        )}
        {d.kind === "training" ? <p className="mt-3 text-[13px] text-(--ap-muted)">Quizzes and assessments are a later stage and are not part of this screen yet.</p> : null}
        {d.kind === "agreement" ? <p className="mt-3 text-[13px] text-(--ap-muted)">Placeholder wording. The final legal text needs Beeliv confirmation.</p> : null}
      </Section>
      <Section title="Attachments">
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px]">
          <li className="flex items-center gap-2.5">
            <FileText className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
            {d.pdf ? <span className="min-w-0 break-words">PDF link: <b>{d.pdf.url ?? d.pdf.fileName}</b>. Staff open it from the SOP.</span> : <span className="text-(--ap-muted)">No PDF attached.</span>}
          </li>
          <li className="flex items-center gap-2.5">
            <Video className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
            {d.video ? <span className="min-w-0 break-all">{d.video.mode === "link" ? <>Video link: <b>{d.video.url}</b></> : <>Video: <b>{d.video.fileName}</b> ({formatSize(d.video.sizeBytes)})</>}</span> : <span className="text-(--ap-muted)">No video added.</span>}
          </li>
        </ul>
      </Section>
    </>
  );
}

/* ---------- tracking ---------- */

function TrackingPanel({ d }: { d: ContentDetail }) {
  const [filter, setFilter] = useState<"all" | TrackStatus>("all");
  const [limit, setLimit] = useState(SHOW_MORE_STEP);
  const c = d.counts;
  if (d.assignees.length === 0) {
    return (
      <Section title="Tracking">
        <EmptyState icon={BookOpen} title="No one is assigned yet" description={d.status === "draft" ? "People are assigned when you publish. Set the audience on the edit screen." : "No staff match the audience."} />
      </Section>
    );
  }
  const statuses = TRACK_FILTERS[d.kind];
  const count = (s: TrackStatus) => d.assignees.filter((a) => a.status === s).length;
  const rows = d.assignees.filter((a) => filter === "all" || a.status === filter);
  const tiles: [string, number][] =
    d.kind === "agreement"
      ? [["Must accept", c.assigned], ["Accepted", c.done], ["Not accepted yet", count("pending")], ["Accept again", c.reaccept]]
      : [["Assigned", c.assigned], [DONE_LABEL[d.kind], c.done], ["In progress", c.inProgress], ["Overdue", c.overdue]];

  return (
    <Section title="Tracking" right={<span className="text-[13px] text-(--ap-muted)">{d.liveVersion ? `Tracking ${d.liveVersion}` : `Tracking ${d.version}`}</span>}>
      <dl className="mb-4 grid grid-cols-2 gap-3 min-[900px]:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-3">
            <dd className="text-[26px] leading-none font-bold tabular-nums">{n}</dd>
            <dt className="mt-1 text-[12px] text-(--ap-muted)">{label}</dt>
          </div>
        ))}
      </dl>
      <CompletionBar done={c.done} total={c.assigned} label={DONE_LABEL[d.kind]} />
      <FilterTabs
        label="Filter people by status"
        className="mt-4 mb-3"
        options={[{ key: "all" as const, label: "All", count: d.assignees.length }, ...statuses.map((s) => ({ key: s, label: TRACK_LABEL[s], count: count(s) }))]}
        value={filter}
        onChange={(k) => {
          setFilter(k);
          setLimit(SHOW_MORE_STEP);
        }}
      />
      {rows.length === 0 ? (
        <EmptyState icon={BookOpen} title="No one in this status" description="Pick another status to see the rest." />
      ) : (
        <div className="@container">
          <AssigneeTable rows={rows.slice(0, limit)} kind={d.kind} />
          <AssigneeCards rows={rows.slice(0, limit)} kind={d.kind} />
          <ShowMore shown={limit} total={rows.length} onMore={() => setLimit((l) => l + SHOW_MORE_STEP)} />
        </div>
      )}
    </Section>
  );
}

const ACOLS = "grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.9fr)_minmax(0,1fr)]";
const HEAD = "text-[12px] font-bold text-(--ap-muted)";

function doneText(a: Assignee): string {
  if (!a.doneAt) return "Not yet";
  return `${formatIso(a.doneAt)}${a.doneVersion ? ` (${a.doneVersion})` : ""}`;
}

function AssigneeTable({ rows, kind }: { rows: Assignee[]; kind: ContentDetail["kind"] }) {
  return (
    <div role="table" aria-label="People assigned" className="hidden overflow-hidden rounded-xl border border-(--ap-line) @min-[720px]:block">
      <div role="row" className={`grid ${ACOLS} gap-x-3 border-b border-(--ap-line) bg-(--ap-tint-soft) px-4 py-2.5`}>
        {["Person", "Role", "Client and outlet", "Status", kind === "agreement" ? "" : "Due", kind === "agreement" ? "Accepted" : "Completed"].map((h, i) => (
          <span key={`${h}-${i}`} role="columnheader" className={HEAD}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((a) => (
        <div key={a.id} role="row" className={`grid ${ACOLS} items-center gap-x-3 border-b border-(--ap-line-2) px-4 py-2.5 last:border-b-0 hover:bg-(--ap-tint-soft)`}>
          <div role="cell" className="flex min-w-0 items-center gap-2.5">
            <Initials name={a.name} size="size-9" />
            <Link href={staffHref(a.staffId)} className="min-w-0 truncate text-[14px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
              {a.name}
            </Link>
          </div>
          <span role="cell" className="text-[14px] text-(--ap-ink-2)">{a.role}</span>
          <span role="cell" className="min-w-0 text-[13px] leading-snug break-words text-(--ap-ink-2)">{a.placement}</span>
          <div role="cell"><TrackChip status={a.status} /></div>
          <span role="cell" className="text-[13px] text-(--ap-ink-2)">{kind === "agreement" ? "" : a.dueDate ? formatYmd(a.dueDate) : "No due date"}</span>
          <span role="cell" className="text-[13px] text-(--ap-ink-2)">{doneText(a)}</span>
        </div>
      ))}
    </div>
  );
}

function AssigneeCards({ rows, kind }: { rows: Assignee[]; kind: ContentDetail["kind"] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0 @min-[720px]:hidden">
      {rows.map((a) => (
        <li key={a.id} className="rounded-2xl border border-(--ap-line) p-3.5">
          <div className="flex items-center gap-2.5">
            <Initials name={a.name} size="size-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={staffHref(a.staffId)} className="block truncate text-[15px] font-bold text-(--ap-ink)">
                {a.name}
              </Link>
              <span className="block truncate text-[12px] text-(--ap-muted)">
                {a.role} · {a.placement}
              </span>
            </div>
            <TrackChip status={a.status} />
          </div>
          <p className="mt-2 text-[13px] text-(--ap-ink-2)">
            {kind === "agreement" ? "Accepted" : "Completed"}: {doneText(a)}
            {kind !== "agreement" && a.dueDate ? ` · due ${formatYmd(a.dueDate)}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className={`${sk} mb-3 h-5 w-40`} />
      <div className={`${sk} mb-4 h-[150px]`} />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className={`${sk} h-[260px]`} />
    </div>
  );
}

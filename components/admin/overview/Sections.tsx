import Link from "next/link";
import { AttentionBadge } from "@/components/applicant/AttentionBadge";
import { Briefcase, CalendarCheck, Check, ChevronRight, Clock3, FileCheck2, FileText, Plus, UserRound, Users, UsersRound } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { Chip } from "@/components/applicant/primitives";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { History } from "@/components/staff/icons";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import { dayLabel, timeOfDay } from "@/lib/admin/format";
import { formatDateTime } from "@/lib/admin/sort";
import { applicantHref, docQueueHref, METRIC_HREF, NEW_VACANCY_HREF, OPEN_JOBS_HREF, PEOPLE_APPLICANTS, PEOPLE_POOL, stageHref } from "@/lib/admin/links";
import type { ActivityKind, AttentionItem, HrMetricId, HrOverview, VacancyStatus } from "@/lib/admin/types";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { BannerButton, HeroBanner } from "./BannerControl";
import { Disc, type DiscTone } from "./Disc";
import { initialsOf, STAGE_COLORS, STAGE_SHORT, STAGE_TONE, VACANCY_STATUS } from "./meta";
import { Panel, PanelEmpty } from "./Panel";
import { RowMenu } from "./RowMenu";

export const TALENT_POOL_HREF = PEOPLE_POOL;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const divider = (i: number) => (i > 0 ? "border-t border-(--ap-line-2)" : "");

/** Soft, token-only gradient: the hero and the closing banner use it, so it follows the HR role colour and dark mode. */
const SOFT_GRADIENT = "bg-[linear-gradient(100deg,var(--ap-tint-soft),var(--ap-tint)_58%,var(--ap-tint-2))]";

/* ---------- hero: greeting, one friendly line, date card + Create Vacancy ---------- */

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function Hero({ greeting, firstName, line, canCreate, bannerImageUrl }: { greeting: string; firstName: string; line: string; canCreate: boolean; bannerImageUrl: string | null }) {
  const now = new Date();
  return (
    <section className={`relative overflow-hidden rounded-[22px] border border-(--ap-line) ${SOFT_GRADIENT}`}>
      {/* Photo slot: the real image is supplied later (no stock photos of people). Soft gradient until then. */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 right-[22%] size-56 rounded-full bg-(--ap-tint-2) opacity-60 max-[767px]:hidden" />
      <HeroBanner fallbackUrl={bannerImageUrl} />
      <div className="relative flex flex-col gap-5 p-5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between min-[768px]:gap-8 min-[768px]:p-8">
        <div className="min-w-0">
          <h1 className="ap-serif text-[36px] leading-[1.05] min-[768px]:text-[46px]">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-(--ap-ink-2)">{line}</p>
          <BannerButton />
        </div>
        <div className="ap-card flex w-full shrink-0 flex-col gap-3 rounded-2xl p-4 min-[768px]:w-[250px]">
          <div className="leading-tight">
            <span className="block text-[13px] font-bold tracking-wide text-(--ap-muted) uppercase">{now.toLocaleDateString("en-GB", { weekday: "long" })}</span>
            <b className="mt-0.5 block text-[17px] text-(--ap-ink)">{now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</b>
            <span className="text-[13px] text-(--ap-muted)">Week {isoWeek(now)}</span>
          </div>
          {canCreate ? (
            <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p h-11 text-white!">
              <Plus className="size-4" aria-hidden="true" /> Create Vacancy
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** One friendly line built only from adapter values. */
export function heroLine(ov: HrOverview | null): string {
  if (!ov) return "Your recruitment work will gather here as vacancies and applications arrive.";
  const parts = [`${plural(ov.interviewsToday.length, "interview")} today`, `${plural(ov.metrics.documentationPending, "document")} waiting for review`];
  return `You have ${parts.join(" and ")}. Here is where recruitment stands.`;
}

/* ---------- the seven metrics (spec 14.1), each a link to a filtered list ---------- */

const METRICS: { id: HrMetricId; label: string; icon: LucideIcon; tone: DiscTone }[] = [
  { id: "openVacancies", label: "Open Vacancies", icon: Briefcase, tone: "brand" },
  { id: "applications", label: "Applications", icon: FileText, tone: "brand" },
  { id: "shortlisted", label: "Shortlisted", icon: UserRound, tone: "brand" },
  { id: "interviewsPending", label: "Interviews Pending", icon: CalendarCheck, tone: "info" },
  { id: "documentationPending", label: "Documentation Pending", icon: FileCheck2, tone: "pending" },
  { id: "awaitingApproval", label: "Awaiting Approval", icon: Clock3, tone: "pending" },
  { id: "approvedPlaced", label: "Approved / Placed", icon: Check, tone: "ok" },
];

function Trend({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[12px] text-(--ap-muted)">No change this week</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-(--ap-muted)">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {delta > 0 ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
      </svg>
      <span className="sr-only">{delta > 0 ? "Up" : "Down"} </span>
      {Math.abs(delta)} this week
    </span>
  );
}

export function MetricStrip({ metrics, trends }: { metrics: HrOverview["metrics"]; trends: HrOverview["trends"] }) {
  return (
    <section aria-label="Recruitment at a glance" className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4 min-[768px]:gap-3.5 min-[1241px]:grid-cols-7">
      {METRICS.map((m, i) => (
        <Link key={m.id} href={METRIC_HREF[m.id]} className={`ap-card ap-card-hover flex min-w-0 flex-col gap-2.5 rounded-2xl p-3.5 min-[768px]:p-4 ${i === 6 ? "max-[767px]:col-span-2" : ""}`}>
          <Disc icon={m.icon} tone={m.tone} />
          <span className="min-w-0 leading-tight">
            <b className="block text-[28px] font-bold tracking-tight text-(--ap-ink) tabular-nums">{metrics[m.id]}</b>
            <span className="block text-[14px] font-semibold text-(--ap-ink-2)">{m.label}</span>
            <span className="mt-1 block">
              <Trend delta={trends[m.id]?.delta ?? 0} />
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ---------- Requires your attention ---------- */

export function AttentionPanel({ items, className = "" }: { items: AttentionItem[]; className?: string }) {
  return (
    <Panel title="Requires your attention" className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={Check} title="You're all caught up" description="Nothing needs your attention right now. It will show here the moment it does." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={it.href} className="flex items-center gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) px-3 py-2.5 hover:border-(--ap-tint-2)">
                {it.tone === "urgent" ? <AttentionBadge className="size-10" halo={false} /> : <Disc icon={Clock3} tone="pending" />}
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block text-[14px] text-(--ap-ink)">{it.title}</b>
                  {it.detail ? <span className="mt-0.5 block text-[13px] text-(--ap-muted)">{it.detail}</span> : null}
                </span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Recent applications: table when the panel is wide, stacked cards otherwise ---------- */

const SIZE_PX: Record<string, number> = { "size-8": 32, "size-9": 36, "size-10": 40, "size-11": 44, "size-12": 48, "size-14": 56, "size-16": 64 };

/** Person avatar. Clicking it opens the photo dialog (or "No profile photo"); pass viewable={false} to opt out. */
export function Initials({ name, size = "size-9", photoUrl, viewable = true }: { name: string; size?: string; photoUrl?: string | null; viewable?: boolean }) {
  return <AdminAvatar name={name} photoUrl={photoUrl} size={SIZE_PX[size] ?? 36} viewable={viewable} />;
}

const APP_COLS = "grid-cols-[minmax(110px,1.4fr)_minmax(80px,1fr)_minmax(80px,1fr)_104px_max-content_32px]";

function StageChip({ stage }: { stage: number }) {
  return (
    <span title={APPLICATION_STAGES[stage]}>
      <Chip tone={STAGE_TONE[stage] ?? "info"}>{STAGE_SHORT[stage] ?? STAGE_SHORT[0]}</Chip>
    </span>
  );
}

export function ApplicationsPanel({ items, className = "" }: { items: HrOverview["recentApplications"]; className?: string }) {
  const place = (a: HrOverview["recentApplications"][number]) => [a.outlet, a.location].filter(Boolean).join(", ");
  const menu = (a: HrOverview["recentApplications"][number]) => (
    <RowMenu label={`Actions for ${a.applicantName}`} items={[{ label: "View applicant", href: applicantHref(a.applicantId) }, { label: "View this stage", href: stageHref(a.stage) }]} />
  );
  return (
    <Panel title="Recent applications" href={PEOPLE_APPLICANTS} className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={Users} title="No applications yet" description="New applications show here as soon as they are submitted." />
      ) : (
        <div className="@container">
          <div role="table" aria-label="Recent applications" className="hidden @min-[600px]:block">
            <div role="row" className={`grid ${APP_COLS} gap-x-3 border-b border-(--ap-line-2) pb-2 text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase`}>
              <span role="columnheader">Applicant</span>
              <span role="columnheader">Position</span>
              <span role="columnheader">Outlet / location</span>
              <span role="columnheader">Applied</span>
              <span role="columnheader">Status</span>
              <span role="columnheader" className="sr-only">
                Actions
              </span>
            </div>
            {items.map((a, i) => (
              <div key={a.id} role="row" className={`grid ${APP_COLS} items-center gap-x-3 py-2 ${divider(i)}`}>
                <div role="cell" className="flex min-w-0 items-center gap-2.5">
                  <Initials name={a.applicantName} />
                  <Link href={applicantHref(a.applicantId)} className="min-w-0 truncate text-[14px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                    {a.applicantName}
                  </Link>
                </div>
                <span role="cell" className="min-w-0 truncate text-[14px] text-(--ap-ink-2)">
                  {a.vacancy}
                </span>
                <span role="cell" className="min-w-0 truncate text-[14px] text-(--ap-muted)">
                  {place(a) || "-"}
                </span>
                <span className="text-[13px] text-(--ap-muted)">{formatDateTime(a.submittedAt)}</span>
                <div role="cell">
                  <StageChip stage={a.stage} />
                </div>
                <div role="cell">{menu(a)}</div>
              </div>
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col p-0 @min-[600px]:hidden">
            {items.map((a, i) => (
              <li key={a.id} className={`flex items-start gap-3 py-3 ${divider(i)}`}>
                <Initials name={a.applicantName} size="size-10" />
                <Link href={applicantHref(a.applicantId)} className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[15px] text-(--ap-ink)">{a.applicantName}</b>
                  <span className="mt-0.5 block truncate text-[14px] text-(--ap-ink-2)">{a.vacancy}</span>
                  <span className="block truncate text-[13px] text-(--ap-muted)">{place(a)}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <StageChip stage={a.stage} />
                    <span className="text-[12px] text-(--ap-muted)">{formatDateTime(a.submittedAt)}</span>
                  </span>
                </Link>
                {menu(a)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Recruitment pipeline: the 8 locked stages, counts + percentage bars ---------- */

export function PipelinePanel({ pipeline, className = "" }: { pipeline: HrOverview["pipeline"]; className?: string }) {
  const total = pipeline.reduce((n, p) => n + p.count, 0);
  const max = Math.max(1, ...pipeline.map((p) => p.count));
  return (
    <Panel title="Recruitment pipeline" href={PEOPLE_APPLICANTS} hrefLabel="All applicants" className={className}>
      {total === 0 ? (
        <PanelEmpty icon={Users} title="No applicants in the pipeline" description="Applicants appear here by stage once applications arrive." />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {pipeline.map((p) => {
            const pct = Math.round((p.count / total) * 100);
            return (
              <li key={p.stage}>
                <Link href={stageHref(p.stage)} className="flex items-center gap-3 rounded-lg py-1 hover:bg-(--ap-line-2)">
                  <span className="w-[116px] shrink-0 truncate text-[14px] font-semibold text-(--ap-ink-2) min-[480px]:w-[150px]" title={APPLICATION_STAGES[p.stage]}>
                    {APPLICATION_STAGES[p.stage]}
                  </span>
                  <span className="h-2.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${p.count ? Math.max(3, Math.round((p.count / max) * 100)) : 0}%`, background: STAGE_COLORS[p.stage % STAGE_COLORS.length] }} />
                  </span>
                  <b className="w-7 shrink-0 text-right text-[14px] text-(--ap-ink) tabular-nums">{p.count}</b>
                  <span className="w-10 shrink-0 text-right text-[13px] text-(--ap-muted) tabular-nums">{pct}%</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

/* ---------- Vacancy overview ---------- */

function VacancyChip({ status }: { status: VacancyStatus }) {
  const m = VACANCY_STATUS[status];
  if (m.tone === "rose") return <span className="ap-chip bg-(--ap-rose-bg) text-(--ap-rose)">{m.label}</span>;
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

const VAC_COLS = "grid-cols-[minmax(130px,1.3fr)_minmax(110px,1fr)_minmax(150px,1.3fr)_72px_130px]";

export function VacanciesPanel({ items, className = "" }: { items: HrOverview["vacancies"]; className?: string }) {
  return (
    <Panel title="Vacancy overview" href={OPEN_JOBS_HREF} className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={Briefcase} title="No vacancies yet" description="Vacancies you create show here with their applicants and status." />
      ) : (
        <div className="@container">
          <div role="table" aria-label="Vacancy overview" className="hidden @min-[600px]:block">
            <div role="row" className={`grid ${VAC_COLS} gap-x-3 border-b border-(--ap-line-2) pb-2 text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase`}>
              <span role="columnheader">Job title</span>
              <span role="columnheader">Department</span>
              <span role="columnheader">Outlet / client</span>
              <span role="columnheader">Applicants</span>
              <span role="columnheader">Status</span>
            </div>
            {items.map((v, i) => (
              <div key={v.id} role="row" className={`grid ${VAC_COLS} items-center gap-x-3 py-2.5 ${divider(i)}`}>
                <b role="cell" className="min-w-0 truncate text-[14px] text-(--ap-ink)">
                  {v.title}
                </b>
                <span role="cell" className="min-w-0 truncate text-[14px] text-(--ap-ink-2)">
                  {v.department}
                </span>
                <span role="cell" className="min-w-0 truncate text-[14px] text-(--ap-muted)">
                  {v.outlet}
                </span>
                <span role="cell" className="text-[14px] font-semibold text-(--ap-ink) tabular-nums">
                  {v.applicants}
                </span>
                <div role="cell">
                  <VacancyChip status={v.status} />
                </div>
              </div>
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col p-0 @min-[600px]:hidden">
            {items.map((v, i) => (
              <li key={v.id} className={`flex items-start justify-between gap-3 py-3 ${divider(i)}`}>
                <span className="min-w-0 leading-tight">
                  <b className="block text-[15px] text-(--ap-ink)">{v.title}</b>
                  <span className="mt-0.5 block text-[14px] text-(--ap-ink-2)">{v.department}</span>
                  <span className="block text-[13px] text-(--ap-muted)">{v.outlet}</span>
                  <span className="mt-1 block text-[13px] text-(--ap-muted)">{plural(v.applicants, "applicant")}</span>
                </span>
                <VacancyChip status={v.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Interviews today ---------- */

export function InterviewsTodayPanel({ items, className = "" }: { items: HrOverview["interviewsToday"]; className?: string }) {
  return (
    <Panel title="Interviews today" href="/admin/recruitment/interviews?status=pending" className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={CalendarCheck} title="No interviews today" description="Interviews scheduled for today show here with the time, interviewer and venue." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((iv, i) => (
            <li key={iv.id} className={divider(i)}>
              <Link href={applicantHref(iv.applicantId)} className="flex items-center gap-3 py-2.5">
                <span className="flex w-[68px] shrink-0 flex-col leading-tight">
                  <b className="text-[15px] text-(--ap-ink) tabular-nums">{timeOfDay(iv.at)}</b>
                  <span className="text-[12px] text-(--ap-muted)">{dayLabel(iv.at)}</span>
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[14px] text-(--ap-ink)">{iv.applicantName}</b>
                  <span className="block truncate text-[13px] text-(--ap-muted)">
                    {iv.vacancy} · {iv.interviewer} · {iv.venue}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Clients & outlets ---------- */

export function ClientsPanel({ items, className = "" }: { items: HrOverview["clientsOutlets"]; className?: string }) {
  return (
    <Panel title="Clients & outlets" className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={Briefcase} title="No clients in your scope" description="Clients and outlets assigned to you show here." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((c, i) => (
            <li key={c.id} className={`flex items-center gap-3 py-2.5 ${divider(i)}`}>
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-violet) text-[14px] font-bold text-white">
                {initialsOf(c.name)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block truncate text-[14px] text-(--ap-ink)">{c.name}</b>
                <span className="block text-[13px] text-(--ap-muted)">{plural(c.openVacancies, "open vacancy", "open vacancies")}</span>
              </span>
              <Chip tone={c.active ? "ok" : "mute"}>{c.active ? "Active" : "Inactive"}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Placement & onboarding ---------- */

export function PlacementPanel({ placement, className = "" }: { placement: HrOverview["placement"]; className?: string }) {
  const rows: { label: string; value: number; icon: LucideIcon; tone: DiscTone; href: string }[] = [
    { label: "Approved", value: placement.approved, icon: Check, tone: "ok", href: METRIC_HREF.approvedPlaced },
    { label: "Pending docs", value: placement.pendingDocs, icon: FileText, tone: "pending", href: docQueueHref("pending") },
    { label: "Onboarding", value: placement.onboarding, icon: UserRound, tone: "info", href: stageHref(6) },
    { label: "Active this month", value: placement.activeThisMonth, icon: UsersRound, tone: "brand", href: stageHref(7) },
  ];
  const none = rows.every((r) => r.value === 0);
  return (
    <Panel title="Placement & onboarding" className={className}>
      {none ? (
        <PanelEmpty icon={Users} title="No placements yet" description="Approved candidates, onboarding and active staff appear here." />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
          {rows.map((r) => (
            <li key={r.label}>
              <Link href={r.href} className="flex items-center gap-3 rounded-xl border border-(--ap-line-2) bg-(--ap-tint-soft) p-3 hover:border-(--ap-tint-2)">
                <Disc icon={r.icon} tone={r.tone} />
                <span className="min-w-0 leading-tight">
                  <b className="block text-[17px] text-(--ap-ink) tabular-nums">{r.value}</b>
                  <span className="block text-[13px] text-(--ap-muted)">{r.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Recent activity ---------- */

const ACTIVITY_ICON: Record<ActivityKind, { icon: LucideIcon; tone: DiscTone }> = {
  application: { icon: FileText, tone: "brand" },
  shortlist: { icon: Check, tone: "ok" },
  interview: { icon: CalendarCheck, tone: "info" },
  approval: { icon: Clock3, tone: "pending" },
  document: { icon: FileCheck2, tone: "brand" },
};

export function ActivityPanel({ items, className = "" }: { items: HrOverview["activity"]; className?: string }) {
  return (
    <Panel title="Recent activity" className={className}>
      {items.length === 0 ? (
        <PanelEmpty icon={History} title="No activity yet" description="Recruitment actions you and your team take are listed here." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((a, i) => {
            const k = a.kind ? ACTIVITY_ICON[a.kind] : { icon: History, tone: "brand" as DiscTone };
            return (
              <li key={a.id} className={`flex items-center gap-3 py-2.5 ${divider(i)}`}>
                <Disc icon={k.icon} tone={k.tone} className="size-9" />
                <span className="min-w-0 flex-1 text-[14px] leading-snug text-(--ap-ink-2)">
                  <b className="text-(--ap-ink)">{a.actor}</b> {a.action} <b className="text-(--ap-ink)">{a.target}</b>
                </span>
                <RelativeTime iso={a.at} className="shrink-0 text-[12px] text-(--ap-faint)" />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Talent pool summary ---------- */

export function TalentPoolPanel({ summary, className = "" }: { summary: HrOverview["talentPool"]; className?: string }) {
  return (
    <Panel title="Talent pool" href={TALENT_POOL_HREF} hrefLabel="Open" className={className}>
      {summary.count === 0 ? (
        <PanelEmpty icon={UsersRound} title="The talent pool is empty" description="Candidates you keep for future roles will be summarised here." />
      ) : (
        <div className="flex flex-col gap-3.5">
          <Link href={TALENT_POOL_HREF} className="flex items-center gap-3">
            <Disc icon={UsersRound} tone="brand" />
            <span className="leading-tight">
              <b className="block text-[28px] text-(--ap-ink) tabular-nums">{summary.count}</b>
              <span className="text-[14px] text-(--ap-muted)">{summary.count === 1 ? "candidate retained" : "candidates retained"}</span>
            </span>
          </Link>
          {summary.topSkills.length ? (
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-(--ap-muted)">Top skills</span>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {summary.topSkills.map((s) => (
                  <li key={s.label}>
                    <span className="ap-chip ap-chip-violet">
                      {s.label} <span className="tabular-nums opacity-75">{s.count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

/* ---------- closing banner ---------- */

export function TalentBanner({ canCreate }: { canCreate: boolean }) {
  return (
    <section className={`flex flex-col gap-4 rounded-[22px] border border-(--ap-line) p-5 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between min-[768px]:p-8 ${SOFT_GRADIENT}`}>
      <div className="min-w-0">
        <h2 className="ap-serif text-[18px] leading-tight">Need more exceptional talent?</h2>
        <p className="mt-1.5 max-w-[56ch] text-[15px] leading-[1.5] text-(--ap-ink-2)">Open a vacancy for a new role, or look through the candidates you have already retained.</p>
      </div>
      <div className="flex flex-col gap-2.5 min-[480px]:flex-row min-[480px]:shrink-0">
        {canCreate ? (
          <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p h-12 text-white!">
            <Plus className="size-4" aria-hidden="true" /> Create Vacancy
          </Link>
        ) : null}
        <Link href={TALENT_POOL_HREF} className="ap-btn ap-btn-s h-12">
          <UsersRound className="size-4" aria-hidden="true" /> Browse Talent Pool
        </Link>
      </div>
    </section>
  );
}


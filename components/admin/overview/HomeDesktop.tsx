"use client";

/**
 * Admin Home, calm redesign (SAMPLE). Same data and links as before; different
 * presentation: one tinted greeting panel, plain lists with hairlines, a single
 * stat strip, thin bars, one accent colour for things that need attention.
 * Phone (<768): no boxes, hairlines between sections, short lists, horizontal
 * scrollers for number rows.
 */
import Link from "next/link";
import { ChevronRight, Plus } from "@/components/applicant/icons";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import { dayLabel, timeOfDay } from "@/lib/admin/format";
import { formatDateTime } from "@/lib/admin/sort";
import { useGlance } from "@/lib/admin/glance/hooks";
import { applicantHref, docQueueHref, METRIC_HREF, NEW_VACANCY_HREF, OPEN_JOBS_HREF, PEOPLE_APPLICANTS, PEOPLE_POOL, stageHref } from "@/lib/admin/links";
import type { HrMetricId, HrOverview } from "@/lib/admin/types";
import { BannerButton, HeroBanner, useHasBanner } from "./BannerControl";
import { Flat, FLAT_BOX, FlatEmpty, rowLine } from "./Flat";
import { STAGE_SHORT, VACANCY_STATUS } from "./meta";
import type { Need } from "./NeedsToday";
import { RowMenu } from "./RowMenu";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/* ---------- greeting panel: the one tinted block on the page ---------- */

export function Greeting({ greeting, firstName, needs, interviews = [], canCreate, bannerImageUrl, className = "" }: { greeting: string; firstName: string; needs: Need[]; interviews?: HrOverview["interviewsToday"]; canCreate: boolean; bannerImageUrl: string | null; className?: string }) {
  const now = new Date();
  const total = needs.reduce((n, x) => n + x.count, 0);
  const first = needs[0];
  const hasBanner = useHasBanner(bannerImageUrl);
  // With a photo behind the text, switch the text tokens to light so everything reads on the dark cloud.
  const onPhoto = hasBanner
    ? ({ "--ap-ink": "#ffffff", "--ap-ink-2": "rgba(255,255,255,.9)", "--ap-muted": "rgba(255,255,255,.76)", "--ap-line": "rgba(255,255,255,.24)" } as React.CSSProperties)
    : undefined;
  return (
    <section style={onPhoto} className={`relative flex flex-col overflow-hidden min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-tint) ${className}`}>
      <HeroBanner fallbackUrl={bannerImageUrl} />
      <div className="relative flex min-w-0 flex-1 flex-col min-[768px]:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[.14em] text-(--ap-muted) uppercase">
            <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-(--ap-gold)" />
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            <span className="max-[480px]:hidden"> · Week {isoWeek(now)}</span>
          </p>
          {canCreate ? (
            <Link href={NEW_VACANCY_HREF} className="-my-2 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-(--ap-violet) min-[768px]:hidden">
              <Plus className="size-3.5" aria-hidden="true" /> New vacancy
            </Link>
          ) : null}
        </div>
        <h1 className="ap-serif mt-2 text-[26px] leading-[1.1] text-(--ap-ink) min-[768px]:mt-3 min-[768px]:text-[32px]">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-1.5 max-w-[46ch] text-[14.5px] leading-[1.5] text-(--ap-ink-2)">
          {total > 0 ? (
            <>
              <b className="font-semibold text-(--ap-ink)">{plural(total, "thing")} need{total === 1 ? "s" : ""} you today.</b>
              {first ? ` Start with ${first.count} ${first.label.toLowerCase()}.` : ""}
            </>
          ) : (
            "You are all caught up. Here is where recruitment stands."
          )}
        </p>
        <div className="mt-5 hidden flex-wrap items-center gap-2 min-[768px]:mt-7 min-[768px]:flex">
          {canCreate ? (
            <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p h-10 rounded-full px-5 text-[14px] text-white!">
              <Plus className="size-4" aria-hidden="true" /> Create Vacancy
            </Link>
          ) : null}
          <BannerButton />
        </div>
        <div className="mt-7 hidden border-t border-(--ap-line) pt-3.5 min-[768px]:block">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-[14px] leading-tight font-semibold text-(--ap-ink)">Today</h2>
            <Link href="/admin/recruitment/interviews?status=pending" className={`text-[12.5px] font-semibold ${hasBanner ? "text-white underline-offset-2 hover:underline" : "text-(--ap-violet) hover:text-(--ap-violet-2)"}`}>Interviews</Link>
          </div>
          {interviews.length === 0 ? (
            <p className="py-2 text-[13px] text-(--ap-muted)">No interviews scheduled today.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {interviews.slice(0, 3).map((iv, i) => (
                <li key={iv.id} className={rowLine(i)}>
                  <Link href={applicantHref(iv.applicantId)} className="flex min-h-11 items-center gap-3 py-1.5">
                    <b className="w-14 shrink-0 text-[14px] font-semibold text-(--ap-ink) tabular-nums">{timeOfDay(iv.at)}</b>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-(--ap-ink)">
                      {iv.applicantName}
                      <span className="text-(--ap-muted)"> · {iv.vacancy}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- one stat strip: seven metrics + the four business numbers ---------- */

export const METRICS: { id: HrMetricId; label: string }[] = [
  { id: "openVacancies", label: "Open vacancies" },
  { id: "applications", label: "Applications" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interviewsPending", label: "Interviews" },
  { id: "documentationPending", label: "Docs pending" },
  { id: "awaitingApproval", label: "Awaiting approval" },
  { id: "approvedPlaced", label: "Placed" },
];

function TrendText({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[11.5px] text-(--ap-faint)">no change</span>;
  return (
    <span className="text-[11.5px] text-(--ap-muted)">
      <span aria-hidden="true" className={delta > 0 ? "text-(--calm-olive)" : ""}>{delta > 0 ? "↑" : "↓"} </span>
      <span className="sr-only">{delta > 0 ? "Up " : "Down "}</span>
      {Math.abs(delta)} this week
    </span>
  );
}

export function StatStrip({ metrics, trends }: { metrics: HrOverview["metrics"]; trends: HrOverview["trends"] }) {
  return (
    <section aria-label="Recruitment this week" className="min-w-0">
      <h2 className="mb-1.5 text-[14px] font-semibold text-(--ap-ink) min-[768px]:sr-only">This week</h2>
      <div className={`${FLAT_BOX} relative flex overflow-x-auto max-[767px]:border-y max-[767px]:border-(--ap-line) min-[768px]:grid min-[768px]:grid-cols-7 min-[768px]:overflow-visible min-[768px]:p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {METRICS.map((m, i) => (
          <Link key={m.id} href={METRIC_HREF[m.id]} className={`flex min-w-[112px] shrink-0 flex-col justify-center gap-0.5 px-3.5 py-3 min-[768px]:min-w-0 min-[768px]:px-4 min-[768px]:hover:bg-(--ap-tint-soft) ${i > 0 ? "border-l border-(--ap-line-2)" : "max-[767px]:pl-0"}`}>
            <span className="text-[12px] leading-tight text-(--ap-muted)">{m.label}</span>
            <b className="text-[22px] leading-tight font-semibold text-(--ap-ink) tabular-nums">{metrics[m.id]}</b>
            <TrendText delta={trends[m.id]?.delta ?? 0} />
          </Link>
        ))}
      </div>
    </section>
  );
}

const GLANCE = ["placements", "jobs", "requests", "waiting"];

/** Four business numbers as one quiet line (renders nothing while loading or empty, like before). */
export function GlanceLine() {
  const { data, status } = useGlance("hr");
  if (status !== "ready" || !data) return null;
  const tiles = GLANCE.map((k) => data.tiles.find((t) => t.key === k)).filter((t) => !!t);
  return (
    <section aria-label="At a glance" className="relative flex min-w-0 items-center gap-x-5 overflow-x-auto max-[767px]:hidden text-[13px] whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tiles.map((t) => (
        <Link key={t.key} href={t.href} className="flex min-h-11 items-baseline gap-1.5 text-(--ap-ink-2) hover:text-(--ap-violet) min-[768px]:min-h-8">
          <b className="text-[15px] font-semibold text-(--ap-ink) tabular-nums">{t.value}</b>
          {t.label.toLowerCase()}
          {t.sub && t.subTone === "bad" ? <span className="text-[12px] text-(--ap-rose)">· {t.sub}</span> : null}
        </Link>
      ))}
      <Link href="/admin/reports/glance" className="ml-auto flex min-h-11 items-center text-[12.5px] font-semibold text-(--ap-violet) min-[768px]:min-h-8">
        All numbers
      </Link>
    </section>
  );
}

/* ---------- shared bits ---------- */

function StageText({ stage }: { stage: number }) {
  return (
    <span title={APPLICATION_STAGES[stage]} className="inline-block rounded-full border border-(--ap-line) px-2 py-px text-[11.5px] whitespace-nowrap text-(--ap-ink-2)">
      {STAGE_SHORT[stage] ?? STAGE_SHORT[0]}
    </span>
  );
}

const APP_COLS = "grid-cols-[minmax(130px,1.4fr)_minmax(80px,1fr)_minmax(80px,1fr)_104px_max-content_28px]";

type App = HrOverview["recentApplications"][number];
const place = (a: App) => [a.outlet, a.location].filter(Boolean).join(", ");

export function ApplicationsFlat({ items, className = "" }: { items: App[]; className?: string }) {
  const menu = (a: App) => <RowMenu label={`Actions for ${a.applicantName}`} items={[{ label: "View applicant", href: applicantHref(a.applicantId) }, { label: "View this stage", href: stageHref(a.stage) }]} />;
  return (
    <Flat title="Recent applications" href={PEOPLE_APPLICANTS} className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="No applications yet" description="New applications show here as soon as they are submitted." />
      ) : (
        <div className="@container">
          <div role="table" aria-label="Recent applications" className="hidden @min-[600px]:block">
            <div role="row" className={`grid ${APP_COLS} gap-x-3 border-b border-(--ap-line-2) pb-1.5 text-[11.5px] font-semibold tracking-wide text-(--ap-muted) uppercase`}>
              <span role="columnheader">Applicant</span>
              <span role="columnheader">Position</span>
              <span role="columnheader">Outlet / location</span>
              <span role="columnheader">Applied</span>
              <span role="columnheader">Status</span>
              <span role="columnheader" className="sr-only">Actions</span>
            </div>
            {items.map((a, i) => (
              <div key={a.id} role="row" className={`grid ${APP_COLS} items-center gap-x-3 py-2 min-h-14 ${rowLine(i)}`}>
                <div role="cell" className="flex min-w-0 items-center gap-2.5">
                  <AdminAvatar name={a.applicantName} size={36} viewable />
                  <Link href={applicantHref(a.applicantId)} className="min-w-0 text-[13.5px] leading-snug font-semibold text-(--ap-ink) hover:text-(--ap-violet)">
                    {a.applicantName}
                  </Link>
                </div>
                <span role="cell" className="min-w-0 text-[13.5px] leading-snug text-(--ap-ink-2)">{a.vacancy}</span>
                <span role="cell" className="min-w-0 text-[13.5px] leading-snug text-(--ap-muted)">{place(a) || "-"}</span>
                <span className="text-[12.5px] text-(--ap-muted)">{formatDateTime(a.submittedAt)}</span>
                <div role="cell"><StageText stage={a.stage} /></div>
                <div role="cell">{menu(a)}</div>
              </div>
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col p-0 @min-[600px]:hidden">
            {items.slice(0, 4).map((a, i) => (
              <li key={a.id} className={rowLine(i)}>
                <Link href={applicantHref(a.applicantId)} className="flex min-h-14 items-center gap-3 py-2">
                  <AdminAvatar name={a.applicantName} size={32} viewable={false} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block truncate text-[14px] font-semibold text-(--ap-ink)">{a.applicantName}</b>
                    <span className="block truncate text-[12.5px] text-(--ap-muted)">{a.vacancy}</span>
                  </span>
                  <StageText stage={a.stage} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Flat>
  );
}

export function InterviewsFlat({ items, className = "" }: { items: HrOverview["interviewsToday"]; className?: string }) {
  return (
    <Flat title="Interviews today" href="/admin/recruitment/interviews?status=pending" className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="No interviews today" description="Scheduled interviews show here." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((iv, i) => (
            <li key={iv.id} className={rowLine(i)}>
              <Link href={applicantHref(iv.applicantId)} className="flex min-h-14 items-center gap-3 py-2 min-[768px]:min-h-12">
                <span className="w-[54px] shrink-0 leading-tight">
                  <b className="block text-[14px] font-semibold text-(--ap-ink) tabular-nums">{timeOfDay(iv.at)}</b>
                  <span className="text-[11.5px] text-(--ap-muted)">{dayLabel(iv.at)}</span>
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[13.5px] font-semibold text-(--ap-ink)">{iv.applicantName}</b>
                  <span className="block truncate text-[12.5px] text-(--ap-muted)">{iv.vacancy} · {iv.interviewer}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

export function AttentionFlat({ items, className = "" }: { items: HrOverview["attention"]; className?: string }) {
  return (
    <Flat title="Requires your attention" className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="You are all caught up" description="Nothing needs attention right now." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.slice(0, 4).map((it, i) => (
            <li key={it.id} className={rowLine(i)}>
              <Link href={it.href} className="flex min-h-14 items-center gap-3 py-2 min-[768px]:min-h-12">
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${it.tone === "urgent" ? "bg-(--ap-rose)" : "bg-(--ap-faint)"}`} />
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block text-[13.5px] font-semibold text-(--ap-ink)">{it.title}</b>
                  {it.detail ? <span className="block text-[12.5px] text-(--ap-muted)">{it.detail}</span> : null}
                </span>
                <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

/* ---------- pipeline: thin bars, direct labels, the biggest stage highlighted ---------- */

export function PipelineFlat({ pipeline, className = "" }: { pipeline: HrOverview["pipeline"]; className?: string }) {
  const total = pipeline.reduce((n, p) => n + p.count, 0);
  const max = Math.max(1, ...pipeline.map((p) => p.count));
  return (
    <Flat title="Recruitment pipeline" href={PEOPLE_APPLICANTS} hrefLabel="All applicants" className={className}>
      {total === 0 ? (
        <FlatEmpty title="No applicants in the pipeline" description="Applicants appear here by stage." />
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {pipeline.map((p) => (
            <li key={p.stage}>
              <Link href={stageHref(p.stage)} className="flex min-h-11 items-center gap-3 min-[768px]:min-h-8">
                <span className="w-[120px] shrink-0 truncate text-[13px] text-(--ap-ink-2) min-[480px]:w-[150px]" title={APPLICATION_STAGES[p.stage]}>{APPLICATION_STAGES[p.stage]}</span>
                <span className="h-1 min-w-[60px] flex-1 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
                  <span className={`block h-full rounded-full ${p.count === max ? "bg-(--ap-violet)" : "bg-(--ap-faint) opacity-50"}`} style={{ width: `${p.count ? Math.max(3, Math.round((p.count / max) * 100)) : 0}%` }} />
                </span>
                <b className="w-7 shrink-0 text-right text-[13px] font-semibold text-(--ap-ink) tabular-nums">{p.count}</b>
                <span className="w-9 shrink-0 text-right text-[12px] text-(--ap-muted) tabular-nums">{Math.round((p.count / total) * 100)}%</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Flat>
  );
}

/* ---------- vacancies ---------- */

const VAC_COLS = "grid-cols-[minmax(130px,1.3fr)_minmax(110px,1fr)_minmax(150px,1.3fr)_72px_130px]";

function VacancyStatusText({ status }: { status: keyof typeof VACANCY_STATUS }) {
  const m = VACANCY_STATUS[status];
  const cls = m.tone === "rose" ? "text-(--ap-rose)" : "text-(--ap-ink-2)";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${cls}`}>
      {m.tone === "ok" ? <span aria-hidden="true" className="size-1.5 rounded-full bg-(--calm-olive)" /> : null}
      {m.label}
    </span>
  );
}

export function VacanciesFlat({ items, className = "" }: { items: HrOverview["vacancies"]; className?: string }) {
  return (
    <Flat title="Vacancy overview" href={OPEN_JOBS_HREF} className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="No vacancies yet" description="Vacancies you create show here." />
      ) : (
        <div className="@container">
          <div role="table" aria-label="Vacancy overview" className="hidden @min-[600px]:block">
            <div role="row" className={`grid ${VAC_COLS} gap-x-3 border-b border-(--ap-line-2) pb-1.5 text-[11.5px] font-semibold tracking-wide text-(--ap-muted) uppercase`}>
              <span role="columnheader">Job title</span>
              <span role="columnheader">Department</span>
              <span role="columnheader">Outlet / client</span>
              <span role="columnheader">Applicants</span>
              <span role="columnheader">Status</span>
            </div>
            {items.map((v, i) => (
              <div key={v.id} role="row" className={`grid ${VAC_COLS} items-center gap-x-3 py-2 min-h-14 ${rowLine(i)}`}>
                <b role="cell" className="min-w-0 text-[13.5px] leading-snug font-semibold text-(--ap-ink)">{v.title}</b>
                <span role="cell" className="min-w-0 text-[13.5px] leading-snug text-(--ap-ink-2)">{v.department}</span>
                <span role="cell" className="min-w-0 text-[13.5px] leading-snug text-(--ap-muted)">{v.outlet}</span>
                <span role="cell" className="text-[13.5px] text-(--ap-ink) tabular-nums">{v.applicants}</span>
                <div role="cell"><VacancyStatusText status={v.status} /></div>
              </div>
            ))}
          </div>
          <ul className="m-0 flex list-none flex-col p-0 @min-[600px]:hidden">
            {items.slice(0, 4).map((v, i) => (
              <li key={v.id} className={`flex min-h-14 items-center justify-between gap-3 py-2 ${rowLine(i)}`}>
                <span className="min-w-0 leading-tight">
                  <b className="block truncate text-[14px] font-semibold text-(--ap-ink)">{v.title}</b>
                  <span className="block truncate text-[12.5px] text-(--ap-muted)">{v.outlet} · {plural(v.applicants, "applicant")}</span>
                </span>
                <VacancyStatusText status={v.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Flat>
  );
}

/* ---------- small summaries ---------- */

export function PlacementFlat({ placement, className = "" }: { placement: HrOverview["placement"]; className?: string }) {
  const rows = [
    { label: "Approved", value: placement.approved, href: METRIC_HREF.approvedPlaced },
    { label: "Pending docs", value: placement.pendingDocs, href: docQueueHref("pending") },
    { label: "Onboarding", value: placement.onboarding, href: stageHref(6) },
    { label: "Active this month", value: placement.activeThisMonth, href: stageHref(7) },
  ];
  return (
    <Flat title="Placement & onboarding" className={className}>
      {rows.every((r) => r.value === 0) ? (
        <FlatEmpty title="No placements yet" description="Approved candidates and active staff appear here." />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-x-4 p-0">
          {rows.map((r, i) => (
            <li key={r.label} className={i > 1 ? "border-t border-(--ap-line-2)" : ""}>
              <Link href={r.href} className="flex min-h-12 items-baseline gap-2 py-2.5">
                <b className="text-[20px] leading-none font-semibold text-(--ap-ink) tabular-nums">{r.value}</b>
                <span className="text-[12.5px] text-(--ap-muted)">{r.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

export function ClientsFlat({ items, className = "" }: { items: HrOverview["clientsOutlets"]; className?: string }) {
  return (
    <Flat title="Clients & outlets" className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="No clients in your scope" description="Clients assigned to you show here." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((c, i) => (
            <li key={c.id} className={`flex min-h-12 items-center gap-3 py-2 ${rowLine(i)}`}>
              <AdminAvatar name={c.name} size={28} viewable={false} />
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block truncate text-[13.5px] font-semibold text-(--ap-ink)">{c.name}</b>
                <span className="text-[12.5px] text-(--ap-muted)">{plural(c.openVacancies, "open vacancy", "open vacancies")}</span>
              </span>
              {!c.active ? <span className="text-[12px] text-(--ap-muted)">Inactive</span> : null}
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

export function TalentFlat({ summary, className = "" }: { summary: HrOverview["talentPool"]; className?: string }) {
  return (
    <Flat title="Talent pool" href={PEOPLE_POOL} hrefLabel="Open" className={className}>
      {summary.count === 0 ? (
        <FlatEmpty title="The talent pool is empty" description="Candidates you keep for future roles show here." />
      ) : (
        <Link href={PEOPLE_POOL} className="block py-1">
          <span className="flex items-baseline gap-2">
            <b className="text-[22px] leading-none font-semibold text-(--ap-ink) tabular-nums">{summary.count}</b>
            <span className="text-[12.5px] text-(--ap-muted)">{summary.count === 1 ? "candidate retained" : "candidates retained"}</span>
          </span>
          {summary.topSkills.length ? (
            <span className="mt-2 block text-[12.5px] leading-[1.6] text-(--ap-ink-2)">
              {summary.topSkills.map((s) => `${s.label} ${s.count}`).join(" · ")}
            </span>
          ) : null}
        </Link>
      )}
    </Flat>
  );
}

export function ActivityFlat({ items, className = "" }: { items: HrOverview["activity"]; className?: string }) {
  return (
    <Flat title="Recent activity" className={className}>
      {items.length === 0 ? (
        <FlatEmpty title="No activity yet" description="Recruitment actions are listed here." />
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.slice(0, 5).map((a, i) => (
            <li key={a.id} className={`flex min-h-12 items-center gap-3 py-2 ${rowLine(i)}`}>
              <AdminAvatar name={a.actor} size={28} viewable={false} />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-(--ap-ink-2)">
                <b className="font-semibold text-(--ap-ink)">{a.actor}</b> {a.action} <b className="font-semibold text-(--ap-ink)">{a.target}</b>
              </span>
              <RelativeTime iso={a.at} className="shrink-0 text-[11.5px] text-(--ap-faint)" />
            </li>
          ))}
        </ul>
      )}
    </Flat>
  );
}

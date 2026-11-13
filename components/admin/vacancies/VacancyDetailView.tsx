"use client";

/**
 * Vacancy detail (HR, spec 15). Header (title, status, recruiter, dates and the
 * allowed actions) and five tabs: Overview, Requirements, Screening questions,
 * Applicants (counts only, links to the filtered applicants list) and Activity.
 * Which actions show comes from the adapter (`allowedActions`, `canEdit`);
 * hiding a button is presentation only, the backend re-checks every action.
 *
 * Reused: DETAIL_TITLE / EmptyState (applicant primitives), FilterDropdown for
 * the phone tab picker, ErrorPanel, RowMenu, Chip, ApplicantPreview (JobCard).
 */
import { getForm as getAdminForm } from "@/lib/admin/tests/store";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction } from "@/components/admin/PhoneDetail";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import Link from "next/link";
import { useId, useState } from "react";
import { Briefcase, Check, ChevronLeft, Exclaim, Pencil, X } from "@/components/applicant/icons";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { Chip, DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Disc } from "@/components/admin/overview/Disc";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { useUrlParams } from "@/components/admin/applicants/url";
import { useVacancy } from "@/lib/admin/vacancies/hooks";
import type { VacancyAction, VacancyDetail } from "@/lib/admin/vacancies/types";
import { useVacancyActions } from "./actions";
import { JourneyReadout } from "@/components/admin/journey/JourneyReadout";
import { ApplicantPreview } from "./ApplicantPreview";
import { ACTION_LABEL, closesText, COMPETITIVE_PAY, formatYmd, internalSalaryText, postedText, publicSalaryText } from "./meta";
import { ActivityList, BulletList, Facts, Restricted, Section, VacancyStatusChip, VacancyStatusPill } from "./parts";
import { vacancyApplicantsHref, vacancyEditHref } from "./VacanciesList";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "requirements", label: "Requirements" },
  { key: "screening", label: "Screening questions" },
  { key: "applicants", label: "Applicants" },
  { key: "activity", label: "Activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const SAVED_TEXT: Record<string, string> = {
  draft: "The vacancy was saved as a draft.",
  updated: "Your changes were saved.",
  submitted: "The vacancy was submitted for approval.",
  published: "The vacancy was published.",
};

const PRIMARY: VacancyAction[] = ["submit-for-approval", "publish", "resume"];

export function VacancyDetailView({ id }: { id: string }) {
  const live = useVacancy(id);
  const url = useUrlParams();
  const tabId = useId();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(() => {
    const t = SAVED_TEXT[url.get("saved")];
    return t ? { kind: "ok", text: t } : null;
  });
  const actions = useVacancyActions({
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
        <ErrorPanel title="We could not load this vacancy" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        <Back />
        <Restricted what="This vacancy" />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Briefcase} title="Vacancy not found" description="This vacancy does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  const v = live.data;
  if (!v) return <DetailSkeleton />;

  const rawTab = url.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "overview";
  const setTab = (k: TabKey) => url.set({ tab: k === "overview" ? undefined : k });
  const target = { id: v.id, title: v.title };

  const primary = v.allowedActions.filter((a) => PRIMARY.includes(a));
  const secondary = v.allowedActions.filter((a) => !PRIMARY.includes(a));

  // Phones: the first main action is the ONE sticky button; every other allowed action sits in the cover's More menu.
  const phonePrimary = primary[0] ?? null;
  const phoneMenu = v.allowedActions.filter((a) => a !== phonePrimary);

  const panel = {
    overview: <OverviewPanel v={v} />,
    requirements: <RequirementsPanel v={v} />,
    screening: <ScreeningPanel v={v} />,
    applicants: <ApplicantsPanel v={v} />,
    activity: (
      <Section title="Activity">
        <ActivityList items={v.activity} />
      </Section>
    ),
  }[tab];

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, Edit / Applicants, a short counted list, ONE sticky primary action. */}
      <PhoneDetailHead
        backHref="/admin/recruitment/vacancies"
        backLabel="Vacancies"
        visual={{ kind: "icon", icon: <Briefcase aria-hidden="true" /> }}
        title={v.title}
        status={<VacancyStatusPill status={v.status} />}
        line={`${v.department} · ${v.client.name}${v.outlet ? `, ${v.outlet.name}` : ""}`}
        actions={
          <>
            <PhoneAction href={vacancyApplicantsHref(v.id)} label="Applicants" />
            {v.canEdit ? <PhoneAction href={vacancyEditHref(v.id)} label="Edit" icon={<Pencil className="size-4" aria-hidden="true" />} /> : null}
          </>
        }
        menu={
          phoneMenu.length > 0 ? (
            <ActionsMenu quiet alignEnd label={`More actions for ${v.title}`} disabled={actions.busy} triggerClassName={COVER_ROUND} items={phoneMenu.map((a) => ({ label: ACTION_LABEL[a], tone: a === "cancel" || a === "close" ? ("danger" as const) : ("default" as const), onSelect: () => actions.start(target, a) }))} />
          ) : null
        }
      />
      <PhoneFacts
        title="Vacancy"
        rows={[
          { label: "Recruiter", value: v.recruiter?.name ?? "Unassigned" },
          { label: "Openings", value: String(v.openings) },
          { label: "Location", value: v.location },
          { label: "Type", value: v.employmentType },
          { label: "Posted", value: postedText(v) },
          { label: "Closing", value: closesText(v) },
        ]}
      />
      {phonePrimary ? (
        <PhoneStickyAction>
          <button type="button" disabled={actions.busy} onClick={() => actions.start(target, phonePrimary)} className={PD_CTA}>
            {ACTION_LABEL[phonePrimary]}
          </button>
        </PhoneStickyAction>
      ) : null}
      <header className="ap-card mb-4 rounded-[20px] p-5 max-[767px]:hidden min-[768px]:p-6">
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="min-w-0">
            <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{v.title}</h1>
            <p className="mt-1 text-[13px] break-all text-(--ap-muted)">{v.reference}</p>
            <p className="mt-2 text-[15px] leading-snug break-words">
              {v.department} · <b>{v.client.name}</b>
              {v.outlet ? `, ${v.outlet.name}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
              <VacancyStatusChip status={v.status} />
              <span>Recruiter: {v.recruiter?.name ?? "Unassigned"}</span>
              <span>{postedText(v)}</span>
              <span>{closesText(v)}</span>
            </div>
            {v.status === "pending-approval" ? <p className="mt-3 text-[14px] text-(--ap-muted)">Waiting for approval. It is not visible to applicants yet. Who approves a vacancy needs Beeliv confirmation.</p> : null}
          </div>
          <div className={`flex flex-wrap items-center gap-2.5 max-[600px]:flex-col max-[600px]:items-stretch min-[1100px]:max-w-[460px] min-[1100px]:justify-end`}>
            {v.canEdit || primary.length > 0 || secondary.length > 0 ? <span data-admin-detail="" hidden /> : null}
            {v.canEdit ? (
              <Link href={vacancyEditHref(v.id)} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                <Pencil className="size-4" aria-hidden="true" /> Edit
              </Link>
            ) : null}
            {primary.map((a) => (
              <button key={a} type="button" disabled={actions.busy} onClick={() => actions.start(target, a)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
                {ACTION_LABEL[a]}
              </button>
            ))}
            {secondary.length > 0 ? <RowMenu label={`More actions for ${v.title}`} items={secondary.map((a) => ({ label: ACTION_LABEL[a], tone: a === "cancel" || a === "close" ? ("danger" as const) : ("default" as const), onSelect: () => actions.start(target, a) }))} /> : null}
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

      <PhoneMore title="More details">
      <div className="@container">
        <div className="mb-4">
          <div role="tablist" aria-label="Vacancy sections" className="hidden flex-wrap gap-1 rounded-xl border border-(--ap-line) bg-(--ap-surface) p-1 min-[768px]:flex">
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
            <FilterDropdown label="Vacancy section" prefix="Section" options={TABS.map((t) => ({ key: t.key, label: t.label }))} current={TABS.find((t) => t.key === tab) ?? TABS[0]} onChange={setTab} />
          </div>
        </div>
        <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`} className="flex flex-col gap-4">
          {panel}
        </div>
      </div>
      </PhoneMore>

      {actions.dialog}
    </div>
  );
}

function Back() {
  return (
    <Link href="/admin/recruitment/vacancies" className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Vacancies
    </Link>
  );
}

/* ---------- panels ---------- */

function OverviewPanel({ v }: { v: VacancyDetail }) {
  const internal = v.salary.visibility === "internal";
  return (
    <>
      <Section title="Job summary">
        <div className="@container">
          <Facts
            items={[
              { label: "Department", value: v.department },
              { label: "Client / outlet", value: `${v.client.name}${v.outlet ? `, ${v.outlet.name}` : ""}` },
              { label: "Location", value: v.location },
              { label: "Employment type", value: v.employmentType },
              { label: "Openings", value: v.openings },
              { label: "Recruiter", value: v.recruiter?.name ?? "Unassigned" },
              { label: "Closing date", value: formatYmd(v.closesOn) },
              { label: "Expected resumption", value: v.expectedResumption ? formatYmd(v.expectedResumption) : "Not set" },
              ...(v.testFormId ? [{ label: "Test", value: getAdminForm(v.testFormId)?.title ?? "Attached test" }] : []),
              { label: "Interview method", value: v.interview.method || "Not set" },
              { label: "Interview location", value: v.interview.location || "Not set" },
              {
                label: "Salary",
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{internalSalaryText(v.salary)}</span>
                    <Chip tone={internal ? "warn" : "ok"}>{internal ? "Internal only" : "Public"}</Chip>
                  </span>
                ),
              },
              { label: "Shown to applicants as", value: publicSalaryText(v.salary) },
            ]}
          />
          {internal ? <p className="mt-3 text-[13px] text-(--ap-muted)">Salary is internal only, so applicants see &ldquo;{COMPETITIVE_PAY}&rdquo;.</p> : null}
        </div>
      </Section>

      <ApplicantPreview v={v} />

      <Section title="About the role">
        <p className="max-w-[80ch] text-[15px] leading-[1.6] break-words text-(--ap-ink-2)">{v.about || "Nothing added."}</p>
      </Section>
      <Section title="Key responsibilities">
        <BulletList items={v.responsibilities} />
      </Section>
      <Section title="Working conditions">
        <div className="@container">
          <Facts
            items={[
              { label: "Working days", value: v.conditions.workingDays || "Not set" },
              { label: "Shift system", value: v.conditions.shiftSystem || "Not set" },
              { label: "Hours", value: v.conditions.hours || "Not set" },
              { label: "Weekends", value: v.conditions.weekends || "Not set" },
              { label: "Public holidays", value: v.conditions.publicHolidays || "Not set" },
            ]}
          />
        </div>
      </Section>
      <Section title="Benefits">
        {v.benefits.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">No benefits listed.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {v.benefits.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                <b>{b.kind}</b>
                <span className="text-(--ap-ink-2)">{b.detail}</span>
                <Chip tone={b.visibility === "public" ? "ok" : "warn"}>{b.visibility === "public" ? "Public" : "Internal only"}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Journey">
        <JourneyReadout journey={v.journey} />
        <p className="mt-3 text-[13px] text-(--ap-muted)">This job keeps its own copy of the journey. Editing a template does not change it.</p>
      </Section>
      <Section title="Recruitment process shown to applicants">
        <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
          {v.recruitmentProcess.map((s, i) => (
            <li key={`${i}-${s}`} className="inline-flex h-8 items-center rounded-full bg-(--ap-tint) px-3 text-[13px] font-semibold text-(--ap-violet)">
              {i + 1}. {s}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] text-(--ap-muted)">Built from the journey above. This applicant-friendly summary differs from the locked 8-stage workflow. Which wording applies is an open question with the project lead.</p>
      </Section>
    </>
  );
}

function RequirementsPanel({ v }: { v: VacancyDetail }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <Section title="Essential requirements">
          <BulletList items={v.essential} />
        </Section>
        <Section title="Preferred requirements">
          <BulletList items={v.preferred} />
          <p className="mt-3 text-[13px] text-(--ap-muted)">Nice to have. HR does not reject for a missing preferred item.</p>
        </Section>
      </div>
      <Section title="Experience">
        <p className="text-[15px] text-(--ap-ink-2)">
          {v.experience.summary || "Not set"} ({v.experience.minYears}
          {v.experience.maxYears ? `-${v.experience.maxYears}` : "+"} years)
        </p>
      </Section>
      <Section title="Skills">
        {v.skills.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">No skills listed.</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {v.skills.map((s) => (
              <li key={s} className="inline-flex h-7 items-center rounded-full bg-(--ap-line-2) px-3 text-[13px] font-semibold text-(--ap-ink-2)">
                {s}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
        <Section title="Documents required to apply">
          <BulletList items={v.requiredDocuments.atApplication} />
        </Section>
        <Section title="Documents required after selection">
          <BulletList items={v.requiredDocuments.afterSelection} />
        </Section>
      </div>
    </>
  );
}

function ScreeningPanel({ v }: { v: VacancyDetail }) {
  return (
    <Section title="Screening questions">
      {v.screeningQuestions.length === 0 ? (
        <EmptyState icon={Briefcase} title="No screening questions" description="Add questions in the vacancy form. Answers are stored with each application." />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {v.screeningQuestions.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[15px]">
              <span className="font-bold">{i + 1}.</span>
              <span className="min-w-0 flex-1 break-words">{q.text}</span>
              <Chip tone="mute">{q.answerType === "yes-no" ? "Yes / No" : "Short answer"}</Chip>
              <Chip tone={q.required ? "warn" : "mute"}>{q.required ? "Required" : "Optional"}</Chip>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

function ApplicantsPanel({ v }: { v: VacancyDetail }) {
  const counts = v.countsReady === false ? null : v.counts;
  const stats: [string, number | null][] = [
    ["Applications", counts?.applications ?? null],
    ["Shortlisted", counts?.shortlisted ?? null],
    ["Interviewed", counts?.interviewed ?? null],
    ["Placed", counts?.placed ?? null],
  ];
  return (
    <Section
      title="Applicants"
      right={
        <Link href={vacancyApplicantsHref(v.id)} className="ap-btn ap-btn-s ap-btn-sm">
          View applicants
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-xl bg-(--ap-tint-soft) p-4">
            <dd className="ap-serif text-[18px] tabular-nums">{n ?? "Unavailable"}</dd>
            <dt className="text-[13px] text-(--ap-muted)">{label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] text-(--ap-muted)">{counts ? "Counts only. Open the applicants list to review people." : "Applicant counts will appear when reporting is available."}</p>
    </Section>
  );
}

function DetailSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading vacancy">
      <h1 className="sr-only">Vacancy</h1>
      <div className={`${sk} mb-3 h-6 w-28`} />
      <div className={`${sk} mb-4 h-[170px] w-full`} />
      <div className={`${sk} mb-4 h-11 w-full`} />
      <div className={`${sk} h-[260px] w-full`} />
    </div>
  );
}

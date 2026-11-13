"use client";

/**
 * My Applications — wireframe appsPage() (beeliv-website/applicant/index.html).
 * Tabs All / Draft / Active / Completed with live counts; one `.acard` per
 * application; genuine empty states per tab ("new" prototype mode = none).
 */
import Link from "next/link";
import { useState } from "react";
import { DraftProgress } from "./CountUp";
import { BriefcaseBusiness, CircleAlert, Clock3, FilePenLine, FileText, MapPin, Search, Users } from "@/components/applicant/icons";
import { useApplicantStore } from "@/lib/applicant/service";
import { APPLICATION_STAGES, type Application, type ApplicantDocument, type Interview } from "@/lib/applicant/types";
import { PremiumRing } from "@/components/shared/premium";
import { NotchCard } from "@/components/shared/premium/NotchCard";
import { Chip, EmptyState } from "./primitives";
import { applicationStatus, CoMonogram, isTerminal, ScreenHeading, TabBar, updatedLine } from "./applications/shared";
import { Reveal } from "./motion";
import { markClass } from "./mark";
import { UnderReviewBadge } from "./UnderReviewBadge";
import { nextStepLine, StatusDot } from "./applications/next-step";
import { stageColor } from "@/lib/applicant/stage-tone";

type TabKey = "all" | "draft" | "active" | "completed";

function tabGroup(app: Application): Exclude<TabKey, "all"> {
  if (app.lifecycle === "draft") return "draft";
  if (app.lifecycle === "submitted") return "active";
  return "completed"; // withdrawn / not_selected / in_talent_pool / completed
}

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const EMPTY_COPY: Record<TabKey, { title: string; description: string }> = {
  all: { title: "No applications yet", description: "Find a role that matches your experience and start your application." },
  draft: { title: "Nothing in this list", description: "Applications you start but haven't submitted yet are kept here." },
  active: { title: "Nothing in this list", description: "Submitted applications move here while Beeliv is working on them." },
  completed: { title: "Nothing in this list", description: "Closed applications stay here, including ones kept in the talent pool." },
};

export function ApplicationsBody() {
  const store = useApplicantStore();
  const [tab, setTab] = useState<TabKey>("all");
  const apps = store.applications;
  const groups: Record<TabKey, Application[]> = {
    all: apps,
    draft: apps.filter((a) => tabGroup(a) === "draft"),
    active: apps.filter((a) => tabGroup(a) === "active"),
    completed: apps.filter((a) => tabGroup(a) === "completed"),
  };
  const list = groups[tab];
  // Phones: only ONE filled button per screen, on the first application that is waiting on the applicant.
  // Calm: only the first Under review badge on the screen animates.
  const reviewId = list.find((x) => applicationStatus(x, store.interviews).label === "Under review")?.id;
  const leadId = list.find((x) => x.lifecycle === "draft" || x.next)?.id;

  return (
    <div>
      <ScreenHeading title="My Applications" subtitle="Every application you start or submit. Closed ones stay here too." />

      <div className="mb-4.5">
        <TabBar
          label="Filter applications"
          tabs={TAB_LABELS.map((t) => ({ ...t, count: groups[t.key].length }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {list.length === 0 ? (
        <div className="ap-card p-6 max-[767px]:px-4.5 max-[767px]:py-5">
          <EmptyState
            glass="applications"
            icon={FileText}
            title={EMPTY_COPY[tab].title}
            description={EMPTY_COPY[tab].description}
            action={
              <Link href="/applicant/jobs" className="ap-btn ap-btn-p ap-btn-hero mt-1.5">
                <Search className="size-4.5" aria-hidden="true" />
                Browse jobs
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 min-[1100px]:grid min-[1100px]:grid-cols-2 min-[1100px]:items-stretch min-[1100px]:gap-5">
          {list.map((a) => (
            <ApplicationCard key={a.id} application={a} interviews={store.interviews} documents={store.documents} lead={a.id === leadId} animateReview={a.id === reviewId} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ application: a, interviews, documents, lead, animateReview }: { application: Application; interviews: Interview[]; documents: ApplicantDocument[]; lead: boolean; animateReview: boolean }) {
  const { label, tone } = applicationStatus(a, interviews);
  const isDraft = a.lifecycle === "draft";
  const closed = isTerminal(a);
  const pct = Math.max(0, Math.min(100, a.draftPercent ?? 0));

  // Filled button only when the application is waiting on the applicant; others get the quiet outlined row action (hierarchy review B4).
  const cta = isDraft ? (
    <Link href={a.vacancyId ? `/applicant/apply?job=${a.vacancyId}` : "/applicant/apply"} className={lead ? "ap-btn ap-btn-p ap-btn-hero" : "ap-btn ap-btn-o"}>
      {lead ? <FilePenLine className="size-4.5" aria-hidden="true" /> : null}
      Continue application
    </Link>
  ) : (
    <Link href={`/applicant/applications/${a.id}`} className={lead ? "ap-btn ap-btn-p ap-btn-hero" : "ap-btn ap-btn-o"}>
      {closed ? "View details" : "View progress"}
    </Link>
  );

  // Phones: stacked like a job-board card (status first, then role, company, place, a muted line, full-width action).
  // Desktop keeps the row layout below.
  return (
    <>
      <Reveal as="div" className="min-[768px]:hidden">
      <NotchCard
        as="article"
        tone={a.lifecycle === "submitted" ? "lavender" : "plain"}
        bodyClassName="p-4"
        badge={
          a.lifecycle === "submitted" ? (
            <PremiumRing value={(a.stage + 1) / APPLICATION_STAGES.length} size={50} stroke={5} arc={stageColor(a)} label={`Step ${a.stage + 1} of ${APPLICATION_STAGES.length}`}>
              <span className="text-[13px] leading-none font-bold text-(--ap-ink)">{a.stage + 1}/{APPLICATION_STAGES.length}</span>
            </PremiumRing>
          ) : undefined
        }
      >
        {/* Phone card: the next step first (wraps around the notch ring), then which role, then status as a dot and a word, then one action. */}
        <b className="block text-[18px] leading-snug">{nextStepLine(a, interviews, documents)}</b>
        <p className="mt-1.5 text-[16px] text-(--ap-ink-2)">
          {a.role} · {a.company}
        </p>
        <p className="text-[15px] text-(--ap-muted)">
          {a.location} · {a.employmentType}
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusDot tone={tone} color={a.lifecycle === "submitted" ? stageColor(a) : undefined} animate={animateReview}>{label}</StatusDot>
          <span className="text-[14px] whitespace-nowrap text-(--ap-muted)">{updatedLine(a)}</span>
        </p>
        {isDraft ? (
          <div className="mt-3">
            <DraftProgress value={pct} />
          </div>
        ) : null}
        <div className="mt-4 [&>a]:w-full">{cta}</div>
      </NotchCard>
      </Reveal>
    {/* Desktop: the phone card's language (next step first, status dot and word, step ring), composed for width: monogram, role, a segmented stage bar and one action. */}
    <Reveal as="article" className="flex flex-col rounded-[22px] border border-(--ap-line) bg-white p-5 transition-shadow hover:shadow-[0_10px_28px_rgba(42,11,71,.08)] max-[767px]:hidden">
      <div className="flex items-start gap-4">
        <CoMonogram name={a.company} fontSize={17} className="size-14" />
        <div className="min-w-0 flex-1">
          <b className="block text-[18px] leading-snug">{nextStepLine(a, interviews, documents)}</b>
          <p className="mt-1 text-[15px] text-(--ap-ink-2)">
            {a.role} · {a.company}
          </p>
          <p className="text-[14px] text-(--ap-muted)">
            {a.location} · {a.employmentType}
          </p>
        </div>
        {a.lifecycle === "submitted" ? (
          <PremiumRing value={(a.stage + 1) / APPLICATION_STAGES.length} size={56} stroke={5} arc={stageColor(a)} label={`Step ${a.stage + 1} of ${APPLICATION_STAGES.length}`}>
            <span className="text-[13px] leading-none font-bold text-(--ap-ink)">{a.stage + 1}/{APPLICATION_STAGES.length}</span>
          </PremiumRing>
        ) : null}
      </div>
      <p className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusDot tone={tone} color={a.lifecycle === "submitted" ? stageColor(a) : undefined} animate={animateReview}>{label}</StatusDot>
        <span className="text-[14px] whitespace-nowrap text-(--ap-muted)">{updatedLine(a)}</span>
      </p>
      {isDraft ? (
        <div className="mt-3">
          <DraftProgress value={pct} />
        </div>
      ) : a.lifecycle === "submitted" ? (
        <div className="mt-3 flex gap-1" role="img" aria-label={`Stage ${a.stage + 1} of ${APPLICATION_STAGES.length}: ${APPLICATION_STAGES[a.stage]}`}>
          {APPLICATION_STAGES.map((st, i) => (
            <i key={st} className={`h-1.5 flex-1 rounded-full ${i <= a.stage ? "" : "bg-(--ap-line)"}`} style={i <= a.stage ? { backgroundColor: stageColor(a) } : undefined} />
          ))}
        </div>
      ) : null}
      <div className="mt-auto pt-4">{cta}</div>
    </Reveal>
    </>
  );
}

"use client";

/**
 * Application detail — wireframe appPage() (beeliv-website/applicant/index.html).
 * .crumb back link; header card (monogram, role, meta, status chip, .nxt
 * next-action block); .two layout: left = answers (.kv2), interviews,
 * documents; right = .vtl progress (the 8 CONFIRMED recruitment stages, with
 * the wireframe's per-stage sublabels), activity feed, help card.
 * Drafts have no tracker yet, so they go straight back into the apply flow.
 */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CircleAlert,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Users,
  Video,
} from "@/components/applicant/icons";
import { useApplicantStore } from "@/lib/applicant/service";
import { questionsForJob, testFormIdForJob } from "@/lib/journeys/applicant";
import { useDraft } from "@/components/applicant/tests/taker";
import { answeredCount, readScreeningAnswers } from "@/lib/applicant/screening";
import { SERVICE_AUDIT_CTA } from "@/lib/public-site/business-content";
import { APPLICATION_STAGES, type Application, type ApplicantDocument } from "@/lib/applicant/types";
import { stageColor } from "@/lib/applicant/stage-tone";
import { Chip, EmptyState } from "./primitives";
import { NextActionIcon } from "./next-action";
import { Reveal } from "./motion";
import { markClass } from "./mark";
import { UnderReviewBadge } from "./UnderReviewBadge";
import { CARD } from "./SectionCard";
import { interviewView } from "@/lib/applicant/interview-state";
import { useInterviewRequests } from "@/lib/bridge/interview-requests";
import { documentIcon, documentStatus } from "./document-meta";
import { INTERVIEW_KIND_ICON, INTERVIEW_KIND_LABEL } from "./InterviewsBody";
import {
  applicationStatus,
  CardHeading,
  CoMonogram,
  dayDiff,
  dueIn,
  fmtActivity,
  fmtDay,
  fmtDayShort,
  fmtWeekdayDay,
  interviewDateLong,
  interviewDayLabel,
  interviewTimeRange,
  RowIcon,
} from "./applications/shared";

const WEEKDAY_LEAD = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b[.,]?\s*/;

export function ApplicationDetailBody({ applicationId }: { applicationId: string }) {
  const store = useApplicantStore();
  const ivRequests = useInterviewRequests();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const a = store.applications.find((app) => app.id === applicationId);
  // The test this role carries (if any), taken inside the application. Status only, never marks.
  const testId = a ? testFormIdForJob({ id: a.vacancyId, role: a.role }) : undefined;
  const testDraft = useDraft(`${store.profile.id}:apply-${a?.vacancyId ?? ""}`, testId ?? "none").draft;
  const testStatus = testDraft.submittedAt ? "Submitted" : "Not started";

  // A draft has no tracker/activity to show — it belongs in the apply flow.
  useEffect(() => {
    if (a && a.lifecycle === "draft") {
      router.replace(a.vacancyId ? `/applicant/apply?job=${a.vacancyId}` : "/applicant/apply");
    }
  }, [a, router]);

  if (!a) {
    return (
      <div>
        <BackCrumb />
        <div className={CARD}>
          <EmptyState
            icon={Search}
            title="Application not found"
            description="Open My Applications to find your current records."
            action={
              <Link href="/applicant/applications" className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
                Back to My Applications
              </Link>
            }
          />
        </div>
      </div>
    );
  }
  if (a.lifecycle === "draft") return null; // redirecting

  const { label, tone } = applicationStatus(a, store.interviews);
  const interviews = store.interviews.filter((v) => v.applicationId === a.id);
  const upcoming = interviews.filter((v) => v.status === "scheduled");
  const completed = interviews.filter((v) => v.status === "completed");
  const cancelledIv = interviews.filter((v) => v.status === "cancelled");
  const requested = store.documents.filter((d) => d.forApplicationId === a.id);
  const reused = store.documents.filter((d) => d.category === "application" && d.usedInApplicationIds.includes(a.id));
  const inPool = a.lifecycle === "in_talent_pool";
  // Documents HR has sent back: shown as a short "To do" line above the list.
  const docTodos = [...requested, ...reused].filter((d) => d.status === "action-required" && d.resubmission);

  // Due date for the next action: the earliest outstanding requested document.
  const dueDoc = requested
    .filter((d) => d.status === "action-required" && d.due)
    .sort((x, y) => (x.due! < y.due! ? -1 : 1))[0];
  const nextIsInterview = a.next?.href.includes("/interviews") ?? false;
  const nextIv = nextIsInterview ? upcoming[0] : undefined;

  // Seed detail strings lead with a bare weekday ("Saturday. Beeliv needs…");
  // show the full date the wireframe shows instead ("Due Sat, 3 Oct 2026. …").
  let nextDetail = a.next?.detail ?? "";
  if (WEEKDAY_LEAD.test(nextDetail)) {
    if (dueDoc?.due) nextDetail = nextDetail.replace(WEEKDAY_LEAD, `Due ${fmtWeekdayDay(dueDoc.due)}. `);
    else if (nextIv?.scheduledAt) nextDetail = nextDetail.replace(WEEKDAY_LEAD, `${interviewDateLong(nextIv.scheduledAt)} · `).replace(/·\s*·/, "·");
  }

  // Per-role screening questions (lib/applicant/screening.ts); the role title picks the set.
  const screeningQs = questionsForJob({ id: a.vacancyId, role: a.role });
  const answered = answeredCount(screeningQs, readScreeningAnswers(a.form, screeningQs));
  const yes = (v: string) => v.toLowerCase();
  const answers: [string, string][] = [
    ["Hospitality experience", a.form.yearsExperience || "Not provided"],
    ["Expected salary", a.form.expectedSalary || "Not provided"],
    ["Earliest start", formatStart(a.form.earliestStart)],
    ["Preferred location", a.form.preferredLocation || "Not provided"],
    ["Shifts, weekends, holidays", `${a.form.willingShifts}, ${yes(a.form.willingWeekends)}, ${yes(a.form.willingHolidays)}`],
    ["Screening questions", `${answered} of ${screeningQs.length} answered`],
    ...(testId ? ([["Test", testStatus]] as [string, string][]) : []),
  ];
  const skills = Object.values(a.form.skills ?? {}).flat();
  const moreAnswers: [string, string][] = [
    ["Availability", a.form.availability || "Not provided"],
    ["Sectors worked in", a.form.sectors.length ? a.form.sectors.join(", ") : "Not provided"],
    ["Key skills", skills.length ? skills.join(", ") : "Not provided"],
    ["Role certificate", a.form.roleCertificateFileName ?? "Not attached"],
    ["Phone", a.form.phone || "Not provided"],
    ["Email", a.form.email || "Not provided"],
  ];

  return (
    <div>
      <BackCrumb />

      {/* Header card */}
      {/* Phones: stacked like a job-board card (status, role, company, place, muted line, one solid action). */}
      <Reveal as="section" className="mb-5 rounded-[20px] border border-(--ap-line) bg-white p-4 min-[768px]:hidden">
        {label === "Under review" ? <UnderReviewBadge size="md" /> : <Chip tone={tone}>{label}</Chip>}
        <h1 className="mt-3 text-[20px] leading-snug font-medium">{a.role}</h1>
        <p className="mt-1 text-[16px] text-(--ap-ink-2)">{a.company}</p>
        <p className="text-[16px] text-(--ap-ink-2)">{a.location}</p>
        <p className="mt-2.5 text-[15px] text-(--ap-muted)">
          {a.submittedAt ? `Applied ${fmtDay(a.submittedAt)} · ` : ""}
          {a.employmentType}
        </p>
        {a.next ? (
          <>
            <p className="mt-3 flex items-start gap-2 text-[15px] text-(--ap-ink-2)">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-(--ap-warn)" strokeWidth={1.8} aria-hidden="true" />
              <span className={markClass(a.next.tone)}>{a.next.label}</span>
            </p>
            <Link href={a.next.href} className="ap-btn ap-btn-p ap-btn-hero mt-4 w-full min-[768px]:w-max min-[768px]:min-w-[300px]">
              <NextActionIcon href={a.next.href} className="size-4.5" />
              {a.next.ctaLabel}
            </Link>
          </>
        ) : (
          <p className="mt-3 text-[15px] text-(--ap-muted)">{inPool ? <span className="ap-mark ap-mark-violet">This role was filled. You&apos;re in the talent pool for similar roles.</span> : a.lifecycle === "withdrawn" ? "This application is closed." : a.lifecycle === "not_selected" ? "This application wasn't selected to proceed at this time." : a.lifecycle === "completed" ? "This application is complete." : "Nothing needed from you. Beeliv is reviewing your application."}</p>
        )}
      </Reveal>

      <Reveal as="section" className={`${CARD} mb-5 max-[767px]:hidden`}>
        <div className="flex items-start gap-4 max-[640px]:grid max-[640px]:grid-cols-[auto_minmax(0,1fr)] max-[640px]:gap-x-3.5 max-[640px]:gap-y-2.5">
          <CoMonogram name={a.company} fontSize={23} className="size-16 max-[767px]:size-13 max-[767px]:text-[19px]!" />
          <div className="min-w-0 flex-1">
            <h1 className="ap-serif block text-2xl">{a.role}</h1>
            <div className="ap-sm mt-1 flex flex-wrap gap-x-4.5 gap-y-1 text-(--ap-ink-2) max-[767px]:gap-x-3">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <BriefcaseBusiness className="size-4.25 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" /> {a.company}
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MapPin className="size-4.25 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" /> {a.location}
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Clock3 className="size-4.25 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" /> {a.employmentType}
              </span>
              {a.submittedAt ? <span className="whitespace-nowrap">Applied {fmtDay(a.submittedAt)}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-3.5 max-[640px]:col-start-2 max-[640px]:justify-self-start">
            <span className="flex flex-col items-end gap-1 max-[640px]:items-start">
              {label === "Under review" ? <UnderReviewBadge size="md" /> : <Chip tone={tone}>{label}</Chip>}
            </span>
            {/* Stage ring: filled arc = how far along the 8 recruitment stages. */}
            <span className="relative flex size-[64px] shrink-0 items-center justify-center max-[640px]:hidden" role="img" aria-label={`Stage ${a.stage + 1} of ${APPLICATION_STAGES.length}`}>
              <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                <circle cx="32" cy="32" r="27" fill="none" stroke="var(--ap-line)" strokeWidth="5" />
                <circle cx="32" cy="32" r="27" fill="none" stroke={stageColor(a)} strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.round(((a.stage + 1) / APPLICATION_STAGES.length) * 100)} 100`} />
              </svg>
              <span className="text-center text-[13px] leading-none font-bold text-(--ap-ink) tabular-nums" aria-hidden="true">
                {a.stage + 1}
                <small className="block pt-0.5 text-[11px] font-semibold text-(--ap-muted)">of {APPLICATION_STAGES.length}</small>
              </span>
            </span>
          </div>
        </div>

        {a.next ? (
          <div className="mt-5.5 flex flex-wrap items-center gap-4 rounded-[14px] bg-linear-to-r from-(--ap-tint) to-[#fbf8fd] px-5 py-4.5 max-[767px]:gap-3 max-[767px]:p-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white text-(--ap-violet) max-[767px]:size-10.5 [&_svg_:is(path,rect,circle)]:fill-current [&_svg_:is(path,rect,circle)]:[fill-opacity:.16]">
              <NextActionIcon href={a.next.href} className="size-5.5" strokeWidth={1.6} />
            </span>
            <div className="min-w-[220px] flex-1 max-[640px]:min-w-0">
              <small className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-(--ap-violet)">
                Next action
                {dueDoc?.due ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold ${dayDiff(dueDoc.due) < 0 ? "bg-(--ap-rose-bg) text-(--ap-rose)" : "bg-(--ap-warn-bg) text-(--ap-warn)"}`}>
                    <Clock3 className="size-3.25" aria-hidden="true" />
                    {dueIn(dueDoc.due)}
                  </span>
                ) : nextIv?.scheduledAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-(--ap-ok-bg) px-2 py-0.5 text-[13px] font-semibold text-(--ap-ok)">
                    <Calendar className="size-3.25" aria-hidden="true" />
                    {dayDiff(nextIv.scheduledAt) <= 0 ? "Today" : dayDiff(nextIv.scheduledAt) === 1 ? "Tomorrow" : `In ${dayDiff(nextIv.scheduledAt)} days`}
                  </span>
                ) : null}
              </small>
              <b className="mt-px block text-base">{a.next.label}</b>
              {nextDetail ? <p className="ap-bd mt-0.5 max-[767px]:hidden">{nextDetail}</p> : null}
            </div>
            <Link href={a.next.href} className="ap-btn ap-btn-p ap-btn-hero max-[640px]:w-full">
              <NextActionIcon href={a.next.href} className="size-4.5" />
              {a.next.ctaLabel}
            </Link>
          </div>
        ) : (
          <div className="mt-4.5 flex items-start gap-2.5 rounded-xl bg-(--ap-tint) px-3.5 py-3 ap-bd text-(--ap-ink-2)">
            {inPool || a.lifecycle === "withdrawn" ? (
              <Users className="mt-1 size-4.5 shrink-0 text-(--ap-violet)" strokeWidth={1.6} aria-hidden="true" />
            ) : a.lifecycle === "completed" ? (
              <Check className="mt-1 size-4.5 shrink-0 text-(--ap-violet)" strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Clock3 className="mt-1 size-4.5 shrink-0 text-(--ap-violet)" strokeWidth={1.6} aria-hidden="true" />
            )}
            <span>
              {/* Closed lifecycles get their own note (spec §1 exit statuses) —
                  only a live, submitted application is "being reviewed". */}
              {inPool
                ? <span className="ap-mark ap-mark-violet">This role was filled. You&apos;re in the talent pool, so Beeliv can suggest you for similar roles.</span>
                : a.lifecycle === "withdrawn"
                  ? "This application is closed. Your profile stays in the Beeliv talent pool, so you can still be considered for other roles."
                  : a.lifecycle === "not_selected"
                    ? "This application wasn't selected to proceed at this time."
                    : a.lifecycle === "completed"
                      ? "This application is complete. Nothing more is needed from you here."
                      : "Nothing needed from you. The Beeliv team is reviewing your application and will update you here."}
            </span>
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 items-start gap-5 min-[1241px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Answers */}
          <Reveal as="section" className={CARD}>
            <CardHeading
              title="Application details"
              right={
                <button
                  type="button"
                  onClick={() => setShowAll((s) => !s)}
                  aria-expanded={showAll}
                  className="ap-hit shrink-0 text-sm font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)"
                >
                  {showAll ? "Show less" : "View full application"}
                </button>
              }
            />
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 max-[640px]:grid-cols-1">
              {(showAll ? [...answers, ...moreAnswers] : answers).map(([k, v]) => (
                <div key={k} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-sm font-semibold text-(--ap-muted)">{k}</dt>
                  <dd className="m-0 text-base font-semibold [overflow-wrap:anywhere]">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* Interviews & assessments */}
          <Reveal as="section" className={CARD}>
            <CardHeading title="Interviews & assessments" />
            {upcoming.length || completed.length || cancelledIv.length ? (
              <div>
                {upcoming.map((v) => (
                  <Row
                    key={v.id}
                    icon={<RowIcon icon={INTERVIEW_KIND_ICON[v.kind] ?? Video} />}
                    title={v.title}
                    sub={
                      v.scheduledAt
                        ? `${INTERVIEW_KIND_LABEL[v.kind] ?? v.kind} · ${interviewDayLabel(v.scheduledAt)} · ${interviewTimeRange(v.scheduledAt, v.durationMinutes)}`
                        : (INTERVIEW_KIND_LABEL[v.kind] ?? v.kind)
                    }
                    right={
                      interviewView(v, ivRequests).kind === "waiting" ? (
                        <Chip tone="warn">New time requested</Chip>
                      ) : (
                        <Link href="/applicant/interviews" className="ap-btn ap-btn-l ap-btn-sm">
                          View
                        </Link>
                      )
                    }
                  />
                ))}
                {cancelledIv.map((v) => (
                  <Row
                    key={v.id}
                    icon={<RowIcon icon={INTERVIEW_KIND_ICON[v.kind] ?? Video} />}
                    title={v.title}
                    sub={`${INTERVIEW_KIND_LABEL[v.kind] ?? v.kind} · We will contact you if another interview is needed`}
                    right={<Chip tone="mute">Cancelled by Beeliv</Chip>}
                  />
                ))}
                {completed.map((v) => (
                  <Row
                    key={v.id}
                    icon={<RowIcon icon={Check} tone="ok" />}
                    title={v.title}
                    sub={`${INTERVIEW_KIND_LABEL[v.kind] ?? v.kind} · ${v.completedAt ? fmtDay(v.completedAt) : ""}`}
                    right={<Chip tone="ok">Completed</Chip>}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Calendar} title="None yet" description="If you're shortlisted, interview and assessment details appear here." />
            )}
          </Reveal>

          {/* Documents */}
          {requested.length || reused.length ? (
            <Reveal as="section" className={CARD}>
              <CardHeading
                title="Documents for this application"
                right={
                  <Link href="/applicant/documents" className="ap-hit shrink-0 text-[13px] font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum)">
                    Manage
                  </Link>
                }
              />
              {docTodos.length ? (
                <ul className="m-0 mb-3.5 flex list-none flex-col gap-1 p-0" aria-label="To do">
                  {docTodos.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/applicant/documents#doc-${d.id}`}
                        className="flex min-h-11 items-center gap-2.5 rounded-xl bg-[#FFFBEB] px-3.5 py-2 text-[15px] text-(--ap-ink)! hover:bg-[#FEF3C7]"
                      >
                        <span className="text-[13px] font-semibold text-(--ap-muted)">To do</span>
                        <span className="min-w-0 flex-1">Upload your {d.name.toLowerCase()} again</span>
                        <ChevronRight className="size-4.5 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-col gap-2.5">
                {[...requested, ...reused].map((d) => (
                  <DocRow key={d.id} doc={d} />
                ))}
              </div>
            </Reveal>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {/* Progress — confirmed 8 stages */}
          <Reveal as="section" className={CARD}>
            <CardHeading title="Progress" aside />
            <StageTimeline app={a} />
          </Reveal>

          {/* Activity */}
          <Reveal as="section" className={CARD}>
            <CardHeading title="Activity" aside />
            <div>
              {a.activity.map((x, i) => (
                <div key={`${x.title}-${i}`} className="flex gap-3 border-t border-(--ap-line-2) py-3">
                  <span className="mt-1.75 size-2 shrink-0 rounded-full bg-(--ap-violet)" aria-hidden="true" />
                  <div className="min-w-0">
                    <b className="block text-sm">{x.title}</b>
                    <span className="text-[13px] text-(--ap-muted)">
                      {x.detail ? `${x.detail} · ` : ""}
                      <time dateTime={x.when}>{fmtActivity(x.when)}</time>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Help */}
          <Reveal as="section" className={`${CARD} bg-linear-to-b from-white to-[#fbf8fd]`}>
            <div className="flex items-start gap-3.5">
              <RowIcon icon={MessageSquareText} />
              <div className="min-w-0">
                <b className="block text-base">Questions about this application?</b>
                <p className="ap-sm mt-1">The Beeliv recruitment team can help with dates, documents or anything on this page.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a href={SERVICE_AUDIT_CTA.phoneHref} className="ap-btn ap-btn-l ap-btn-sm flex-1">
                <Phone className="size-4" aria-hidden="true" /> Call Beeliv
              </a>
              <Link href="/contact" className="ap-btn ap-btn-s ap-btn-sm flex-1">
                Contact page
              </Link>
            </div>
            <p className="mt-2.5 text-[13px] text-(--ap-muted)">{SERVICE_AUDIT_CTA.phone}</p>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

function BackCrumb() {
  return (
    <Link
      href="/applicant/applications"
      className="mb-1.5 inline-flex items-center gap-1.5 py-1 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[1100px]:min-h-11 max-[1100px]:py-0"
    >
      <ChevronLeft className="size-3.75" aria-hidden="true" />
      My Applications
    </Link>
  );
}

function Row({ icon, title, sub, right }: { icon: ReactNode; title: string; sub: string; right: ReactNode }) {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-(--ap-line-2) py-3.5 max-[640px]:grid-cols-[40px_minmax(0,1fr)] max-[640px]:[&>*:last-child]:col-start-2 max-[640px]:[&>*:last-child]:justify-self-start">
      {icon}
      <div className="min-w-0">
        <b className="block text-base">{title}</b>
        <span className="ap-sm">{sub}</span>
      </div>
      {right}
    </div>
  );
}

function DocRow({ doc: d }: { doc: ApplicantDocument }) {
  // Module 1 §3 wording: Pending / Uploaded / Approved (application), Pending / Submitted / Verified (pre-employment).
  const status = documentStatus(d);
  const chip = (
    <Chip tone={status.tone} icon={d.status === "verified" ? ShieldCheck : undefined}>
      {status.label}
    </Chip>
  );
  return (
    <Link
      href={d.resubmission ? `/applicant/documents#doc-${d.id}` : "/applicant/documents"}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-(--ap-line) bg-white px-3.5 py-3 text-(--ap-ink)! transition-colors hover:border-[#dccfe6]"
    >
      <RowIcon icon={documentIcon(d)} size={40} />
      {/* Phones: status sits under the name so long names never collide with it. */}
      <span className="flex min-w-0 flex-1 items-center gap-3 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-1.5">
        <b className="min-w-0 flex-1 text-base leading-[1.3] font-semibold">{d.name}</b>
        <span className="shrink-0">{chip}</span>
      </span>
      <ChevronRight className="size-4.5 shrink-0 text-(--ap-faint)" aria-hidden="true" />
    </Link>
  );
}

/**
 * Wireframe `.vtl`, carrying the 8 CONFIRMED recruitment stage names
 * (APPLICATION_STAGES) rather than the wireframe's placeholder labels.
 * Sublabels follow the wireframe: "Completed · 12 Sep", "Current · …",
 * "Upcoming" (or "Closed" once the application left the pipeline).
 */
function StageTimeline({ app: a }: { app: Application }) {
  const inPool = a.lifecycle === "in_talent_pool" || a.lifecycle === "not_selected" || a.lifecycle === "withdrawn";
  return (
    <ol className="m-0 list-none p-0" aria-label="Recruitment progress">
      {APPLICATION_STAGES.map((stage, i) => {
        let k: "done" | "now" | "up" = i < a.stage ? "done" : i === a.stage ? "now" : "up";
        if (inPool && i > a.stage) k = "up";
        const date = a.stageDates[i];
        const sub =
          k === "done"
            ? `Completed${date ? ` · ${fmtDayShort(date)}` : ""}`
            : k === "now"
              ? inPool
                ? "Closed"
                : date && dayDiff(date) > 0
                  ? `Current · ${fmtDayShort(date)}`
                  : `Current · ${i <= 1 ? "In review" : "In progress"}`
              : "Upcoming";
        const last = i === APPLICATION_STAGES.length - 1;
        return (
          <li
            key={stage}
            aria-current={k === "now" ? "step" : undefined}
            className={`relative flex gap-3.5 ${last ? "" : "pb-4.5"}`}
          >
            {last ? null : (
              <span
                aria-hidden="true"
                className={`absolute top-7 bottom-0.5 left-3 w-0.5 ${k === "done" ? "bg-(--ap-violet)" : "bg-(--ap-line)"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-[1] flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 max-[767px]:size-6 ${
                k === "done"
                  ? "border-(--ap-violet) bg-(--ap-violet) text-white"
                  : k === "now"
                    ? "border-(--ap-violet) bg-white shadow-[0_0_0_4px_var(--ap-tint-2)]"
                    : "border-[#cfc8d8] bg-white"
              }`}
            >
              {k === "done" ? <Check className="size-3.5" strokeWidth={2.4} /> : k === "now" ? <i className="block size-2.25 rounded-full bg-(--ap-violet)" /> : null}
            </span>
            <div className="min-w-0 pt-0.5 leading-[1.35]">
              <b className={`block text-[15px] ${k === "now" ? (inPool ? "text-(--ap-ink)" : "text-(--ap-violet)") : k === "up" ? "font-semibold text-(--ap-muted)" : ""}`}>
                {stage}
              </b>
              {k === "now" && !inPool && i === 1 && a.lifecycle === "submitted" ? <UnderReviewBadge size="sm" animate={false} className="mt-1" /> : <span className="text-[13px] text-(--ap-muted)">{sub}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "2026-11-01" -> "1 Nov 2026"; free text ("Immediately") passes through. */
function formatStart(v: string): string {
  if (!v) return "Not provided";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDay(`${v}T12:00:00`) : v;
}

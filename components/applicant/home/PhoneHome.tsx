"use client";

/**
 * Applicant Home on PHONES (below 768px) - "simple but stunning" (UI kit + Premium Design Concept review, 2026-10-19).
 * One hero next-action card, up to two pastel application cards, then "Roles for you".
 * Everything else the desktop Home shows (stat tiles, profile completion, suggestions, notifications list, job-alert promo,
 * required-documents and upcoming-interview sections) lives on its own page; see docs/design-references/job-finding-ui-kit-claude-notes-2026-10-19.md.
 * Presentation only: every value comes from the same store the desktop Home reads.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { LOCATIONS } from "../jobs/filters";
import { heroImage, personaNames, useAvatarState } from "@/lib/applicant/avatar";
import { formatTime } from "@/lib/applicant/time";
import { stageColor } from "@/lib/applicant/stage-tone";
import { useSavedJobs } from "@/lib/applicant/saved";
import { useJobAlert } from "../jobs/alert-store";
import type { Application, Interview } from "@/lib/applicant/types";
import { describeApplicationStatus } from "@/lib/applicant/status";
import { Award, Bell, Bookmark, Check, Eye, MapPin, Pencil, Search, Upload, UserRound, Video, type IconComponent } from "@/components/applicant/icons";
import type { ApplicantJob as Job } from "@/lib/applicant/jobs";
import { computeProfileCompleteness, useApplicantStore } from "@/lib/applicant/service";
import { formatDueLabel } from "@/lib/applicant/time";
import { useInterviewRequests } from "@/lib/bridge/interview-requests";
import { interviewView } from "@/lib/applicant/interview-state";
import { JobCard } from "../jobs/JobCard";
import { SectionHeading } from "../primitives";
import { Reveal } from "../motion";
import { RelativeTime } from "../RelativeTime";
import { IconDisc } from "@/components/shared/premium";
import { BoldTile, type GlyphName, type GlyphWeight, type TileTint } from "@/components/shared/icons";
import { UnderReviewBadge } from "../UnderReviewBadge";
import { StaffTransitionBanner } from "../StaffTransitionBanner";
import { BriefcaseBusiness, Sparkles } from "@/components/applicant/icons";
import { setupDone, SETUP_TOTAL, STAFF_HUB_HOST, STAFF_HUB_URL, useStaffHubSetup } from "@/lib/applicant/staff-access";
import { applicationStatus } from "../applications/shared";
import { interviewSentence, nextStepLine, StatusDot } from "../applications/next-step";

type PrimaryAction = { title: string; sub: string; due: string | null; cta: string; href: string; icon: IconComponent; eyebrow?: string; review?: boolean; offer?: boolean; tone?: "warn" | "ok" | "wait" };

export function PhoneHome({ jobs }: { jobs: Job[] }) {
  const store = useApplicantStore();
  const { applications, interviews, documents } = store;
  const ivRequests = useInterviewRequests();
  const completeness = computeProfileCompleteness(store.profile, documents);

  const submitted = applications.filter((a) => a.lifecycle !== "draft");
  const drafts = applications.filter((a) => a.lifecycle === "draft");
  const current =
    submitted.find((a) => a.next) ??
    [...submitted].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ??
    null;
  const upcomingInterview = interviews.find((v) => v.status === "scheduled") ?? null;
  const upcomingWaiting = !!upcomingInterview && interviewView(upcomingInterview, ivRequests).kind === "waiting";

  // The ONE thing to do next: a scheduled interview, then something HR is waiting on, then a draft, then any other step, then finding a job.
  const owing = submitted.find((a) => a.next?.tone === "warn") ?? null;
  const owingDue = owing
    ? (documents
        .filter((d) => d.forApplicationId === owing.id && d.status === "action-required" && d.due)
        .map((d) => d.due as string)
        .sort()[0] ?? null)
    : null;
  const draft = drafts[0] ?? null;
  // Nothing is owed by the applicant and an application sits with HR: the hero says so, with the hourglass.
  const reviewApp = submitted.find((a) => !a.next && applicationStatus(a, interviews).label === "Under review") ?? null;
  const [ivRole, ivCompany] = (upcomingInterview?.applicationLabel ?? "").split(" · ");
  const offerApp = submitted.find((a) => a.offer?.status === "pending") ?? null;
  const primary: PrimaryAction = offerApp
    ? { eyebrow: "Good news", title: `${offerApp.company} has offered you the ${offerApp.role} role`, sub: "Read your offer, then reply when you are ready.", due: null, cta: "View your offer", href: `/applicant/applications/${offerApp.id}/offer`, icon: Award, offer: true, tone: "ok" }
    : upcomingInterview?.scheduledAt
    ? upcomingWaiting
      ? { title: `New interview time requested for ${ivRole}`, sub: `Waiting for HR to confirm${ivCompany ? ` · ${ivCompany}` : ""}`, due: null, cta: "View interview", href: "/applicant/interviews", icon: Video, tone: "wait" }
      : { title: `Interview for ${ivRole}`, sub: `${interviewSentence(upcomingInterview.scheduledAt)}${ivCompany ? ` · ${ivCompany}` : ""}`, due: null, cta: "View interview", href: "/applicant/interviews", icon: Video, tone: "ok" }
    : owing?.next
      ? { title: nextStepLine(owing, interviews, documents), sub: `${owing.role} · ${owing.company}`, due: owingDue ? formatDueLabel(owingDue) : null, cta: owing.next.ctaLabel, href: owing.next.href, icon: Upload, tone: "warn" }
      : draft
        ? { title: "Finish your application", sub: `${draft.role} · ${draft.company}`, due: null, cta: "Continue application", href: draft.vacancyId ? `/applicant/apply?job=${draft.vacancyId}` : "/applicant/apply", icon: Pencil, tone: "warn" }
        : current?.next
          ? { title: current.next.label, sub: `${current.role} · ${current.company}`, due: null, cta: current.next.ctaLabel, href: current.next.href, icon: current.next.tone === "warn" ? Upload : Eye, tone: current.next.tone === "warn" ? "warn" : current.next.tone === "ok" ? "ok" : "wait" }
          : reviewApp
            ? { title: "Waiting for HR to review your application", sub: `${reviewApp.role} · ${reviewApp.company}`, due: null, cta: "View application", href: `/applicant/applications/${reviewApp.id}`, icon: Eye, review: true, tone: "wait" }
            : applications.length
              ? { title: "You are all caught up", sub: "Nothing needs your attention right now.", due: null, cta: "Find jobs", href: "/applicant/jobs", icon: Search, tone: "wait" }
              : completeness.percent < 100
                ? { title: "Complete your profile", sub: completeness.percent > 0 ? `${completeness.percent}% done. A few more minutes and employers can find you.` : "A few minutes of details helps employers find you.", due: null, cta: "Complete profile", href: "/applicant/profile", icon: UserRound, tone: "warn" }
                : { title: "Apply to your first role", sub: "Your profile is ready. Pick a role and apply in minutes.", due: null, cta: "Find jobs", href: "/applicant/jobs", icon: Search, tone: "wait" };
  const StepIcon = primary.icon;
  // Selected / placed: once the person has Staff access, the purple Staff Hub card IS "Your next step" (no interview card, no second block).
  const staffGranted = store.profile.staffEntitlement.granted;
  // Desktop: while the profile is unfinished, its ring replaces the folder picture inside the next-step card (not on the offer card).
  const showProfileRing = completeness.percent < 100 && !primary.offer;

  const recommended = jobs.filter((j) => !j.closed).slice(0, 4);

  return (
    // Phones: one column. Desktop (project lead, 2026-10-24): the same structure in a left-aligned container, with a quiet right rail from 1100px.
    <div className="flex max-w-[1200px] flex-col gap-7">
      <h1 className="sr-only">Home</h1>
      <DesktopGreeting />
      {/* Full container width, above both columns (project lead, 2026-10-25). */}
      <SharedHero />
      <DesktopHero jobs={jobs} />
    <div className="min-[1280px]:grid min-[1280px]:grid-cols-[minmax(0,1fr)_304px] min-[1280px]:items-start min-[1280px]:gap-x-8">
    <div className="@container flex min-w-0 flex-col gap-7">
      {/* 2. Your next step: the state-specific action, tinted by meaning (sand = you owe something, olive = good news, lavender = waiting). */}
      <Reveal as="section" aria-label="Your next step">
        <SectionHeading title="Your next step" />
        {staffGranted ? (
          <StaffHubStep outlet={store.profile.staffEntitlement.outletName ?? ""} />
        ) : (
        <div className={`relative overflow-hidden rounded-[24px] p-5 ${STEP_TINT[primary.tone ?? (applications.length ? "wait" : "warn")]}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/applicant/next-action-folder.webp" alt="" aria-hidden="true" className={`pointer-events-none absolute top-2 right-2 w-auto opacity-90 min-[768px]:top-3 min-[768px]:right-6 ${primary.offer ? "h-[96px] min-[768px]:h-[130px]" : "h-[72px] min-[768px]:h-[110px]"} ${showProfileRing ? "min-[768px]:hidden" : ""}`} />
          {/* Desktop: the profile ring lives inside the next-step card (one card, no second "finish your profile" block). */}
          {showProfileRing ? <ProfileRingBadge percent={completeness.percent} /> : null}
          {primary.eyebrow ? <div className="ap-eb relative mb-1.5">{primary.eyebrow}</div> : null}
          <b className="relative block max-w-[68%] text-[20px] leading-[1.2] text-(--ap-ink) min-[768px]:max-w-[60%] min-[768px]:text-[22px]">{primary.title}</b>
          <p className={`relative mt-1.5 text-[15px] leading-snug text-(--ap-ink-2) ${primary.offer ? "max-w-[90%]" : "max-w-[80%]"} min-[768px]:max-w-[60%]`}>
            {primary.sub}
            {primary.due ? (
              <>
                {" "}
                · <span className="font-semibold text-(--ap-warn)">{primary.due}</span>
              </>
            ) : null}
          </p>
          {primary.review ? <UnderReviewBadge size="md" className="relative mt-3" /> : null}
          <Link href={primary.href} className="ap-btn ap-btn-p ap-btn-hero relative mt-4 w-full min-[768px]:w-max min-[768px]:min-w-[300px]">
            <StepIcon aria-hidden="true" />
            <span className="flex-1">{primary.cta}</span>
          </Link>
        </div>
        )}
      </Reveal>

      {!staffGranted ? <StaffTransitionBanner hidePendingOffer /> : null}

      {/* 4. Roles for you: the shared JobCard, swipeable, with View all always visible. */}
      <Reveal as="section" aria-label="Roles for you">
        <SectionHeading title="Roles for you" moreHref="/applicant/jobs" moreLabel="View all" />
        <div className="ap-scrollbar-none -mx-[18px] flex snap-x snap-mandatory scroll-px-[18px] items-stretch gap-3 overflow-x-auto px-[18px] pb-2 max-[380px]:-mx-3.5 max-[380px]:px-3.5 min-[768px]:mx-0 min-[768px]:grid min-[768px]:grid-cols-1 min-[768px]:gap-4 min-[768px]:overflow-visible min-[768px]:px-0 min-[768px]:pb-0 @[760px]:grid-cols-2">
          {recommended.map((job) => (
            <div key={job.id} className="flex-[0_0_88%] snap-start min-[768px]:min-w-0">
              <JobCard
                job={job}
                state={{
                  applied: applications.some((a) => a.vacancyId === job.id && a.lifecycle !== "draft"),
                  draft: applications.some((a) => a.vacancyId === job.id && a.lifecycle === "draft"),
                }}
              />
            </div>
          ))}
        </div>
      </Reveal>

      {/* Desktop and tablet only: shortcuts, interview prep while one is booked, saved roles (or the job-alert state). */}
      <QuickActions jobs={jobs} />
      {upcomingInterview && !upcomingWaiting ? <InterviewPrep /> : null}
      <div className="max-[767px]:hidden">
        <SavedRail jobs={jobs} />
      </div>
    </div>

    {/* Desktop and tablet only: quiet cards. Under 1280px they sit below in two columns; an odd last card spans both. */}
    <aside className="mt-7 flex flex-col gap-5 max-[767px]:hidden min-[768px]:max-[1279px]:grid min-[768px]:max-[1279px]:grid-cols-2 min-[768px]:max-[1279px]:items-stretch min-[768px]:max-[1279px]:[&>*:last-child:nth-child(odd)]:col-span-2 ap-scrollbar-none min-[1280px]:sticky min-[1280px]:top-[104px] min-[1280px]:mt-0 min-[1280px]:max-h-[calc(100vh-120px)] min-[1280px]:overflow-y-auto min-[1280px]:overscroll-contain" aria-label="At a glance">
      {/* The interview is shown once: in the next-step card when it IS the next step, otherwise as a ticket here. */}
      {primary.href === "/applicant/interviews" ? null : <InterviewTicket interview={upcomingInterview} waiting={upcomingWaiting} />}
      {submitted.length ? <ApplicationsRail applications={submitted} /> : null}
      <LatestUpdates />
    </aside>
    </div>
    </div>
  );
}

const subscribeNever = () => () => {};
/** Desktop only: the small time-of-day line above the hero (phones have it in the top bar). */
function DesktopGreeting() {
  const hello = useSyncExternalStore(subscribeNever, () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }, () => "Welcome");
  const { gender } = useAvatarState();
  const store = useApplicantStore();
  const first = store.applications.length ? personaNames(gender).first : store.profile.preferredName || personaNames(gender).first;
  return <p className="-mb-3 text-[17px] font-semibold text-(--ap-ink-2) max-[767px]:hidden">{hello}, {first}</p>;
}

/** Ticket style: big date, time, one Join pill. */
function InterviewTicket({ interview, waiting }: { interview: Interview | null; waiting: boolean }) {
  const [role, company] = (interview?.applicationLabel ?? "").split(" · ");
  const d = interview?.scheduledAt ? new Date(interview.scheduledAt) : null;
  return (
    <section aria-label="Upcoming interview" className="rounded-[24px] border border-(--ap-line) bg-white p-5">
      <SectionHeading title="Upcoming interview" moreHref={interview ? "/applicant/interviews" : undefined} />
      {d ? (
        <>
          <div className="flex items-stretch gap-4">
            <div className="flex w-[84px] shrink-0 flex-col items-center justify-center rounded-[18px] bg-(--ap-tint) py-3 text-(--ap-violet)">
              <span className="text-[13px] font-bold tracking-[.08em] uppercase">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <b className="text-[40px] leading-none tabular-nums">{d.getDate()}</b>
              <span className="text-[13px] font-bold tracking-[.08em] uppercase">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
            </div>
            <div className="min-w-0 flex-1 self-center">
              <b className="block text-[20px] leading-tight tabular-nums">{formatTime(interview!.scheduledAt!)}</b>
              <span className="mt-0.5 block text-[15px] font-semibold text-(--ap-ink)">{role}</span>
              <span className="block truncate text-[14px] text-(--ap-muted)">{company || "Beeliv"} · {/google meet/i.test(interview?.mode ?? "") ? "Google Meet" : interview?.mode}</span>
            </div>
          </div>
          {waiting ? <p className="mt-3 text-[14px] text-(--ap-muted)">A new time is waiting for HR to confirm.</p> : null}
          <Link href="/applicant/interviews" className={`ap-btn ${waiting ? "ap-btn-o" : "ap-btn-p ap-btn-hero"} mt-4 w-full`}>
            <Video aria-hidden="true" />
            <span className="flex-1">{waiting ? "View interview" : "Join interview"}</span>
          </Link>
        </>
      ) : (
        <p className="text-[15px] leading-snug text-(--ap-muted)">Nothing scheduled. When an interview is booked, the date, time and link appear here.</p>
      )}
    </section>
  );
}

/** New applicants: saved roles (up to three) and the job-alert state, so the rail is never empty. */
function SavedRail({ jobs }: { jobs: Job[] }) {
  const savedIds = useSavedJobs();
  const alert = useJobAlert();
  const rows = savedIds.map((id) => jobs.find((j) => j.id === id)).filter((j): j is Job => !!j).slice(0, 3);
  return (
    <section aria-label="Saved roles and job alerts" className="rounded-[24px] border border-(--ap-line) bg-white p-5">
      <SectionHeading title="Saved roles" moreHref={rows.length ? "/applicant/jobs" : undefined} moreLabel="View all" />
      {rows.length ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((j, i) => (
            <li key={j.id} className={i ? "border-t border-(--ap-line-2)" : ""}>
              <Link href={`/applicant/jobs/${j.id}`} className="block py-2.5 text-(--ap-ink)!">
                <b className="block truncate text-[15px]">{j.role}</b>
                <span className="block truncate text-[14px] text-(--ap-muted)">{j.company} · {j.closes}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] leading-snug text-(--ap-muted)">Tap the bookmark on a role to keep it here.</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-(--ap-line-2) pt-3">
        <span className="text-[14px] text-(--ap-ink-2)">Job alerts by email: <b>{alert.on ? alert.freq : "Off"}</b></span>
        <Link href="/applicant/jobs" className="ap-btn ap-btn-o ap-btn-sm">{alert.on ? "Manage" : "Set up"}</Link>
      </div>
    </section>
  );
}

/** Desktop only: the three most recent notifications as compact rows. */
function LatestUpdates() {
  const { notifications } = useApplicantStore();
  const rows = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Latest updates" className="rounded-[24px] border border-(--ap-line) bg-white p-5">
      <SectionHeading title="Latest updates" moreHref="/applicant/notifications" moreLabel="View all" />
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((n, i) => (
          <li key={n.id} className={`flex items-start gap-3 py-2.5 ${i ? "border-t border-(--ap-line-2)" : ""}`}>
            <IconDisc icon={Bell} size={36} className="mt-0.5 border border-(--ap-line)" />
            <div className="min-w-0 flex-1">
              <b className="block text-[15px] leading-snug">{n.title}</b>
              <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-(--ap-muted)">
                <RelativeTime iso={n.createdAt} />
                {n.link ? <Link href={n.link.href} className="font-semibold text-(--ap-violet)!">{n.link.label}</Link> : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Desktop only: four real shortcuts, each with a count where there is one. */
function QuickActions({ jobs }: { jobs: Job[] }) {
  void jobs;
  const { documents, profile } = useApplicantStore();
  const saved = useSavedJobs().length;
  const alert = useJobAlert();
  const owed = documents.filter((d) => d.status === "action-required").length;
  const missing = computeProfileCompleteness(profile, documents).missing.length;
  const tiles: { glyph: GlyphName; tint: TileTint; weight: GlyphWeight; title: string; text: string; href: string; count: number }[] = [
    { glyph: "upload", tint: "lavender", weight: "bold", title: "Upload documents", text: owed ? "Beeliv is waiting on these" : "CV, photo and ID live here", href: "/applicant/documents", count: owed },
    { glyph: "profile", tint: "sage", weight: "bold", title: "Update your profile", text: missing ? "Skills, availability and more" : "Keep availability up to date", href: "/applicant/profile", count: missing },
    { glyph: "alert-bell", tint: "lavender", weight: "bold", title: "Job alerts", text: alert.on ? `On, ${alert.freq.toLowerCase()} by email` : "Get new roles by email", href: "/applicant/jobs", count: 0 },
    { glyph: "bookmark", tint: "gold", weight: "duotone", title: "Saved roles", text: saved ? "Roles you kept for later" : "Tap the bookmark on a role", href: "/applicant/jobs", count: saved },
  ];
  return (
    <section aria-label="Quick actions" className="max-[767px]:hidden">
      <SectionHeading title="Quick actions" />
      <div className="grid grid-cols-2 gap-3 @[760px]:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="relative flex flex-col gap-2 rounded-[22px] border border-(--ap-line) bg-white p-4 text-(--ap-ink)! transition-shadow hover:shadow-[0_10px_28px_rgba(42,11,71,.08)]">
            <BoldTile glyph={t.glyph} tint={t.tint} weight={t.weight} size={48} />
            {t.count > 0 ? <span className="bv-badge absolute top-3 right-3" aria-label={`${t.count}`}>{t.count > 9 ? "9+" : t.count}</span> : null}
            <b className="text-[15px] leading-tight">{t.title}</b>
            <span className="text-[13px] leading-snug text-(--ap-muted)">{t.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Desktop only, and only while an interview is booked: three short things to do before it. */
function InterviewPrep() {
  const items = ["Test your camera and microphone", "Read the role description again", "Join 10 minutes early"];
  return (
    <section aria-label="Interview prep" className="rounded-[24px] border border-(--ap-line) bg-white p-5 max-[767px]:hidden">
      <SectionHeading title="Get ready for your interview" moreHref="/applicant/interviews" moreLabel="Details" />
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-3 text-[15px] text-(--ap-ink-2)">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)" aria-hidden="true">
              <Check className="size-3.5" strokeWidth={2.6} />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Up to three applications, each a name and a status dot with a word (no filled badges). */
function ApplicationsRail({ applications }: { applications: Application[] }) {
  const rows = [...applications].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Your applications" className="rounded-[24px] border border-(--ap-line) bg-white p-5">
      <SectionHeading title="Your applications" moreHref="/applicant/applications" moreLabel="View all" />
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((a, i) => {
          const { label, tone } = describeApplicationStatus(a);
          return (
            <li key={a.id} className={i ? "border-t border-(--ap-line-2)" : ""}>
              <Link href={`/applicant/applications/${a.id}`} className="block py-3 text-(--ap-ink)!">
                <b className="block truncate text-[15px]">{a.role}</b>
                <span className="mt-0.5 flex flex-col items-start gap-1 text-[14px] text-(--ap-muted)">
                  <span className="max-w-full truncate">{a.company}</span>
                  <StatusDot tone={tone} color={stageColor(a)} animate={false}>{label}</StatusDot>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Ring colour by completion (project lead rule, two colours only): purple below half, green from half. */
function ringColor(percent: number) {
  return percent >= 50 ? "var(--ap-ok, #15803d)" : "var(--ap-violet, #5b087b)";
}

/** Desktop only: the profile ring sits inside the next-step card, on the right, where the folder picture is on phones. */
function ProfileRingBadge({ percent }: { percent: number }) {
  const color = ringColor(percent);
  return (
    <Link
      href="/applicant/profile"
      aria-label={`Your profile is ${percent}% complete. Open profile`}
      className="absolute top-1/2 right-8 hidden -translate-y-1/2 flex-col items-center gap-1.5 text-(--ap-ink)! min-[768px]:flex"
    >
      <span className="relative flex size-[104px] items-center justify-center rounded-full bg-white/70" role="img" aria-label={`${percent}% complete`}>
        <svg viewBox="0 0 84 84" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" r="36" fill="none" stroke="var(--ap-line)" strokeWidth="7" />
          <circle cx="42" cy="42" r="36" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray={`${percent} 100`} />
        </svg>
        <b className="text-[24px] tabular-nums" style={{ color }} aria-hidden="true">{percent}%</b>
      </span>
      <span className="text-[13px] font-semibold text-(--ap-ink-2)">Profile</span>
    </Link>
  );
}

/** Profile completion: a progress ring and one plain pill (not a dark block). */
function ProfileRing({ percent, summary }: { percent: number; summary: string }) {
  const done = percent >= 100;
  return (
    <section aria-label="Profile completion" className="rounded-[24px] border border-(--ap-line) bg-white p-5">
      <div className="flex items-center gap-4">
        <span className="relative flex size-[84px] shrink-0 items-center justify-center" role="img" aria-label={`${percent}% complete`}>
          <svg viewBox="0 0 84 84" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
            <circle cx="42" cy="42" r="36" fill="none" stroke="var(--ap-line)" strokeWidth="7" />
            <circle cx="42" cy="42" r="36" fill="none" stroke="var(--ap-violet)" strokeWidth="7" strokeLinecap="round" pathLength={100} strokeDasharray={`${percent} 100`} />
          </svg>
          <b className="text-[20px] text-(--ap-violet) tabular-nums" aria-hidden="true">{percent}%</b>
        </span>
        <div className="min-w-0">
          <b className="block text-[18px] leading-tight">{done ? "Profile complete" : "Your profile"}</b>
          <span className="mt-1 block text-[14px] leading-snug text-(--ap-muted)">{done ? "Everything is in place." : summary}</span>
        </div>
      </div>
      <Link href="/applicant/profile" className="ap-btn ap-btn-o mt-4 w-full">
        {done ? "View profile" : "Finish profile"}
      </Link>
    </section>
  );
}

/** The purple brand card for people who are now staff: the next step is the Staff Hub (open it, or finish its setup). */
function StaffHubStep({ outlet }: { outlet: string }) {
  const setup = useStaffHubSetup();
  const done = setupDone(setup);
  const ready = done === SETUP_TOTAL;
  const Icon = ready ? BriefcaseBusiness : Sparkles;
  return (
    // Same card as every other next step (olive "good news" tint + folder image), not a second purple block.
    <div className={`relative overflow-hidden rounded-[24px] p-5 ${STEP_TINT.ok}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/applicant/next-action-folder.webp" alt="" aria-hidden="true" className="pointer-events-none absolute top-2 right-2 h-[72px] w-auto opacity-90" />
      <div className="ap-eb relative mb-1.5">{ready ? `Staff${outlet ? ` · ${outlet}` : ""}` : "You're on the team"}</div>
      <b className="relative block max-w-[68%] text-[20px] leading-[1.2] text-(--ap-ink)">{ready ? "Your Staff Hub" : "Your Staff Hub is ready"}</b>
      <p className="relative mt-1.5 max-w-[80%] text-[15px] leading-snug text-(--ap-ink-2)">
        {ready ? `Schedules, attendance and more at ${STAFF_HUB_HOST}.` : `${done} of ${SETUP_TOTAL} setup steps done.`}
      </p>
      <a href={ready ? STAFF_HUB_URL : "/applicant/staff-access"} className="ap-btn ap-btn-p ap-btn-hero relative mt-4 w-full min-[768px]:w-max min-[768px]:min-w-[300px]">
        <Icon aria-hidden="true" />
        <span className="flex-1">{ready ? "Open Staff Hub" : done ? "Continue setup" : "Set up Staff Hub"}</span>
      </a>
    </div>
  );
}

const STEP_TINT = { warn: "bg-[#F8EFD9]", ok: "bg-[#E9EEDC]", wait: "bg-[#F1E8F7]" } as const;
const SUGGESTIONS = ["Chef", "Waiter", "Bar"];

const DESKTOP_CHIPS = ["Chef", "Waiter", "Bar", "Front desk"];

/** The hero search: type a role (and optionally a place), press Enter or Search, and the Jobs page opens with the results. */
function useHeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (loc) p.set("loc", loc);
    const s = p.toString();
    router.push(`/applicant/jobs${s ? `?${s}` : ""}`);
  };
  return { q, setQ, loc, setLoc, submit };
}

/**
 * Desktop and tablet hero (768px and up): full container width above both columns, 360px high. Left block (max 620px):
 * eyebrow, a two-line headline, one muted line, ONE white search pill (role | place | button; each segment min-w-0 and
 * truncating), icon chips and the live count. Right: the waiter cut-out stands on the bottom edge; one real role floats
 * top right (from 1100px). Same family as the phone hero: same gradient, radius, cut-out art, pill buttons, chips.
 */
function DesktopHero({ jobs }: { jobs: Job[] }) {
  const { gender } = useAvatarState();
  const hs = useHeroSearch();
  const open = jobs.filter((j) => !j.closed);
  const top = open[0];
  return (
    <Reveal as="section" aria-label="Find a role" className="relative hidden h-[360px] overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#EBDDF5,#F6EEFB_55%,#F8EFD9)] min-[768px]:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={heroImage(gender)} alt="" aria-hidden="true" className="pointer-events-none absolute right-[3%] bottom-0 h-[80%] w-auto max-w-none object-contain object-bottom drop-shadow-[0_18px_18px_rgba(37,0,68,.2)] min-[1280px]:h-[84%]" />
      <div className="relative z-[1] flex h-full max-w-[calc(100%-270px)] flex-col justify-center px-8 min-[1100px]:px-10 min-[1280px]:max-w-[660px]">
        <div className="ap-eb">Beeliv Jobs</div>
        <h2 className="mt-2 text-[34px] leading-[1.12] font-bold text-(--ap-ink) min-[1100px]:text-[40px]">
          Find your next
          <br />
          hospitality role
        </h2>
        <p className="mt-2 text-[16px] leading-snug text-(--ap-ink-2)">Roles from hotels, restaurants and lounges across Nigeria.</p>
        <form
          role="search"
          onSubmit={hs.submit}
          aria-label="Search jobs by role and place"
          className="mt-5 flex h-16 w-full min-w-0 items-center rounded-full border border-(--ap-line) bg-white pr-2 pl-5 shadow-[0_6px_18px_rgba(42,11,71,.08)]"
        >
          <Search className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
          <input
            data-seg
            type="search"
            value={hs.q}
            onChange={(e) => hs.setQ(e.target.value)}
            aria-label="Role or keyword"
            placeholder="Role or keyword"
            autoComplete="off"
            enterKeyHint="search"
            className="ml-3 min-w-0 flex-[1.3] border-0 bg-transparent text-[15px] text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
          />
          <span className="mx-3 h-7 w-px shrink-0 bg-(--ap-line)" aria-hidden="true" />
          <MapPin className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
          <select
            data-seg
            value={hs.loc}
            onChange={(e) => hs.setLoc(e.target.value)}
            aria-label="Place"
            className="ml-3 min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent text-[15px] text-(--ap-ink) outline-none"
          >
            <option value="">All Nigeria</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button data-seg type="submit" className="ml-2 inline-flex h-12 w-[120px] shrink-0 items-center justify-center gap-2 rounded-full bg-(--ap-violet) text-[15px] font-bold text-white">
            <Search className="size-[18px]" aria-hidden="true" />
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {DESKTOP_CHIPS.map((t) => (
            <Link key={t} href={`/applicant/jobs?q=${encodeURIComponent(t)}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/75 px-4 text-[14px] font-semibold text-(--ap-ink-2)">
              <BriefcaseBusiness className="size-4 text-(--ap-violet)" aria-hidden="true" />
              {t}
            </Link>
          ))}
          <span className="ml-1 inline-flex items-center gap-2 text-[14px] font-semibold text-(--ap-ink-2)">
            <span className="size-2 rounded-full bg-(--ap-ok)" aria-hidden="true" />
            {open.length} open {open.length === 1 ? "role" : "roles"} right now
          </span>
        </div>
        {/* A real role as a quiet link on the left, so nothing covers the illustration. */}
        {top ? (
          <Link href={`/applicant/jobs/${top.id}`} className="mt-3 inline-flex max-w-full items-center gap-2 self-start text-[14px] font-semibold text-(--ap-violet)!">
            <span className="ap-eb shrink-0">Open now</span>
            <span className="truncate text-(--ap-ink-2)">{top.role} · {top.company}, {top.location}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </Reveal>
  );
}

/** Phone hero (below 768px): one illustration, a warm headline and the big search entry. Never changes with the applicant's state. */
function SharedHero() {
  const hs = useHeroSearch();
  return (
    <Reveal as="section" aria-label="Find a role" className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#EBDDF5,#F6EEFB_55%,#F8EFD9)] p-5 pt-6 min-[768px]:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/applicant/hero-cutout-m.webp" alt="" aria-hidden="true" className="pointer-events-none absolute top-3 -right-1 h-[118px] w-auto object-contain object-top [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]" />
      <div className="relative max-w-[66%]">
        <div className="ap-eb">Beeliv Jobs</div>
        <h2 className="mt-2 text-[24px] leading-[1.15] font-bold text-(--ap-ink)">Find your next hospitality role</h2>
      </div>
      <p className="relative mt-2 max-w-[66%] text-[15px] leading-snug text-(--ap-ink-2)">Roles from hotels, restaurants and lounges across Nigeria.</p>
      {/* Type a role, press Enter (or the round button): the Jobs page opens with the results. */}
      <form
        role="search"
        onSubmit={hs.submit}
        aria-label="Search jobs"
        className="relative mt-5 flex h-14 items-center gap-3 rounded-full border border-(--ap-line) bg-white pr-2 pl-4 shadow-[0_6px_18px_rgba(42,11,71,.08)]"
      >
        <Search className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
        <input
          type="search"
          value={hs.q}
          onChange={(e) => hs.setQ(e.target.value)}
          aria-label="Search roles or places"
          placeholder="Search roles or places"
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-(--ap-ink) outline-none placeholder:text-(--ap-muted)"
        />
        <button type="submit" aria-label="Search" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-violet) text-white">
          <Search className="size-[18px]" aria-hidden="true" />
        </button>
      </form>
      <div className="relative mt-3 flex gap-2">
        {SUGGESTIONS.map((t) => (
          <Link key={t} href={`/applicant/jobs?q=${encodeURIComponent(t)}`} className="inline-flex h-10 items-center rounded-full bg-white/70 px-4 text-[14px] font-semibold text-(--ap-ink-2)">
            {t}
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

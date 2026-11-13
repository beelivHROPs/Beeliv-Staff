import type { ApplicantJob } from "@/lib/applicant/jobs";
import Link from "next/link";
import { Briefcase, ShieldCheck } from "@/components/applicant/icons";
import { JobCover } from "@/components/applicant/primitives";
import { AxFacts } from "@/components/applicant/ax";
import { JobDetailSections } from "@/components/applicant/jobs/JobDetailSections";
import { StickyActionBar } from "@/components/shared/mobile/StickyActionBar";
import { PublicJobCard } from "./jobs/PublicJobCard";
import { SaveAction, ShareAction } from "./jobs/JobActions";
import { JobStickySummary } from "@/components/shared/jobs/JobStickySummary";
import { STATE_CHIP } from "@/lib/jobs/status";
import { JOB_DETAIL } from "@/lib/public-site/job-content";
import { experienceLabel, formatLongDate, salaryLabel } from "@/lib/public-site/job-details";
import { questionsForJob } from "@/lib/journeys/applicant";
import { ROUTES } from "@/lib/public-site/content";
import { PageHeader } from "./PageHeader";
import { SiteFooter } from "./SiteFooter";
import { MenuProvider } from "./SiteHeader";
import { Reveal, SoftLink, TextLink } from "./kit";
import { ShareSheetHost } from "@/components/shared/ShareSheet";
import { jobShareText } from "@/lib/share/share-urls";
import { Chip, Eyebrow, T, stagger } from "./primitives";

/**
 * Job detail (public). Used by app/(public)/jobs/[id]/page.tsx (real job + related jobs) and its loading.tsx
 * (placeholder job + jobs, wrapped in `.skel`) - same DOM either way.
 *
 * Header treatment is the public site's own (breadcrumb, company eyebrow, serif title, chips). Everything below
 * it is the Applicant job page's content and layout, from the same components: cover photo, compact facts list
 * (AxFacts), the sections (JobDetailSections: About ... Required documents, Screening, Recruitment process),
 * the "You apply once" line, a sticky side column at >=1241px with Apply / Save / Share, an inline Apply button
 * on tablets and the sticky Apply pill on phones. Differences that stay: Apply goes to sign-up with the job id
 * (nobody is signed in here), Save is the guest bookmark, and there is no match tag (it needs a profile).
 * Kept from the old public page: the "closed" notice and "More roles like this" (a closed job points to open ones).
 */
export function JobDetailBody({ job, related }: { job: ApplicantJob; related: ApplicantJob[] }) {
  const applyHref = `/signup?job=${job.id}`;
  const open = !job.closed;
  const questions = questionsForJob(job);
  const statusChip = job.state === "open" ? null : STATE_CHIP[job.state];
  const shareTitle = `${job.role} at ${job.company}`;
  const shareText = jobShareText(job.role, job.company, job.location);

  // Same facts as the Applicant page: the first five show on phones, the rest only in the side column.
  const key: [string, string][] = [
    ["Salary", salaryLabel(job.salary)],
    ["Type", `${job.employmentType} · ${job.shift} shift`],
    ["Applications close", job.deadline ? formatLongDate(job.deadline) : "Closed"],
    ["Experience", experienceLabel(job.experience)],
    ["Starts", formatLongDate(job.expectedResumption) || "To be confirmed"],
  ];
  const more: [string, string][] = [
    ["Department", job.department],
    ["Openings", String(job.openings)],
    ["Job ref", job.jobRef],
  ];

  const ctaLabel = open ? "Apply now" : "Applications closed";
  const ctaIcon = open ? <Briefcase className="size-5" strokeWidth={2} aria-hidden="true" /> : undefined;
  const applyButton = (className: string) =>
    open ? (
      <Link href={applyHref} className={`ap-btn ap-btn-p ap-btn-hero text-white! ${className}`}>
        {ctaIcon}
        {ctaLabel}
      </Link>
    ) : (
      <button type="button" disabled className={`ap-btn ap-btn-p h-12 text-[15px] ${className}`}>
        {ctaLabel}
      </button>
    );

  return (
    <MenuProvider>
      <PageHeader activeHref={ROUTES.jobs} />

      {/* Hero (public treatment) */}
      <section className="flex flex-col gap-3.5 border-b border-(--soft-border) bg-white px-5 pt-7 pb-8 wf-d:gap-[calc(22*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(44*var(--u))] wf-d:pb-[calc(56*var(--u))]">
        <Reveal when="mount" y={12}>
          <nav aria-label="Breadcrumb" className="ps-sm pt-5 wf-d:pt-[calc(18*var(--u))]">
            <SoftLink href={ROUTES.jobs}>
              <T>{JOB_DETAIL.breadcrumbRoot}</T>
            </SoftLink>{" "}
            <T>{`/ ${job.role}`}</T>
          </nav>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal when="mount" y={14} delay={stagger(1)}>
            <Eyebrow>{job.company || JOB_DETAIL.clientFallback}</Eyebrow>
          </Reveal>
          <Reveal when="mount" y={16} delay={stagger(2)}>
            <h1 className="ps-serif [--fs-d:64] [--fs-m:30]">
              <T>{job.role}</T>
            </h1>
          </Reveal>
          <Reveal when="mount" y={14} delay={stagger(3)} className="flex flex-wrap gap-2">
            {statusChip && (
              <span className="ps-chip font-semibold" style={open ? { background: "#fef3c7", color: "#b45309" } : undefined}>
                <T>{statusChip}</T>
              </span>
            )}
            <Chip>{job.location}</Chip>
            <Chip>{job.employmentType}</Chip>
            <Chip>{job.department}</Chip>
            <Chip>{job.postedLabel}</Chip>
          </Reveal>
          {/* Below 1241px Save and Share sit under the title (the Applicant page has them in its top bar). */}
          <div className="jc-public flex gap-2.5 min-[1000px]:hidden">
            <ShareAction title={shareTitle} text={shareText} variant="icon" />
            <SaveAction jobId={job.id} role={job.role} variant="icon" />
          </div>
        </div>
      </section>

      {/* Closed (still viewable for 5 days): say so plainly, no Apply, similar open roles below. */}
      {!open && (
        <section aria-label="Job closed" className="px-5 pt-6 wf-d:px-[calc(96*var(--u))]">
          <p role="status" className="ps-bd m-0 max-w-[760px] rounded-2xl bg-[rgba(91,8,123,.06)] px-5 py-4">
            <T>{`${job.state === "filled" ? "This position has been filled" : "This job has closed"}. ${job.role} at ${job.company} is no longer taking applications. Here are similar roles that are open now.`}</T>
          </p>
        </section>
      )}

      {/* Body: the Applicant job page layout. `.pj-detail` supplies its tokens (public-site.css). */}
      <div className="jc-public pj-detail mx-auto max-w-[calc(1440*var(--u))] px-5 pt-6 pb-12 wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(40*var(--u))] wf-d:pb-[calc(96*var(--u))]">
        {/* Narrow desktop (768 to 999px): a slim card with the key details and the CTAs appears once the facts scroll away. */}
        <JobStickySummary observeId="jd-facts-anchor" topClass="top-[96px]" title={job.role} details={[job.company, ...key.slice(0, 2).map(([, v]) => v)]}>
          {applyButton("h-11 px-5")}
          <SaveAction jobId={job.id} role={job.role} variant="icon" />
          <ShareAction title={shareTitle} text={shareText} variant="icon" />
        </JobStickySummary>

        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 min-[1000px]:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <JobCover image={job.image} department={job.department} className="h-[168px] w-full rounded-[14px] border border-(--ap-line) min-[768px]:h-[240px]" />

            {/* Phone and tablet: facts directly under the photo, in one container */}
            <div id="jd-facts-anchor">
              <AxFacts rows={key} className="mt-5 min-[1000px]:hidden" />
            </div>

            <div className="mt-7">
              <JobDetailSections job={job} questions={questions} />
            </div>

            <p className="mt-7 flex items-start gap-2 text-[14px] leading-snug text-(--ap-muted)">
              <ShieldCheck className="mt-px size-4 shrink-0 text-(--ap-ink-2)" strokeWidth={1.7} aria-hidden="true" />
              You apply once. Your profile, CV and ID are reused, so you only add what this role needs.
            </p>
          </div>

          {/* Desktop: sticky side column */}
          <aside className="hidden min-[1000px]:sticky min-[1000px]:top-[112px] min-[1000px]:block">
            <AxFacts rows={[...key, ...more]} />
            <div className="mt-4 flex flex-col gap-2.5">
              {applyButton("w-full")}
              <div className="grid grid-cols-2 gap-2.5">
                <SaveAction jobId={job.id} role={job.role} variant="button" />
                <ShareAction title={shareTitle} text={shareText} variant="button" />
              </div>
            </div>
          </aside>
        </div>

        {/* Tablet: apply button inline under the content (the phone bar is phone-only) */}
        <div className="mt-7 hidden min-[768px]:block min-[1000px]:hidden">{applyButton("w-full max-w-[360px]")}</div>
      </div>

      {/* More roles like this */}
      {related.length > 0 && (
        <section className="flex flex-col gap-5 border-t border-(--soft-border) bg-white py-14 pl-5 wf-d:gap-8 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(96*var(--u))]">
          <Reveal className="flex items-end justify-between gap-8 pr-5 wf-d:pr-0">
            <h2 className="ps-serif max-w-none pr-5 [--fs-d:41] [--fs-m:30] wf-d:pr-0">
              <T>{JOB_DETAIL.relatedTitle}</T>
            </h2>
            <TextLink href={ROUTES.jobs} label={JOB_DETAIL.relatedCta} className="hidden shrink-0 wf-d:inline-flex" />
          </Reveal>

          <div className="ps-swipe flex gap-3.5 pr-5 wf-d:grid wf-d:grid-cols-3 wf-d:gap-6 wf-d:overflow-visible wf-d:pr-0">
            {related.map((r, i) => (
              <Reveal key={r.id} delay={stagger(i)} className="w-[308px] shrink-0 wf-d:w-auto">
                <PublicJobCard job={r} />
              </Reveal>
            ))}
          </div>

          <TextLink href={ROUTES.jobs} label={JOB_DETAIL.relatedCta} className="mr-5 wf-d:hidden" />
        </section>
      )}

      <ShareSheetHost />
      <SiteFooter />

      {/* Phone: sticky Apply pill, same bar as the Applicant job page. */}
      <div className="jc-public pj-detail">
        <StickyActionBar label={ctaLabel} icon={ctaIcon} href={open ? applyHref : undefined} disabled={!open} />
      </div>
    </MenuProvider>
  );
}

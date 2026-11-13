import Link from "next/link";
import { ChevronLeft, Eye, LockKeyhole, Search } from "@/components/applicant/icons";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import { JobThumb } from "../primitives";
import { SubmittedMark } from "./SubmittedMark";
import { BTN, STROKE } from "./parts";

const CARD = "ap-card rounded-[20px] max-[767px]:rounded-[18px]";
const TITLE = "ap-serif";

/** Delay for an `.ap-seq` element (rises in after the submitted mark lands). */
const seq = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

/** Wireframe applyPage() st.submitted branch (`.success` + `.nextlist`). */
export function ApplySuccess({ job, applicationId }: { job: ApplicantJob; applicationId: string }) {
  return (
    <section className={`${CARD} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
      <SubmittedMark />
      <h1 className={`ap-seq ${TITLE} text-[44px] max-[767px]:text-[30px]`} style={seq(900)}>
        Application submitted
      </h1>
      <p className="ap-seq ap-bd max-w-[52ch]" style={seq(980)}>
        Your application for {job.role} at {job.company} is with the Beeliv team. We&apos;ll email and notify you here as it moves forward.
      </p>
      <ol className="ap-seq mt-2.5 mb-1.5 flex w-full max-w-[420px] list-none flex-col gap-2.5 p-0 text-left" style={seq(1060)}>
        {[
          ["Review", "usually 3–5 working days"],
          ["Shortlist", "if selected, you'll be invited to interview"],
          ["Interview", "details appear under Interviews & Assessments"],
        ].map(([title, detail], i) => (
          <li key={title} className="flex items-start gap-3 text-[14px] text-(--ap-ink-2)">
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-[13px] font-bold text-(--ap-violet)">{i + 1}</span>
            <span>
              <b>{title}</b> · {detail}
            </span>
          </li>
        ))}
      </ol>
      <div className="ap-seq mt-2 flex w-full flex-wrap justify-center gap-2.5 max-[767px]:[&>a]:flex-1" style={seq(1140)}>
        <Link href={`/applicant/applications/${applicationId}`} className={`${BTN} ap-btn-p ap-btn-hero !text-white`}>
          <Eye className="size-4" strokeWidth={STROKE} aria-hidden="true" />
          View application progress
        </Link>
        <Link href="/applicant/jobs" className={`${BTN} ap-btn-s`}>
          Browse more jobs
        </Link>
      </div>
    </section>
  );
}

/**
 * Shown instead of the workspace when a new application isn't allowed:
 * the vacancy is closed to new applicants (wireframe `ww`, "Closed to new
 * applicants"), or this applicant already submitted for it. No draft is
 * created in either case.
 */
export function ApplyBlocked({ job, reason, applicationId }: { job: ApplicantJob; reason: "closed" | "applied"; applicationId?: string }) {
  const closed = reason === "closed";
  return (
    <div>
      <Link href={`/applicant/jobs/${job.id}`} className="mb-1.5 inline-flex items-center gap-1.5 py-1 text-[14px] font-bold max-[1100px]:min-h-11">
        <ChevronLeft className="size-[15px]" strokeWidth={STROKE} aria-hidden="true" />
        Back to job
      </Link>
      <section className={`${CARD} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
        <JobThumb image={job.image} department={job.department} size={64} radius={16} />
        <span className="ap-sm">
          {job.role} · {job.company} · {job.location}
        </span>
        <h1 className={`${TITLE} text-[35px] max-[767px]:text-[30px]`}>{closed ? "Applications closed" : "You've already applied"}</h1>
        <p className="ap-bd max-w-[52ch]">
          {closed
            ? `${job.company} is no longer accepting new applications for this role. Similar roles open often, so take a look at what's open now.`
            : "Your application for this role is already with the Beeliv team. You can follow its progress from My Applications."}
        </p>
        {closed ? (
          <span className="ap-chip !bg-[#f3f1f5] !font-semibold !text-[#57545f]">
            <LockKeyhole className="size-3.5" strokeWidth={STROKE} aria-hidden="true" />
            {job.closes}
          </span>
        ) : null}
        <div className="mt-2 flex w-full flex-wrap justify-center gap-2.5 max-[767px]:[&>a]:flex-1">
          {closed ? (
            <Link href="/applicant/jobs" className={`${BTN} ap-btn-p ap-btn-hero !text-white`}>
              <Search className="size-4" strokeWidth={STROKE} aria-hidden="true" />
              Browse open jobs
            </Link>
          ) : (
            <Link href={applicationId ? `/applicant/applications/${applicationId}` : "/applicant/applications"} className={`${BTN} ap-btn-p ap-btn-hero !text-white`}>
              <Eye className="size-4" strokeWidth={STROKE} aria-hidden="true" />
              View application progress
            </Link>
          )}
          <Link href="/applicant/applications" className={`${BTN} ap-btn-s`}>
            My Applications
          </Link>
        </div>
      </section>
    </div>
  );
}

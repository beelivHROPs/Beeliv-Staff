"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, Clock3, LockKeyhole, Search } from "@/components/applicant/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { SubmittedMark } from "@/components/applicant/apply/SubmittedMark";
import { BTN, CHIP, STROKE } from "@/components/applicant/apply/parts";
import { FOCUS } from "./controls";

export const DOC_CARD = "ap-card rounded-[20px] max-[767px]:rounded-[18px]";

export function BackCrumb({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`mb-1.5 inline-flex items-center gap-1.5 py-1 text-[14px] font-bold max-[1100px]:min-h-11 max-[1100px]:py-0 ${FOCUS}`}>
      <ChevronLeft className="size-[15px]" strokeWidth={STROKE} aria-hidden="true" />
      {label}
    </Link>
  );
}

/** Unknown application id (or not part of the current prototype state). */
export function DocumentationNotFound() {
  return (
    <div>
      <BackCrumb href="/applicant/applications" label="My Applications" />
      <div className={`${DOC_CARD} p-6 max-[767px]:px-4.5 max-[767px]:py-5`}>
        <EmptyState
          icon={Search}
          title="We couldn't find this application"
          description="This documentation link is unavailable. Open My Applications to find your current records."
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

/** The application exists but hasn't reached the Documentation stage. */
export function DocumentationNotOpen({ applicationId, role, company }: { applicationId: string; role: string; company: string }) {
  return (
    <div>
      <BackCrumb href={`/applicant/applications/${applicationId}`} label="Application progress" />
      <div className={`${DOC_CARD} p-6 max-[767px]:px-4.5 max-[767px]:py-5`}>
        <EmptyState
          icon={LockKeyhole}
          title="Documentation isn't open yet"
          description={`Your ${role} application at ${company} hasn't reached the Documentation stage. Beeliv will let you know when it's time to fill this in.`}
          action={
            <Link href={`/applicant/applications/${applicationId}`} className="ap-btn ap-btn-s ap-btn-sm mt-1.5">
              View application progress
            </Link>
          }
        />
      </div>
    </div>
  );
}

const seq = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

/**
 * After submit (and on any later visit). Copy deliberately promises no
 * timeline — none is documented (BEELIV-APPLICANT-JOURNEY.md §5).
 */
export function DocumentationSubmitted({
  applicationId,
  role,
  company,
  submittedLabel,
  justNow,
}: {
  applicationId: string;
  role: string;
  company: string;
  submittedLabel: string;
  justNow: boolean;
}) {
  return (
    <div>
      <BackCrumb href={`/applicant/applications/${applicationId}`} label="Application progress" />
      <section className={`${DOC_CARD} flex flex-col items-center gap-3 px-6 py-12 text-center max-[767px]:px-4.5`}>
        {justNow ? <SubmittedMark /> : null}
        <h1 className={`${justNow ? "ap-seq" : ""} ap-serif text-[44px] max-[767px]:text-[30px]`} style={justNow ? seq(900) : undefined}>
          Documentation submitted
        </h1>
        <p className={`${justNow ? "ap-seq" : ""} ap-bd max-w-[54ch]`} style={justNow ? seq(980) : undefined}>
          Thank you. Beeliv will verify your documentation for the {role} role at {company}. You can follow where it stands on your application&apos;s progress page.
        </p>
        <div className={`${justNow ? "ap-seq" : ""} flex flex-wrap justify-center gap-2`} style={justNow ? seq(1020) : undefined}>
          <span className={CHIP.info}>
            <Clock3 className="size-3.5" strokeWidth={STROKE} aria-hidden="true" />
            Under verification
          </span>
          <span className={CHIP.mute}>Submitted {submittedLabel}</span>
        </div>
        <p className={`${justNow ? "ap-seq" : ""} ap-sm max-w-[54ch]`} style={justNow ? seq(1060) : undefined}>
          Your NIN and bank details weren&apos;t saved or sent in this preview.
        </p>
        <div className={`${justNow ? "ap-seq" : ""} mt-2 flex w-full flex-wrap justify-center gap-2.5 max-[767px]:[&>a]:flex-1`} style={justNow ? seq(1140) : undefined}>
          <Link href={`/applicant/applications/${applicationId}`} className={`${BTN} ap-btn-p !text-white ${FOCUS}`}>
            View application progress
            <ArrowRight className="size-4" strokeWidth={STROKE} aria-hidden="true" />
          </Link>
          <Link href="/applicant/documents" className={`${BTN} ap-btn-s ${FOCUS}`}>
            My documents
          </Link>
        </div>
      </section>
    </div>
  );
}

export function DocumentationSkeleton() {
  const bar = "ap-shimmer rounded-lg";
  return (
    <div aria-busy="true" aria-label="Loading your documentation">
      <div className={`${bar} mb-3 h-5 w-36`} />
      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`${DOC_CARD} hidden h-[480px] p-6 min-[1041px]:block`}>
          <div className={`${bar} h-12`} />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${bar} mt-4 h-8`} />
          ))}
        </div>
        <div className={`${DOC_CARD} p-6`}>
          <div className={`${bar} h-7 w-24`} />
          <div className={`${bar} mt-3 h-9 w-2/3`} />
          <div className={`${bar} mt-3 h-5 w-1/2`} />
          <div className="mt-6 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`${bar} h-12`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

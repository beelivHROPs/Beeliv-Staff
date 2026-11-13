import type { ReactNode } from "react";
import { CARD as CARD_SHELL } from "./SectionCard";

/**
 * Card shells render as ONE solid box of the real card size (project lead:
 * solid sections, not bits inside a white card). `.ap-sk-box` (applicant.css)
 * fills the card and hides its placeholder contents, which only give it size.
 */
const CARD = `${CARD_SHELL} ap-sk-box`;

/**
 * Loading skeletons for the Applicant app (one per route, used by each
 * loading.tsx under app/applicant). Approved style: solid `ap-shimmer` tiles
 * (slow opacity pulse, reduced-motion handled in applicant.css). Each card is
 * one solid box at its real size, so the skeleton mirrors the page layout.
 * Server component - no state, no client code.
 */

/** Solid pulsing tile. Pass size + radius via className. */
function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ap-shimmer ${className}`} />;
}

/** Status wrapper + sr-only h1 (same idea as Staff's HeadingSkeleton). */
function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <h1 className="sr-only">{title}</h1>
      {children}
    </div>
  );
}

/** ScreenHeading / PageHeading placeholder: title line + subtitle. */
function HeadingSk({ eyebrow = false }: { eyebrow?: boolean }) {
  return (
    <div className="pt-1.5 pb-[18px]">
      {eyebrow ? <Sk className="mb-3 h-3.5 w-28 rounded-md" /> : null}
      <Sk className="h-9 w-3/4 max-w-[420px] rounded-xl min-[768px]:h-11" />
      <Sk className="mt-3 h-4 w-full max-w-[420px] rounded-md" />
    </div>
  );
}

function TabsSk({ n = 3 }: { n?: number }) {
  return (
    <div className="mb-4.5 flex gap-2 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className="h-10 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/** Card with a serif-title-sized header line (and optional action) + children. */
function CardSk({ title = true, action = false, className = "", children }: { title?: boolean; action?: boolean; className?: string; children?: ReactNode }) {
  return (
    <section className={`${CARD} min-w-0 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Sk className="h-7 w-44 max-w-[60%] rounded-lg" />
          {action ? <Sk className="h-9 w-24 rounded-xl" /> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** icon tile + two text lines (+ optional trailing button) list row. */
function RowSk({ first = false, action = true }: { first?: boolean; action?: boolean }) {
  return (
    <div className={`grid items-center gap-3.5 py-3.5 ${action ? "grid-cols-[44px_minmax(0,1fr)_auto] max-[640px]:grid-cols-[40px_minmax(0,1fr)]" : "grid-cols-[44px_minmax(0,1fr)]"} ${first ? "" : "border-t border-(--ap-line-2)"}`}>
      <Sk className="size-11 rounded-xl max-[640px]:size-10" />
      <div className="min-w-0">
        <Sk className="h-4 w-2/3 rounded-md" />
        <Sk className="mt-2 h-3.5 w-1/2 rounded-md" />
      </div>
      {action ? <Sk className="h-9 w-24 rounded-xl max-[640px]:col-start-2 max-[640px]:justify-self-start" /> : null}
    </div>
  );
}

function Rows({ n, action = true }: { n: number; action?: boolean }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <RowSk key={i} first={i === 0} action={action} />
      ))}
    </div>
  );
}

/** Label + value field pairs (dl grids). */
function FieldsSk({ n = 6, cols = "grid-cols-2 max-[640px]:grid-cols-1" }: { n?: number; cols?: string }) {
  return (
    <div className={`grid gap-x-6 gap-y-4 ${cols}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <Sk className="h-3.5 w-20 rounded-md" />
          <Sk className="mt-2 h-5 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function TextLines({ n = 3 }: { n?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className={`h-4 rounded-md ${i === n - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function SummaryTilesSk({ n, cols }: { n: number; cols: string }) {
  return (
    <div className={`grid gap-3 min-[768px]:gap-4 ${cols}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="ap-card ap-sk-box flex min-w-0 items-center gap-3 rounded-[18px] p-3.5 min-[768px]:p-4 max-[420px]:flex-col max-[420px]:items-start max-[420px]:gap-2 min-[768px]:max-[1100px]:flex-col min-[768px]:max-[1100px]:items-start">
          <Sk className="size-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 max-[420px]:w-full">
            <Sk className="h-3.5 w-16 rounded-md" />
            <Sk className="mt-2 h-6 w-10 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Job card (JobCard) placeholder. */
function JobCardSk() {
  return (
    <div className="ap-sk-box relative rounded-[24px] border border-(--ap-line) bg-white p-5 max-[767px]:p-3.5">
      {/* Notch badge placeholder (matches the notch card). */}
      <Sk className="absolute top-1 right-1 size-[60px] rounded-full" />
      <div className="grid grid-cols-[116px_minmax(0,1fr)] gap-x-5 max-[767px]:grid-cols-[84px_minmax(0,1fr)] max-[767px]:gap-x-3.5 max-[380px]:grid-cols-[68px_minmax(0,1fr)]">
        <Sk className="size-[116px] rounded-[14px] max-[767px]:size-[84px] max-[767px]:rounded-xl max-[380px]:size-[68px]" />
        <div className="min-w-0">
          <Sk className="h-5 w-3/5 rounded-md" />
          <Sk className="mt-2 h-4 w-2/5 rounded-md" />
          <Sk className="mt-2 h-4 w-1/3 rounded-md" />
          <div className="mt-3 flex flex-wrap gap-2 max-[767px]:hidden">
            <Sk className="h-[30px] w-20 rounded-full" />
            <Sk className="h-[30px] w-24 rounded-full" />
            <Sk className="h-[30px] w-16 rounded-full" />
          </div>
        </div>
      </div>
      <Sk className="mt-3 h-4 w-1/2 rounded-md" />
      <div className="mt-3 flex items-center justify-between border-t border-(--ap-line) pt-3.5">
        <Sk className="h-4 w-20 rounded-md" />
        <Sk className="h-4 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Main column + 340px aside at >=1241px. */
const MAIN_ASIDE = "grid grid-cols-1 items-start gap-5 min-[1241px]:grid-cols-[minmax(0,1fr)_340px]";

/* -------------------------------------------------------------------------- */

export function OverviewSkeleton() {
  return (
    <Screen title="Overview">
      <div className="flex flex-col gap-5 min-[768px]:gap-6">
        {/* Hero: ONE solid box the size of the hero (project lead: design the
            container, not the picture/text inside it) - same as Staff Home. */}
        <Sk className="h-[380px] w-full rounded-[22px] min-[768px]:h-[300px] min-[768px]:rounded-3xl min-[1241px]:h-[238px]" />

        <SummaryTilesSk n={4} cols="grid-cols-2 min-[768px]:grid-cols-4" />

        {/* Quick actions (phones only) */}
        <div className="-mx-4 flex gap-2 overflow-hidden px-4 pb-1 min-[768px]:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Sk key={i} className="h-11 w-32 shrink-0 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 min-[768px]:gap-5 min-[1241px]:grid-cols-[minmax(0,1fr)_340px] min-[1241px]:items-start min-[1600px]:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-4 min-[768px]:gap-5">
            {/* Current application */}
            <CardSk action>
              <div className="flex items-start gap-3 min-[768px]:gap-4">
                <Sk className="size-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <Sk className="h-5 w-2/5 rounded-md" />
                  <Sk className="mt-2 h-4 w-3/5 rounded-md" />
                </div>
              </div>
              <div className="mt-6 hidden gap-2 min-[641px]:grid min-[641px]:grid-cols-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Sk key={i} className="h-12 rounded-lg" />
                ))}
              </div>
              <div className="mt-5 flex gap-1 min-[641px]:hidden">
                {Array.from({ length: 5 }, (_, i) => (
                  <Sk key={i} className="h-2 flex-1 rounded-full" />
                ))}
              </div>
              <Sk className="mt-5 h-[76px] w-full rounded-[14px] min-[768px]:h-[84px]" />
            </CardSk>

            {/* Recommended jobs */}
            <CardSk action>
              <div className="-mx-4 flex gap-3 overflow-hidden px-4 min-[641px]:mx-0 min-[641px]:grid min-[641px]:grid-cols-2 min-[641px]:gap-4 min-[641px]:px-0 min-[900px]:grid-cols-3 min-[641px]:max-[899px]:[&>*:nth-child(3)]:hidden">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="ap-sk-box flex-[0_0_78%] overflow-hidden rounded-[18px] border border-(--ap-line) bg-white min-[641px]:flex-none">
                    <Sk className="h-[150px] w-full rounded-none" />
                    <div className="flex flex-col gap-2.5 p-[18px] pb-5">
                      <Sk className="h-5 w-4/5 rounded-md" />
                      <Sk className="h-4 w-1/2 rounded-md" />
                      <div className="flex gap-1.5">
                        <Sk className="h-6 w-20 rounded-full" />
                        <Sk className="h-6 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardSk>

            {/* Recent applications table (tablet and up) */}
            <CardSk action className="hidden min-[768px]:block">
              {Array.from({ length: 3 }, (_, i) => (
                <Sk key={i} className="mb-3 h-10 w-full rounded-[10px] last:mb-0" />
              ))}
            </CardSk>
          </div>

          {/* Side column */}
          <div className="hidden gap-5 min-[768px]:grid min-[768px]:grid-cols-2 min-[1241px]:flex min-[1241px]:flex-col">
            <CardSk className="min-[768px]:max-[1240px]:col-span-2">
              <Rows n={3} action={false} />
            </CardSk>
            <CardSk>
              <TextLines n={4} />
            </CardSk>
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function JobsSkeleton() {
  return (
    <Screen title="Jobs">
      <HeadingSk eyebrow />
      {/* Search bar */}
      <div className="ap-sk-box mb-[22px] grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2.5 rounded-[18px] border border-(--ap-line) bg-white p-2.5 max-[1040px]:grid-cols-[minmax(0,1fr)_auto_auto] max-[767px]:grid-cols-[minmax(0,1fr)_auto] max-[767px]:gap-2 max-[767px]:rounded-2xl">
        <Sk className="h-[52px] rounded-[14px] max-[767px]:h-12" />
        <Sk className="h-[52px] rounded-[14px] max-[1040px]:hidden" />
        <Sk className="h-[52px] w-28 rounded-[14px] min-[1041px]:hidden max-[767px]:h-12 max-[767px]:w-24" />
        <Sk className="h-[52px] w-32 rounded-[14px] max-[767px]:hidden" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 min-[1041px]:grid-cols-[260px_minmax(0,1fr)] min-[1241px]:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-[1040px]:hidden">
          <div className="ap-sk-box rounded-[20px] border border-(--ap-line) bg-white p-6 min-[1041px]:max-[1100px]:p-[22px]">
            <div className="flex items-baseline justify-between">
              <Sk className="h-7 w-20 rounded-lg" />
              <Sk className="h-4 w-16 rounded-md" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mt-5">
                <Sk className="h-4 w-24 rounded-md" />
                <Sk className="mt-3 h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Sk className="h-5 w-32 rounded-md" />
            <Sk className="h-10 w-36 rounded-xl" />
          </div>
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <JobCardSk key={i} />
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function JobDetailSkeleton() {
  return (
    <Screen title="Job details">
      <Sk className="mb-3 h-5 w-32 rounded-md" />
      <section className={`${CARD} mb-5`}>
        <div className="flex items-center gap-[18px] max-[767px]:grid max-[767px]:grid-cols-[auto_1fr_auto] max-[767px]:items-start max-[767px]:gap-x-3 max-[767px]:gap-y-3.5">
          <Sk className="size-[72px] shrink-0 rounded-2xl max-[767px]:size-14" />
          <div className="min-w-0 flex-1">
            <Sk className="h-8 w-3/4 rounded-xl" />
            <Sk className="mt-2.5 h-4 w-1/2 rounded-md" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Sk className="h-6 w-20 rounded-full" />
              <Sk className="h-6 w-24 rounded-full" />
              <Sk className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <Sk className="size-10 shrink-0 rounded-xl min-[768px]:hidden" />
          <div className="flex gap-2.5 max-[767px]:hidden">
            <Sk className="h-12 w-28 rounded-xl" />
            <Sk className="h-12 w-36 rounded-xl" />
          </div>
        </div>
      </section>
      <div className={MAIN_ASIDE}>
        <div className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <TextLines n={5} />
          </CardSk>
          <CardSk>
            <TextLines n={4} />
          </CardSk>
          <CardSk>
            <TextLines n={4} />
          </CardSk>
        </div>
        <aside className="flex min-w-0 flex-col gap-5 max-[1240px]:hidden">
          <CardSk>
            <FieldsSk n={4} cols="grid-cols-1" />
            <Sk className="mt-5 h-12 w-full rounded-xl" />
          </CardSk>
        </aside>
      </div>
      {/* Phone/tablet apply bar */}
      <Sk className="mt-5 h-12 w-full rounded-xl min-[1241px]:hidden" />
    </Screen>
  );
}

export function ApplicationsSkeleton() {
  return (
    <Screen title="My applications">
      <HeadingSk />
      <TabsSk n={4} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <article key={i} className="ap-sk-box grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-(--ap-line) bg-white p-4.5 max-[767px]:grid-cols-[48px_minmax(0,1fr)] max-[767px]:p-4">
            <Sk className="size-14 rounded-xl max-[767px]:size-12" />
            <div className="min-w-0">
              <Sk className="h-5 w-3/5 rounded-md" />
              <Sk className="mt-2 h-4 w-2/5 rounded-md" />
              <Sk className="mt-3 h-2 w-full max-w-[320px] rounded-full" />
            </div>
            <Sk className="h-11 w-40 rounded-xl max-[767px]:col-span-full max-[767px]:w-full" />
          </article>
        ))}
      </div>
    </Screen>
  );
}

export function ApplicationDetailSkeleton() {
  return (
    <Screen title="Application details">
      <Sk className="mb-3 h-5 w-36 rounded-md" />
      <section className={`${CARD} mb-5`}>
        <div className="flex items-start gap-4 max-[640px]:grid max-[640px]:grid-cols-[auto_minmax(0,1fr)] max-[640px]:gap-x-3.5 max-[640px]:gap-y-2.5">
          <Sk className="size-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Sk className="h-7 w-2/3 rounded-lg" />
            <Sk className="mt-2 h-4 w-1/2 rounded-md" />
          </div>
          <Sk className="h-7 w-28 rounded-full max-[640px]:col-span-full" />
        </div>
        <Sk className="mt-5 h-[76px] w-full rounded-[14px]" />
      </section>
      <div className={MAIN_ASIDE}>
        <div className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <FieldsSk n={6} />
          </CardSk>
          <CardSk>
            <Rows n={3} />
          </CardSk>
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <Rows n={4} action={false} />
          </CardSk>
        </aside>
      </div>
    </Screen>
  );
}

export function OfferSkeleton() {
  return (
    <Screen title="Job offer">
      <Sk className="mb-3 h-5 w-36 rounded-md" />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <section className={CARD}>
            <div className="flex items-start gap-4">
              <Sk className="size-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Sk className="h-3.5 w-24 rounded-md" />
                <Sk className="mt-2 h-10 w-4/5 rounded-xl max-[767px]:h-8" />
                <Sk className="mt-3 h-4 w-1/2 rounded-md" />
              </div>
            </div>
            <div className="mt-5 border-t border-(--ap-line-2) pt-5">
              <FieldsSk n={6} cols="grid-cols-3 max-[900px]:grid-cols-2" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Sk className="h-12 w-40 rounded-xl max-[767px]:flex-1" />
              <Sk className="h-12 w-32 rounded-xl max-[767px]:flex-1" />
            </div>
          </section>
          <CardSk>
            <TextLines n={4} />
          </CardSk>
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <Rows n={3} action={false} />
          </CardSk>
        </aside>
      </div>
    </Screen>
  );
}

export function DocumentationSkeleton() {
  return (
    <Screen title="Onboarding documentation">
      <Sk className="mb-3 h-5 w-36 rounded-md" />
      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`${CARD} hidden min-[1041px]:block`}>
          <Sk className="h-12 w-full rounded-lg" />
          {Array.from({ length: 8 }, (_, i) => (
            <Sk key={i} className="mt-4 h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className={CARD}>
          <Sk className="h-7 w-24 rounded-lg" />
          <Sk className="mt-3 h-9 w-2/3 rounded-xl" />
          <Sk className="mt-3 h-5 w-1/2 rounded-md" />
          <div className="mt-6 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {Array.from({ length: 8 }, (_, i) => (
              <Sk key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

export function InterviewsSkeleton() {
  return (
    <Screen title="Interviews & Assessments">
      <HeadingSk />
      <TabsSk n={2} />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }, (_, i) => (
          <section key={i} className={`${CARD} grid grid-cols-[88px_minmax(0,1fr)] gap-5 max-[767px]:grid-cols-1`}>
            <Sk className="h-[92px] w-[88px] rounded-2xl max-[767px]:h-14 max-[767px]:w-full" />
            <div className="min-w-0">
              <Sk className="h-6 w-2/3 rounded-lg" />
              <Sk className="mt-2 h-4 w-1/2 rounded-md" />
              <div className="mt-3 mb-4 flex flex-col gap-2">
                <Sk className="h-4 w-3/5 rounded-md" />
                <Sk className="h-4 w-2/5 rounded-md" />
              </div>
              <Sk className="h-[88px] w-full rounded-xl" />
              <div className="mt-4 flex gap-2.5">
                <Sk className="h-11 w-36 rounded-xl max-[767px]:flex-1" />
                <Sk className="h-11 w-28 rounded-xl max-[767px]:flex-1" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </Screen>
  );
}

export function DocumentsSkeleton() {
  return (
    <Screen title="Documents">
      <HeadingSk />
      <div className="mb-5 grid grid-cols-3 gap-3.5 max-[767px]:gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="ap-card ap-sk-box flex min-w-0 items-center gap-3 rounded-[18px] p-3.5 max-[767px]:flex-col max-[767px]:items-start max-[767px]:gap-2 min-[768px]:p-4">
            <Sk className="size-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 max-[767px]:w-full">
              <Sk className="h-3.5 w-16 rounded-md" />
              <Sk className="mt-2 h-6 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <CardSk action className="mb-[22px]">
        <Rows n={2} />
      </CardSk>
      <CardSk action>
        <Rows n={4} />
      </CardSk>
    </Screen>
  );
}

export function ProfileSkeleton() {
  return (
    <Screen title="Profile">
      <section className={`${CARD} mb-5 grid grid-cols-[minmax(0,1fr)_340px] items-center gap-6 max-[1240px]:grid-cols-1 max-[767px]:gap-4`}>
        <div className="flex items-center gap-4">
          <Sk className="size-20 shrink-0 rounded-full max-[767px]:size-16" />
          <div className="min-w-0 flex-1">
            <Sk className="h-8 w-2/3 rounded-xl" />
            <Sk className="mt-2.5 h-4 w-1/2 rounded-md" />
          </div>
        </div>
        <Sk className="h-[92px] w-full rounded-[18px]" />
      </section>
      <div className="mb-[18px] flex gap-1.5 overflow-hidden max-[767px]:hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Sk key={i} className="h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1240px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <CardSk action>
            <FieldsSk n={6} />
          </CardSk>
          <CardSk action>
            <Rows n={2} />
          </CardSk>
          <CardSk action>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Sk key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </CardSk>
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <Rows n={3} action={false} />
          </CardSk>
        </aside>
      </div>
    </Screen>
  );
}

export function SettingsSkeleton() {
  return (
    <Screen title="Settings">
      <HeadingSk />
      {/* Phone section picker */}
      <Sk className="mb-4 h-12 w-full rounded-xl min-[768px]:hidden" />
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <nav aria-hidden="true" className="ap-card ap-sk-box rounded-[20px] p-2.5 max-[1040px]:flex max-[1040px]:gap-1 max-[1040px]:overflow-hidden max-[767px]:hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Sk key={i} className="m-0.5 h-[42px] rounded-[10px] max-[1040px]:w-32 max-[1040px]:shrink-0 min-[1041px]:w-[calc(100%-4px)]" />
          ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-5">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSk key={i}>
              <Rows n={3} />
            </CardSk>
          ))}
        </div>
      </div>
    </Screen>
  );
}

export function NotificationsSkeleton() {
  return (
    <Screen title="Notifications">
      <HeadingSk />
      <TabsSk n={2} />
      {Array.from({ length: 2 }, (_, g) => (
        <div key={g}>
          <Sk className={`mb-2.5 h-3.5 w-20 rounded-md ${g === 0 ? "mt-1.5" : "mt-[18px]"}`} />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: g === 0 ? 3 : 2 }, (_, i) => (
              <div key={i} className="ap-sk-box grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-3.5 rounded-[14px] border border-(--ap-line) bg-white px-[18px] py-4 max-[767px]:grid-cols-[40px_minmax(0,1fr)] max-[767px]:p-3.5">
                <Sk className="size-11 rounded-full max-[767px]:size-10" />
                <div className="min-w-0">
                  <Sk className="h-4 w-2/3 rounded-md" />
                  <Sk className="mt-2 h-3.5 w-full max-w-[420px] rounded-md" />
                </div>
                <Sk className="h-3.5 w-14 rounded-md max-[767px]:hidden" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Screen>
  );
}

export function HelpSkeleton() {
  return (
    <Screen title="Help & support">
      <HeadingSk />
      <div className="mb-5 grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="ap-card ap-sk-box flex items-center gap-3 rounded-[18px] p-4">
            <Sk className="size-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Sk className="h-4 w-2/3 rounded-md" />
              <Sk className="mt-2 h-3.5 w-1/2 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1240px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <Sk className="mb-4 h-12 w-full rounded-xl" />
            {Array.from({ length: 5 }, (_, i) => (
              <Sk key={i} className="mb-3 h-12 w-full rounded-xl last:mb-0" />
            ))}
          </CardSk>
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <CardSk>
            <Rows n={3} action={false} />
          </CardSk>
        </aside>
      </div>
    </Screen>
  );
}

export function StaffAccessSkeleton() {
  return (
    <Screen title="Staff access">
      <div className="flex flex-col gap-5">
        <section className={`${CARD} text-center`}>
          <div className="flex flex-col items-center">
            <Sk className="size-14 rounded-full" />
            <Sk className="mt-4 h-10 w-4/5 max-w-[520px] rounded-xl max-[767px]:h-8" />
            <Sk className="mt-3 h-4 w-full max-w-[52ch] rounded-md" />
          </div>
          <div className="mx-auto mt-5 grid max-w-[560px] grid-cols-2 gap-3 max-[520px]:grid-cols-1">
            <Sk className="h-12 rounded-xl" />
            <Sk className="h-12 rounded-xl" />
          </div>
        </section>
        <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-5">
            <CardSk>
              <Rows n={3} action={false} />
            </CardSk>
            <CardSk>
              <TextLines n={4} />
            </CardSk>
          </div>
          <aside className="flex min-w-0 flex-col gap-5">
            <CardSk>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Sk key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            </CardSk>
          </aside>
        </div>
      </div>
    </Screen>
  );
}

export function ApplySkeleton() {
  return (
    <Screen title="Application">
      <Sk className="mb-3 h-5 w-36 rounded-md" />
      <div className="grid grid-cols-1 items-start gap-5 min-[1041px]:grid-cols-[260px_minmax(0,1fr)]">
        <div className={`${CARD} hidden min-[1041px]:block`}>
          <Sk className="h-12 w-full rounded-lg" />
          {Array.from({ length: 6 }, (_, i) => (
            <Sk key={i} className="mt-4 h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className={CARD}>
          <Sk className="h-7 w-16 rounded-lg" />
          <Sk className="mt-3 h-9 w-2/3 rounded-xl" />
          <Sk className="mt-3 h-5 w-1/2 rounded-md" />
          <div className="mt-6 grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Sk key={i} className="h-12 rounded-lg" />
            ))}
          </div>
          <div className="mt-6.5 flex items-center gap-2.5 border-t border-(--ap-line-2) pt-4.5">
            <Sk className="h-12 w-28 rounded-xl max-[767px]:flex-1" />
            <Sk className="ml-auto h-12 w-36 rounded-xl max-[767px]:flex-1" />
          </div>
        </div>
      </div>
    </Screen>
  );
}

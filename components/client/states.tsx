import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase, Calendar, Clock3, LockKeyhole, Plus, ShieldCheck, Users, UsersRound } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { NEW_REQUEST_HREF } from "@/lib/client/links";
import type { LoadStatus } from "@/lib/client/types";
import { BarChart3, CircleCheck, Wallet } from "./icons";
import { ChartEmptyState } from "./charts";
import { PhoneSkeleton } from "./phone";

/**
 * Shared Client page states (brief section 31) so every Client page renders
 * loading / error / restricted / empty the SAME way, driven by the hook
 * `status` ("loading" | "ready" | "empty" | "error" | "restricted").
 *
 * Page-level:    <PageState status=... title="Payroll" what="your payroll schedule" retry={retry} empty={<ClientEmpty kind="payroll" />}>...</PageState>
 * Inside a card: <ClientEmpty kind="attendance" inline /> (uses ChartEmptyState), plus ChartSkeleton / ChartErrorState / ChartRestrictedState from ./charts.
 * Skeletons are solid .ap-shimmer boxes at the real layout's proportions.
 * Nothing here invents data: an empty state says what is missing and what happens next.
 */

const sk = "ap-shimmer rounded-2xl";

/** Solid page skeleton. `layout`: "list" (rows), "cards" (grid of cards), "report" (filter bar + chart + table). */
export function ClientPageSkeleton({ title, layout = "list" }: { title: string; layout?: "list" | "cards" | "report" }) {
  return (
    <>
    <PhoneSkeleton label={`Loading ${title}`} hero={layout === "report"} tiles={layout === "report" ? 2 : 0} cards={layout === "cards" ? 3 : 4} />
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`} className="flex flex-col gap-4 max-[767px]:hidden">
      <div className="pt-3 pb-2">
        <h1 className="ap-serif text-[30px] min-[768px]:text-[44px]">{title}</h1>
        <div className={`${sk} mt-3 h-4 w-72 max-w-full`} />
      </div>
      {layout === "list" ? (
        <>
          <div className={`${sk} h-12 w-60 max-w-full`} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${sk} h-[92px]`} />
          ))}
        </>
      ) : null}
      {layout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1241px]:grid-cols-3">
          <div className={`${sk} h-[240px]`} />
          <div className={`${sk} h-[240px]`} />
          <div className={`${sk} h-[240px] min-[768px]:col-span-2 min-[1241px]:col-span-1`} />
        </div>
      ) : null}
      {layout === "report" ? (
        <>
          <div className={`${sk} h-12 w-full max-w-[640px]`} />
          <div className={`${sk} h-[132px] min-[768px]:h-[84px]`} />
          <div className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4 min-[768px]:gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${sk} h-[84px]`} />
            ))}
          </div>
          <div className={`${sk} h-[300px]`} />
          <div className={`${sk} h-[260px]`} />
        </>
      ) : null}
    </div>
    </>
  );
}

/** "We couldn't load ..." with retry. Nothing about the account changed. */
export function ClientPageError({ title, what, retry }: { title: string; what: string; retry: () => void }) {
  return (
    <div className="mx-auto max-w-[860px] pt-4 min-[768px]:pt-10">
      <h1 className="sr-only">{title}</h1>
      <ErrorPanel title={`We couldn't load ${what}`} retry={retry} />
    </div>
  );
}

/** Backend said this account may not see the domain (403 / RLS). Never offers a workaround. */
export function ClientPageRestricted({ title, what }: { title: string; what: string }) {
  return (
    <div className="mx-auto max-w-[860px] pt-4 min-[768px]:pt-10">
      <h1 className="sr-only">{title}</h1>
      <section className="ap-card flex flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-9" role="status">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-(--ap-line-2) text-(--ap-muted)">
          <LockKeyhole className="size-7" aria-hidden="true" />
        </span>
        <h2 className="ap-serif text-[28px] leading-tight min-[768px]:text-[34px]">This isn&apos;t available to your account</h2>
        <p className="ap-bd max-w-[58ch]">{what} isn&apos;t shared with your account. If you think you should have access, ask your Beeliv team.</p>
        <Link href="/client/support" className="ap-btn ap-btn-s mt-1 h-12 max-[480px]:w-full">
          Contact Beeliv
        </Link>
      </section>
    </div>
  );
}

export type EmptyKind = "workforce" | "attendance" | "schedule" | "candidates" | "recruitment" | "compliance" | "compliance-clear" | "payroll" | "reports";

const EMPTY: Record<EmptyKind, { icon: LucideIcon; title: string; description: string; request?: boolean }> = {
  workforce: { icon: UsersRound, title: "No workforce assigned yet", description: "Once Beeliv places staff at your outlet, you'll see who's on shift, attendance, schedules and compliance here.", request: true },
  attendance: { icon: Clock3, title: "No attendance records yet", description: "Attendance appears here once your staff are scheduled and clock in. Nothing is estimated in the meantime." },
  schedule: { icon: Calendar, title: "No schedule yet", description: "When Beeliv schedules shifts for your outlet, coverage and the week ahead show here." },
  candidates: { icon: Users, title: "No candidates awaiting your review", description: "When Beeliv HR submits candidates for a role you asked for, they appear here and you're notified." },
  recruitment: { icon: Briefcase, title: "No recruitment activity yet", description: "Tell Beeliv what staff you need and progress shows here, from request to candidates ready for review.", request: true },
  compliance: { icon: ShieldCheck, title: "No compliance records yet", description: "Once staff are assigned, their operational documents are tracked here." },
  "compliance-clear": { icon: CircleCheck, title: "No compliance issues", description: "Every operational document is complete. We'll flag anything that needs attention." },
  payroll: { icon: Wallet, title: "No payroll schedule yet", description: "When Beeliv schedules a pay period for your outlet, it shows here." },
  reports: { icon: BarChart3, title: "No report data for this period", description: "Try a different date range or clear a filter. Days with no records are left out rather than shown as zero." },
};

/**
 * Intentional empty state. `inline` = inside a card/panel (dashed ChartEmptyState);
 * default = a full-width page card in the Overview's "No workforce" style.
 */
export function ClientEmpty({ kind, inline = false, height, action }: { kind: EmptyKind; inline?: boolean; height?: number; action?: ReactNode }) {
  const e = EMPTY[kind];
  const cta =
    action ??
    (e.request ? (
      <Link href={NEW_REQUEST_HREF} className={inline ? "ap-btn ap-btn-s ap-btn-sm mt-1" : "ap-btn ap-btn-p mt-1 h-12 text-white! max-[480px]:w-full"}>
        <Plus className="size-4" aria-hidden="true" /> Request staff
      </Link>
    ) : null);
  if (inline) return <ChartEmptyState icon={e.icon} title={e.title} description={e.description} action={cta} height={height} />;
  const Icon = e.icon;
  return (
    <section className="ap-card flex flex-col items-start gap-3 rounded-[20px] p-6 min-[768px]:p-9">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-(--ap-tint) text-(--ap-violet)">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h2 className="ap-serif text-[28px] leading-tight min-[768px]:text-[34px]">{e.title}</h2>
      <p className="ap-bd max-w-[58ch]">{e.description}</p>
      {cta}
    </section>
  );
}

/** Routes a hook `status` to the right state; renders `children` only when ready. */
export function PageState({
  status,
  title,
  what,
  retry,
  skeleton,
  layout,
  empty,
  children,
}: {
  status: LoadStatus;
  title: string;
  /** Lower-case object of the sentence, e.g. "your payroll schedule". */
  what: string;
  retry: () => void;
  skeleton?: ReactNode;
  layout?: "list" | "cards" | "report";
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (status === "loading") return <>{skeleton ?? <ClientPageSkeleton title={title} layout={layout} />}</>;
  if (status === "error") return <ClientPageError title={title} what={what} retry={retry} />;
  if (status === "restricted") return <ClientPageRestricted title={title} what={`${what.charAt(0).toUpperCase()}${what.slice(1)}`} />;
  if (status === "empty" && empty) return <>{empty}</>;
  return <>{children}</>;
}

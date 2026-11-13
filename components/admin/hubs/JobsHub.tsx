"use client";

/**
 * Jobs hub: the vacancy list plus the hiring steps. First view is the standard
 * Admin list: header (one primary action), search + Filters, summary line, list.
 * The seven hiring-step links (with counts from existing adapters, a dash while
 * loading) sit in the header's "..." menu, so every one stays reachable.
 * The vacancy list's own page title is hidden here because this page has one.
 */
import Link from "next/link";
import { ClipboardList, BookOpen } from "@/components/staff/icons";
import { Award, CalendarCheck, FileCheck2, FileText, Plus } from "@/components/applicant/icons";
import { UserPlus } from "@/components/client/icons";
import { AdminPageHeader, MoreMenu } from "@/components/admin/standard";
import { VacanciesList } from "@/components/admin/vacancies/VacanciesList";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import type { LucideIcon } from "@/components/applicant/icons";
import { useAdminSession, useHrOverview } from "@/lib/admin/hooks";
import { NEW_VACANCY_HREF } from "@/lib/admin/links";
import { useClientReviews } from "@/lib/admin/client-review/hooks";
import { useOffers } from "@/lib/admin/offers/hooks";
import { useAssessments } from "@/lib/admin/assessments/hooks";
import { useForms } from "@/lib/admin/tests/hooks";

const HIDE_INNER_TITLE = "[&_div:has(>div>h1.ap-pagehead-title)]:hidden";

interface Step {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One plain-language line saying what the page is for. */
  hint: string;
  count?: number;
}

export function JobsHub() {
  const { data: session } = useAdminSession();
  const { data: ov } = useHrOverview();
  const offers = useOffers({ search: "", tab: "all", clientId: "", vacancyId: "" });
  const reviews = useClientReviews({ search: "", tab: "ready", clientId: "", vacancyId: "", limit: 1 });
  const assessments = useAssessments({ search: "", tab: "all", typeId: "", vacancyId: "", sort: "newest", page: 1, pageSize: 1 });
  const forms = useForms({ search: "", tab: "all", status: "", sort: "updated", pageSize: 1 });
  const o = offers.data?.tabCounts;
  const r = reviews.data?.tabCounts;

  const steps: Step[] = [
    { href: "/admin/recruitment/shortlisting", label: "Shortlisting", hint: "Applicants to screen", icon: ClipboardList, count: ov?.metrics.shortlisted },
    { href: "/admin/recruitment/interviews", label: "Interviews", hint: "Booked and to schedule", icon: CalendarCheck, count: ov?.metrics.interviewsPending },
    { href: "/admin/recruitment/assessments", label: "Assessments", hint: "Practical results", icon: FileCheck2, count: assessments.data?.tabCounts.all },
    { href: "/admin/recruitment/tests", label: "Tests & Forms", hint: "Tests and appraisal forms", icon: BookOpen, count: forms.data?.tabCounts.all },
    { href: "/admin/recruitment/client-review", label: "Client Review", hint: "Shortlists sent to clients", icon: UserPlus, count: r ? r.ready + r.awaiting + r.feedback : undefined },
    { href: "/admin/recruitment/offers", label: "Offers", hint: "Drafts and approvals", icon: Award, count: o ? o.draft + o["pending-approval"] + o.approved : undefined },
    { href: "/admin/recruitment/documentation", label: "Documentation", hint: "Documents to check", icon: FileText, count: ov?.metrics.documentationPending },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Jobs"
        summary={<ScopeNote className="" />}
        primary={
          session?.capabilities.canCreateVacancy ? (
            <Link href={NEW_VACANCY_HREF} className="ap-btn ap-btn-p h-11 px-5 text-[15px] font-semibold text-white!">
              <Plus className="size-4" aria-hidden="true" /> New vacancy
            </Link>
          ) : undefined
        }
        more={
          <span className="min-[768px]:hidden">
            <MoreMenu label="More: hiring steps" sections={[{ title: "Hiring steps", items: steps.map((s) => ({ key: s.href, label: s.label, icon: s.icon, href: s.href, meta: s.count ?? "-" })) }]} />
          </span>
        }
      />
      <ScopeGate>
        {/* Desktop and tablet: the seven hiring steps as one compact row (scrolls sideways when narrow). Phones keep them in the "..." menu. */}
        <nav aria-label="Hiring steps" className="mb-6 max-[767px]:hidden">
          <p className="m-0 mb-2.5 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">Hiring steps</p>
          <ul className="ap-scrollbar-none m-0 flex list-none gap-3 overflow-x-auto p-0 pb-0.5">
            {steps.map((s) => (
              <li key={s.href} className="flex min-w-[128px] flex-1">
                <Link href={s.href} className="flex w-full flex-col gap-2.5 rounded-xl border border-(--ap-line) bg-(--ap-surface) p-3 transition-colors hover:border-(--ap-violet) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                  <span className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-[10px] bg-(--ap-tint) text-(--ap-violet)" aria-hidden="true">
                      <s.icon className="size-4" />
                    </span>
                    {s.count !== undefined ? <span className="min-w-6 rounded-full bg-(--ap-tint-2) px-2 py-0.5 text-center text-[12px] font-bold text-(--ap-plum) tabular-nums">{s.count}</span> : null}
                  </span>
                  <span>
                    <span className="block text-[14px] leading-tight font-bold text-(--ap-ink)">{s.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-(--ap-muted)">{s.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={HIDE_INNER_TITLE}>
          <VacanciesList />
        </div>
      </ScopeGate>
    </div>
  );
}

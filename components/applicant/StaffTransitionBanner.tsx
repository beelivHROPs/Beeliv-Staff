"use client";

/**
 * Overview banner for the locked applicant → staff transition. It follows the
 * applicant through each step without ever replacing the dashboard:
 * offer waiting → offer accepted (onboarding) → Staff Hub ready (guided setup)
 * → all set (Open Staff Hub).
 */
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clock3, Sparkles } from "@/components/applicant/icons";
import { useApplicantStore } from "@/lib/applicant/service";
import { setupDone, SETUP_TOTAL, STAFF_HUB_HOST, STAFF_HUB_URL, useStaffHubSetup } from "@/lib/applicant/staff-access";

const GRADIENT = "bg-[linear-gradient(135deg,#8a0aa3_0%,#5b087b_55%,#250044_100%)]";

export function StaffTransitionBanner({ hidePendingOffer = false }: { hidePendingOffer?: boolean } = {}) {
  const { applications, profile } = useApplicantStore();
  const setup = useStaffHubSetup();
  const ent = profile.staffEntitlement;
  const pending = applications.find((a) => a.offer?.status === "pending");
  const accepted = applications.find((a) => a.offer?.status === "accepted");

  if (ent.granted) {
    const done = setupDone(setup);
    if (done === SETUP_TOTAL) {
      return (
        <Banner
          icon={BriefcaseBusiness}
          eyebrow={`Staff · ${ent.outletName ?? ""}`}
          title="Your Staff Hub"
          body={`Schedules, attendance and more at ${STAFF_HUB_HOST}.`}
          cta={{ label: "Open Staff Hub", href: STAFF_HUB_URL }}
        />
      );
    }
    return (
      <Banner
        icon={Sparkles}
        eyebrow="You're on the team"
        title="Your Staff Hub is ready"
        body={`Staff access has been added to your account. ${done} of ${SETUP_TOTAL} setup steps done.`}
        cta={{ label: done ? "Continue setup" : "Set up Staff Hub", href: "/applicant/staff-access" }}
        progress={done / SETUP_TOTAL}
      />
    );
  }
  if (pending?.offer) {
    if (hidePendingOffer) return null;
    return (
      <Banner
        icon={Sparkles}
        eyebrow="You've been selected"
        title={`Offer: ${pending.offer.role} at ${pending.offer.outlet}`}
        body="Review your offer and respond."
        cta={{ label: "Review offer", href: `/applicant/applications/${pending.id}/offer` }}
      />
    );
  }
  if (accepted?.offer) {
    return (
      <Banner
        icon={Clock3}
        eyebrow="Offer accepted"
        title="Onboarding in progress"
        body={`Review your accepted offer and the next steps for ${accepted.offer.outlet}.`}
        cta={{ label: "View offer", href: `/applicant/applications/${accepted.id}/offer` }}
        quiet
      />
    );
  }
  return null;
}

function Banner({
  icon: Icon,
  eyebrow,
  title,
  body,
  cta,
  progress,
  quiet,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string; external?: boolean };
  progress?: number;
  quiet?: boolean;
}) {
  const btn = `ap-btn h-11 shrink-0 px-5 text-[15px] font-semibold max-[640px]:w-full ${quiet ? "ap-btn-p text-white!" : "border-0 bg-white text-(--ap-violet)! hover:bg-white/90"}`;
  return (
    <section
      className={`relative flex items-center gap-4 overflow-hidden rounded-[20px] p-5 max-[640px]:flex-col max-[640px]:items-start ${
        quiet ? "border border-(--ap-line) bg-white" : `${GRADIENT} text-white`
      }`}
    >
      {!quiet ? <span className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full bg-[radial-gradient(circle,rgba(224,168,46,.28),transparent_65%)]" aria-hidden="true" /> : null}
      <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-[14px] ${quiet ? "bg-(--ap-tint) text-(--ap-violet)" : "bg-white/14 text-[#f4d58d]"}`}>
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="relative min-w-0 flex-1">
        <span className={`block text-[12px] font-bold tracking-[.14em] uppercase ${quiet ? "text-(--ap-muted)" : "text-[#f4d58d]"}`}>{eyebrow}</span>
        <b className="ap-serif mt-0.5 block text-[24px] leading-tight">{title}</b>
        <span className={`mt-1 block text-[14px] ${quiet ? "text-(--ap-muted)" : "text-white/80"}`}>{body}</span>
        {progress !== undefined ? (
          <span className="mt-2.5 block h-1.5 max-w-[260px] overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            <i className="ap-fill block h-full rounded-full bg-[#f4d58d]" style={{ width: `${Math.max(6, progress * 100)}%` }} />
          </span>
        ) : null}
      </div>
      {cta.external ? (
        <a href={cta.href} target="_blank" rel="noopener noreferrer" className={`relative ${btn}`}>
          {cta.label} <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      ) : (
        <Link href={cta.href} className={`relative ${btn}`}>
          {cta.label} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

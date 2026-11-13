"use client";

/**
 * Employment offer — the applicant's step in the locked transition
 * (docs/requirements/beeliv-applicant-to-staff-transition-2026-09-29.md):
 * Selected → notification + email → REVIEW OFFER → ACCEPT → onboarding →
 * placement confirmed → staff access activated → Open Staff Hub.
 * The applicant area never disappears; staff access is added to the same account.
 */
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Calendar, Check, ChevronLeft, Download, Eye, FileText, MapPin, Sparkles, UserRound, Users } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { acceptOffer, confirmPlacement, declineOffer, useApplicantStore } from "@/lib/applicant/service";
import { STAFF_HUB_HOST } from "@/lib/applicant/staff-access";
import { formatDate } from "@/lib/applicant/time";
import { OfferAcceptedDialog } from "./OfferAcceptedDialog";
import { withPreloader } from "./Preloader";
import { confirmAction } from "./ConfirmDialog";
import { CompanyLogo, EmptyState } from "./primitives";
import { CARD } from "./SectionCard";
import { Reveal } from "./motion";

const NEXT_STEPS = [
  { title: "Accept your offer", sub: "Right here, once you've read the offer letter." },
  { title: "Onboarding", sub: "Beeliv confirms your placement and anything still needed." },
  { title: "Staff access added", sub: "Added to this same account — no new sign-up." },
  { title: "Open your Staff Hub", sub: `At ${STAFF_HUB_HOST} — your schedule, attendance and more.` },
];

export function OfferBody({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { applications, profile } = useApplicantStore();
  const app = applications.find((a) => a.id === applicationId);
  const offer = app?.offer;
  // "Offer accepted" pop-up, opened once right after accepting.
  const [celebrate, setCelebrate] = useState(false);
  const nextSteps = useRef<HTMLElement>(null);

  const back = (
    <Link href={`/applicant/applications/${applicationId}`} className="mb-1.5 inline-flex items-center gap-1.5 py-1 text-sm font-bold text-(--ap-violet) max-[1100px]:min-h-11">
      <ChevronLeft className="size-[15px]" aria-hidden="true" />
      Application progress
    </Link>
  );

  if (!app || !offer) {
    return (
      <div>
        {back}
        <Reveal as="section" className={`${CARD} p-6`}>
          <EmptyState
            icon={FileText}
            title="No offer yet"
            description="When Beeliv sends you an employment offer for this application, you'll review and respond to it here."
            action={
              <Link href="/applicant/applications" className="ap-btn ap-btn-s ap-btn-sm mt-1">
                My Applications
              </Link>
            }
          />
        </Reveal>
      </div>
    );
  }

  async function onAccept() {
    const ok = await confirmAction({
      tone: "neutral",
      icon: Check,
      title: `Accept the ${offer!.role} offer?`,
      description: `You're accepting the role at ${offer!.outlet}. Beeliv will start your onboarding.`,
      points: ["Your applicant account and history stay exactly as they are.", "Staff access is added to this same account once your placement is confirmed."],
      acknowledge: "I have read the offer letter",
      confirmLabel: "Accept offer",
    });
    if (!ok) return;
    await withPreloader("accept-offer", { role: offer!.role, company: offer!.outlet }, () => acceptOffer(applicationId));
    setCelebrate(true);
  }

  function seeNextSteps() {
    setCelebrate(false);
    // Wait for the pop-up to leave (scroll is locked while it's open).
    window.setTimeout(() => nextSteps.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 260);
  }

  async function onDecline() {
    const ok = await confirmAction({
      tone: "danger",
      title: "Decline this offer?",
      description: "This can't be undone. The application will be closed, and your profile stays in the Beeliv talent pool for other roles.",
      confirmLabel: "Decline offer",
      cancelLabel: "Keep the offer",
    });
    if (!ok) return;
    await declineOffer(applicationId, "");
    toast.add({ title: "Offer declined" });
  }

  async function simulatePlacement() {
    await withPreloader("activate-staff", {}, () => confirmPlacement(applicationId));
    router.push("/applicant/staff-access");
  }

  const facts: [string, string, typeof BriefcaseBusiness][] = [
    ["Position", offer.role, BriefcaseBusiness],
    ["Outlet", offer.outlet, Users],
    ["Location", offer.location, MapPin],
    ["Employment", offer.employmentType, FileText],
    ["Resumption date", formatDate(offer.resumptionDate), Calendar],
    ...(offer.reportingTo ? ([["Reporting to", offer.reportingTo, UserRound]] as [string, string, typeof BriefcaseBusiness][]) : []),
  ];

  const placed = offer.status === "accepted" && profile.staffEntitlement.granted;

  return (
    <div>
      {back}

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Offer header */}
          <Reveal as="section" className={`${CARD} relative overflow-hidden p-6 max-[767px]:p-5`}>
            <span className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-[radial-gradient(circle,rgba(138,10,163,.12),transparent_70%)]" aria-hidden="true" />
            <div className="relative flex items-start gap-4 max-[640px]:flex-col">
              <CompanyLogo name={offer.outlet} size={60} />
              <div className="min-w-0 flex-1">
                <span className="ap-eb">Employment offer</span>
                <h1 className="ap-serif mt-1 text-[40px] max-[767px]:text-[30px]">
                  {offer.role} at {offer.outlet}
                </h1>
                <p className="ap-sm mt-1.5">
                  Sent {formatDate(offer.sentAt)}
                  {offer.status === "pending" && offer.respondBy ? (
                    <>
                      {" · "}
                      <b className="font-bold text-(--ap-warn)">Please respond by {formatDate(offer.respondBy)}</b>
                    </>
                  ) : null}
                </p>
              </div>
              <span
                className={`ap-chip shrink-0 ${
                  offer.status === "pending" ? "ap-chip-warn" : offer.status === "accepted" ? "ap-chip-ok" : "ap-chip-mute"
                }`}
              >
                {offer.status === "pending" ? "Awaiting your response" : offer.status === "accepted" ? (placed ? "Placement confirmed" : "Accepted") : "Declined"}
              </span>
            </div>

            <dl className="relative mt-5 grid grid-cols-3 gap-x-5 gap-y-4 border-t border-(--ap-line-2) pt-5 max-[900px]:grid-cols-2">
              {facts.map(([k, v, Icon]) => (
                <div key={k} className="flex min-w-0 items-start gap-2.5">
                  <Icon className="mt-0.5 size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[13px] text-(--ap-muted)">{k}</dt>
                    <dd className="m-0 text-[15px] font-bold [overflow-wrap:anywhere]">{v}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Offer letter */}
            <div className="relative mt-5 flex items-center gap-3 rounded-[14px] border border-(--ap-line) bg-[#fbf8fd] p-3.5 max-[640px]:flex-wrap">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-(--ap-violet) shadow-[0_1px_2px_rgba(37,0,68,.06)]">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[15px]">Offer letter</b>
                <span className="block truncate text-[13px] text-(--ap-muted)">{offer.letterFileName}</span>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => toast.add({ title: "Opens a secure preview", description: "File storage isn't connected in this preview." })} className="ap-btn ap-btn-s ap-btn-sm">
                  <Eye className="size-4" aria-hidden="true" /> View
                </button>
                <button type="button" onClick={() => toast.add({ title: `Downloads ${offer.letterFileName}`, description: "File storage isn't connected in this preview." })} className="ap-btn ap-btn-s ap-btn-sm" aria-label="Download offer letter">
                  <Download className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Actions */}
            {offer.status === "pending" ? (
              <div className="relative mt-6 flex flex-wrap items-center gap-3 max-[640px]:flex-col-reverse max-[640px]:items-stretch">
                <button type="button" onClick={onDecline} className="ap-btn h-12 border-transparent bg-transparent px-4 text-[15px] font-semibold text-[#dc2626] hover:bg-[#fee2e2]">
                  Decline offer
                </button>
                <button type="button" onClick={onAccept} className="ap-btn ap-btn-p ap-btn-hero max-[640px]:flex-none min-[641px]:ml-auto">
                  <Check className="size-[18px]" aria-hidden="true" />
                  Accept offer
                </button>
              </div>
            ) : null}
          </Reveal>

          {placed ? (
            <Reveal as="section" className={`${CARD} flex items-center gap-4 p-5 max-[640px]:flex-col max-[640px]:items-start`}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-(--ap-ok-bg) text-(--ap-ok)">
                <Check className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[16px]">Placement confirmed — your Staff Hub is ready</b>
                <span className="text-[14px] text-(--ap-muted)">Staff access has been added to this account.</span>
              </div>
              <Link href="/applicant/staff-access" className="ap-btn ap-btn-p ap-btn-hero text-white!">
                <Sparkles className="size-4" aria-hidden="true" />
                Set up Staff Hub
              </Link>
            </Reveal>
          ) : null}

          {offer.status === "declined" ? (
            <Reveal as="section" className={`${CARD} p-6`}>
              <EmptyState
                icon={FileText}
                title="You declined this offer"
                description="This application is closed. Your profile stays in the Beeliv talent pool, so you can still be considered for other roles."
                action={
                  <Link href="/applicant/jobs" className="ap-btn ap-btn-s ap-btn-sm mt-1">
                    Browse jobs
                  </Link>
                }
              />
            </Reveal>
          ) : null}
        </div>

        {/* What happens next */}
        <aside ref={nextSteps} className={`${CARD} scroll-mt-24 p-5`}>
          <h2 className="ap-serif mb-3 text-[25px]">What happens next</h2>
          <ol className="m-0 list-none p-0">
            {NEXT_STEPS.map((s, i) => {
              const done = (i === 0 && offer.status === "accepted") || (i >= 1 && i <= 2 && placed);
              // Onboarding is the live step between accepting and Beeliv confirming placement.
              const current = i === 1 && offer.status === "accepted" && !placed;
              return (
                <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < NEXT_STEPS.length - 1 ? <span className="absolute top-8 bottom-0 left-[13px] w-0.5 bg-(--ap-line)" aria-hidden="true" /> : null}
                  <span
                    className={`relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                      done
                        ? "bg-(--ap-violet) text-white"
                        : current
                          ? "border-2 border-(--ap-violet) bg-white text-(--ap-violet) shadow-[0_0_0_4px_var(--ap-tint)]"
                          : "border-2 border-(--ap-line) bg-white text-(--ap-muted)"
                    }`}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" /> : i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <b className="flex flex-wrap items-center gap-2 text-[15px]">
                      {s.title}
                      {current ? <span className="ap-chip ap-chip-violet">In progress</span> : null}
                    </b>
                    <span className="text-[13px] text-(--ap-muted)">{s.sub}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          {offer.status === "accepted" && !placed && SHOW_PROTOTYPE_CONTROLS ? (
            // Stand-in for the backend confirming placement. The soft pulse says "this is the next step".
            <span className="mt-4 block rounded-full motion-safe:animate-[ap-pulse_2.2s_ease-out_infinite]">
              <button type="button" onClick={simulatePlacement} className="ap-btn ap-btn-p ap-btn-hero w-full text-white!">
                <Check strokeWidth={2.4} aria-hidden="true" />
                Confirm placement
              </button>
            </span>
          ) : null}
          <p className="mt-4 rounded-xl bg-(--ap-tint) px-3.5 py-3 text-[13px] leading-[1.55] text-(--ap-ink-2)">
            Your applicant area stays available — your applications and recruitment history don&apos;t go anywhere.
          </p>
        </aside>
      </div>

      <OfferAcceptedDialog
        open={celebrate}
        role={offer.role}
        outlet={offer.outlet}
        resumption={formatDate(offer.resumptionDate)}
        onClose={() => setCelebrate(false)}
        onSeeNext={seeNextSteps}
      />
    </div>
  );
}

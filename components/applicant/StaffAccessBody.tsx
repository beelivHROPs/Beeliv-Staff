"use client";

/**
 * Staff Hub handover (locked transition, 2026-09-29): staff access is ADDED
 * to the same account once placement is confirmed. This page celebrates it
 * once, then guides the new staff member to open the Staff Hub
 * (talent.beeliv.co), sign in through its own login path with the same
 * Beeliv account (no second sign-up), and save it to their device.
 * The applicant area stays available the whole time.
 */
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Calendar, CalendarCheck2, Check, Clock3, FileText, CircleHelp, ScrollText, ShieldCheck, Sparkles, UserRound } from "@/components/applicant/icons";
import { personaNames, useAvatarState } from "@/lib/applicant/avatar";
import { useApplicantStore } from "@/lib/applicant/service";
import { markCelebrated, setSetupStep, setupDone, SETUP_TOTAL, STAFF_HUB_HOST, STAFF_HUB_URL, useStaffHubSetup, type SetupStep } from "@/lib/applicant/staff-access";
import { formatDate } from "@/lib/applicant/time";
import { SubmittedMark } from "./apply/SubmittedMark";
import { ProgressMeter } from "./CountUp";
import { EmptyState } from "./primitives";
import { CARD } from "./SectionCard";
import { StatusChrome } from "./StatusChrome";
import { Reveal } from "./motion";

type Platform = "iphone" | "android" | "computer";

const SAVE_TIPS: Record<Platform, { label: string; steps: string[] }> = {
  iphone: { label: "iPhone", steps: [`Open ${STAFF_HUB_HOST} in Safari`, "Tap the Share button", "Choose “Add to Home Screen”, then Add"] },
  android: { label: "Android", steps: [`Open ${STAFF_HUB_HOST} in Chrome`, "Tap the ⋮ menu", "Choose “Add to Home screen” (or “Install app”)"] },
  computer: { label: "Computer", steps: [`Open ${STAFF_HUB_HOST}`, "Press Ctrl + D (⌘ + D on Mac)", "Save the bookmark"] },
};

/** Staff-app areas listed for Stage 2B in CLAUDE.md — what the Staff Hub is for. */
const HUB_AREAS: [string, typeof Calendar][] = [
  ["Schedules & shifts", CalendarCheck2],
  ["Attendance", Clock3],
  ["Leave requests", Calendar],
  ["SOPs", ScrollText],
  ["Payroll visibility", FileText],
  ["Notices", ShieldCheck],
];

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "computer";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "computer";
}

export function StaffAccessBody() {
  const { profile, applications } = useApplicantStore();
  const { gender } = useAvatarState();
  const setup = useStaffHubSetup();
  const ent = profile.staffEntitlement;
  const name = profile.preferredName || personaNames(gender).full.split(" ")[0];
  const done = setupDone(setup);
  const allDone = done === SETUP_TOTAL;
  // Celebrate on the first visit only (after that, a calm header).
  const [celebrate] = useState(() => !setup.celebrated);
  useEffect(() => {
    if (ent.granted) markCelebrated();
  }, [ent.granted]);

  if (!ent.granted) {
    const offerApp = applications.find((a) => a.offer && a.offer.status !== "declined");
    return (
      <>
      <StatusChrome />
      <Reveal as="section" className={`${CARD} p-6`}>
        <EmptyState
          icon={Sparkles}
          title="Staff access isn't on your account yet"
          description="When you accept an offer and Beeliv confirms your placement, staff access is added to this same account and your Staff Hub setup appears here."
          action={
            <Link href={offerApp ? `/applicant/applications/${offerApp.id}/offer` : "/applicant/applications"} className="ap-btn ap-btn-s ap-btn-sm mt-1">
              {offerApp ? "View your offer" : "My Applications"}
            </Link>
          }
        />
      </Reveal>
      </>
    );
  }

  const steps: { key: SetupStep; title: string; body: React.ReactNode }[] = [
    {
      key: "open",
      title: "Open your Staff Hub",
      body: (
        <>
          <p>
            Your Staff Hub is part of your Beeliv account at <b className="text-(--ap-ink)">{STAFF_HUB_HOST}</b> — same login, nothing new to set up.
          </p>
          <a
            href={STAFF_HUB_URL}
            onClick={() => setSetupStep("open", true)}
            className="ap-btn ap-btn-p ap-btn-hero mt-3 w-max text-white! max-[640px]:w-full"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Open {STAFF_HUB_HOST}
          </a>
        </>
      ),
    },
    {
      key: "save",
      title: "Save it to your phone",
      body: <SaveTips />,
    },
  ];
  const current = steps.find((s) => !setup[s.key])?.key ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Celebration / header */}
      <Reveal as="section" className={`${CARD} relative overflow-hidden p-7 text-center max-[767px]:p-5`}>
        <span className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,.10),transparent_65%)]" aria-hidden="true" />
        <div className="relative flex flex-col items-center gap-2">
          {celebrate ? (
            <SubmittedMark label="Welcome to the team" plane={false} />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-(--ap-ok-bg) text-(--ap-ok)">
              <Check className="size-8" strokeWidth={2.4} aria-hidden="true" />
            </span>
          )}
          <span className="ap-eb">Staff access activated</span>
          <h1 className="ap-serif text-[44px] max-[767px]:text-[30px]">Welcome to the team, {name}.</h1>
          <p className="ap-bd max-w-[56ch]">
            You&apos;re joining <b className="text-(--ap-ink)">{ent.outletName}</b> as <b className="text-(--ap-ink)">{ent.role ?? "staff"}</b>
            {ent.resumptionDate ? (
              <>
                {" "}
                — you start on <b className="text-(--ap-ink)">{formatDate(ent.resumptionDate)}</b>
              </>
            ) : null}
            .
          </p>
        </div>

        {/* One user, two areas */}
        <div className="relative mx-auto mt-5 grid max-w-[560px] grid-cols-2 gap-3 text-left max-[520px]:grid-cols-1">
          <AccessTile icon={UserRound} title="Applicant access" sub="This app · applications & history" />
          <AccessTile icon={BriefcaseBusiness} title="Staff access" sub={`Staff Hub · ${STAFF_HUB_HOST}`} highlight />
        </div>
        <p className="relative mt-3 text-[13px] text-(--ap-muted)">One account. Staff access was added to it — nothing here disappears.</p>
      </Reveal>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
        {/* Guided setup */}
        <Reveal as="section" className={`${CARD} p-6 max-[767px]:p-5`}>
          <h2 className="ap-serif mb-4 text-[29px] max-[767px]:text-[25px]">{allDone ? "You're all set" : "Set up your Staff Hub"}</h2>
          <ProgressMeter title={`${done} of ${SETUP_TOTAL} steps done`} value={Math.round((done / SETUP_TOTAL) * 100)} label="Staff Hub setup" />

          <ol className="m-0 mt-5 list-none p-0">
            <li className="flex items-center gap-3 border-t border-(--ap-line-2) py-3.5">
              <StepDot done />
              <div className="min-w-0 flex-1">
                <b className="block text-[15px]">Staff access added to your account</b>
                <span className="text-[13px] text-(--ap-muted)">By Beeliv{ent.grantedAt ? ` · ${formatDate(ent.grantedAt)}` : ""}</span>
              </div>
            </li>
            {steps.map((s, i) => {
              const isDone = setup[s.key];
              const open = current === s.key;
              return (
                <li key={s.key} className="border-t border-(--ap-line-2) py-3.5">
                  <div className="flex items-center gap-3">
                    <StepDot done={isDone} n={i + 2} active={open} />
                    <b className={`min-w-0 flex-1 text-[15px] ${isDone ? "text-(--ap-muted)" : ""}`}>{s.title}</b>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      onClick={() => setSetupStep(s.key, !isDone)}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-colors ${
                        isDone ? "bg-(--ap-ok-bg) text-(--ap-ok)" : "bg-(--ap-line-2) text-(--ap-ink-2) hover:bg-(--ap-tint) hover:text-(--ap-violet)"
                      }`}
                    >
                      {isDone ? <Check className="ap-bump size-3.5" strokeWidth={2.6} aria-hidden="true" /> : null}
                      {isDone ? "Done" : "Mark done"}
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 38 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="pt-2.5 pl-10 text-[15px] leading-[1.6] text-(--ap-ink-2) max-[640px]:pl-0">{s.body}</div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>

          {allDone ? (
            <a href={STAFF_HUB_URL} className="ap-btn ap-btn-p ap-btn-hero mt-4 w-full text-white! min-[768px]:w-max">
              <Sparkles className="size-4" aria-hidden="true" />
              Open Staff Hub
            </a>
          ) : null}
        </Reveal>

        <aside className="flex min-w-0 flex-col gap-5">
          <Reveal as="section" className={`${CARD} p-5`}>
            <h2 className="ap-serif mb-3 text-[25px]">In your Staff Hub</h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {HUB_AREAS.map(([label, Icon]) => (
                <li key={label} className="flex items-center gap-2 rounded-xl bg-(--ap-line-2) px-3 py-2.5 text-[13px] font-semibold text-(--ap-ink-2)">
                  <Icon className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal as="section" className={`${CARD} p-5`}>
            <h2 className="ap-serif mb-2 text-[25px]">Need a hand?</h2>
            <p className="ap-sm">Can&apos;t sign in, or the code didn&apos;t arrive? The Beeliv team can help.</p>
            <Link href="/applicant/help" className="ap-btn ap-btn-s ap-btn-sm mt-3">
              <CircleHelp className="size-4" aria-hidden="true" /> Help & support
            </Link>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

function AccessTile({ icon: Icon, title, sub, highlight }: { icon: typeof Check; title: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-[14px] border p-3.5 ${highlight ? "border-[#bbf7d0] bg-[#f0fdf4]" : "border-(--ap-line) bg-white"}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${highlight ? "bg-(--ap-ok-bg) text-(--ap-ok)" : "bg-(--ap-tint) text-(--ap-violet)"}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <b className="flex items-center gap-1.5 text-[14px]">
          {title} <Check className="size-3.5 text-(--ap-ok)" strokeWidth={2.6} aria-hidden="true" />
        </b>
        <span className="block truncate text-[12px] text-(--ap-muted)">{sub}</span>
      </div>
    </div>
  );
}

function StepDot({ done, n, active }: { done: boolean; n?: number; active?: boolean }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors ${
        done ? "bg-(--ap-violet) text-white" : active ? "border-2 border-(--ap-violet) bg-white text-(--ap-violet)" : "border-2 border-(--ap-line) bg-white text-(--ap-muted)"
      }`}
    >
      {done ? <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" /> : n}
    </span>
  );
}

function SaveTips() {
  const [p, setP] = useState<Platform>(() => detectPlatform());
  return (
    <div>
      <p>Add the Staff Hub to your home screen so it opens like an app.</p>
      <div className="ap-seg mt-3" role="radiogroup" aria-label="Your device">
        {(Object.keys(SAVE_TIPS) as Platform[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={p === k}
            onClick={() => setP(k)}
            className="aria-checked:bg-white aria-checked:text-(--ap-violet) aria-checked:shadow-[0_1px_3px_rgba(37,0,68,0.1)]"
          >
            {SAVE_TIPS[k].label}
          </button>
        ))}
      </div>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {SAVE_TIPS[p].steps.map((t, i) => (
          <li key={t} className="flex items-start gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-[12px] font-bold text-(--ap-violet)">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

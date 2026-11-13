"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, useInView, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { JOBS_SECTION } from "@/lib/public-site/content";
import type { JobCardData } from "@/lib/jobs/card";
import {
  ArrowRightIcon,
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldIcon,
  TrendUpIcon,
} from "./icons";
import { Btn, Reveal } from "./kit";
import { SlotImage } from "./SlotImage";
import { PublicJobCard } from "./jobs/PublicJobCard";
import { EASE, useMotionAllowed } from "./motion";
import { Eyebrow, T, stagger } from "./primitives";

/** One-time "there is more to the right" hint: distance (px) and total time (s). */
const NUDGE_PX = 24;
const NUDGE_S = 1.2;
/** Wait for the staggered card reveal to finish before nudging. */
const NUDGE_DELAY_MS = 900;

/** Trust-row icons, matched by index to JOBS_SECTION.trust. */
const TRUST_ICONS = [BuildingIcon, ShieldIcon, TrendUpIcon] as const;

/**
 * Splits a title at its LAST space so the desktop trust row can force the
 * same two-line break the wireframe draws with an explicit `<br>`
 * ("Verified<br>businesses", "Grow your<br>career", ...).
 */
function splitLast(s: string): [string, string] {
  const i = s.lastIndexOf(" ");
  return i === -1 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
}

/**
 * 07 Featured opportunities (Home-Desktop-2.dc.html / Home-Mobile-2.dc.html).
 * Replaces the earlier "06 · JOBS" teaser. Desktop and mobile are genuinely
 * different layouts (not a reflow of the same markup - see the two
 * sub-components below), same split as Hero.tsx.
 */
export function JobsTeaser({ jobs }: { jobs: JobCardData[] }) {
  // No sample jobs on a live domain: an honest note instead of the carousel.
  if (jobs.length === 0) return <RolesSoonTeaser />;
  return (
    <>
      <JobsTeaserDesktop jobs={jobs} />
      <JobsTeaserMobile jobs={jobs} />
    </>
  );
}

function RolesSoonTeaser() {
  return (
    <section className="border-t border-(--soft-border) px-6 py-16 text-center wf-d:py-24">
      <h2 className="ps-serif [--fs-d:44] [--fs-m:30]">Roles will be published here soon</h2>
      <p className="ps-bd mx-auto mt-3 max-w-md">We have no open roles to show right now. Please check back shortly.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Desktop                                                             */
/* ------------------------------------------------------------------ */

function JobsTeaserDesktop({ jobs }: { jobs: JobCardData[] }) {
  return (
    <section className="hidden border-t border-(--soft-border) wf-d:block">
      <div className="mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-[calc(48*var(--u))] px-[calc(96*var(--u))] pt-[calc(110*var(--u))] pb-[calc(120*var(--u))]">
        <Reveal className="grid grid-cols-[minmax(0,1fr)_560px] items-center gap-16 [@media(max-width:1099.98px)]:!grid-cols-[minmax(0,1fr)_380px] [@media(max-width:1099.98px)]:!gap-8">
          <div className="flex flex-col gap-[22px]">
            <div className="flex items-center gap-3.5">
              <Eyebrow>{JOBS_SECTION.eyebrow}</Eyebrow>
              <span aria-hidden="true" className="h-px w-12 bg-(--deep-gold)" />
            </div>
            <h2 className="ps-serif max-w-none [--fs-d:62]">
              <T>{JOBS_SECTION.headlineLead}</T>{" "}
              <span className="ps-hl-b">
                <T>{JOBS_SECTION.headlineAccent}</T>
              </span>{" "}
              <T>{JOBS_SECTION.headlineTrail}</T>
            </h2>
            <p className="ps-bd">
              <T>{JOBS_SECTION.body}</T>
            </p>
            <ul className="m-0 flex list-none gap-8 p-0">
              {JOBS_SECTION.trust.map((item, i) => {
                const Icon = TRUST_ICONS[i];
                const [line1, line2] = splitLast(item.title);
                return (
                  <li key={item.title} className="flex items-center gap-2.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(91,8,123,.08)]">
                      <Icon size={20} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
                    </span>
                    <span className="text-[15px] leading-[1.3] font-semibold">
                      <T>{line1}</T>
                      <br />
                      <T>{line2}</T>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative h-[440px] [@media(max-width:1099.98px)]:w-[560px] [@media(max-width:1099.98px)]:origin-top-left [@media(max-width:1099.98px)]:scale-[0.68] [@media(max-width:1099.98px)]:-mb-[140px]">
            <div
              aria-hidden="true"
              className="absolute -right-10 -bottom-2.5 h-[330px] w-[330px] rounded-full bg-[rgba(138,10,163,.08)]"
            />
            <div
              aria-hidden="true"
              className="absolute top-10 right-[60px] h-4 w-4 rounded-full bg-[rgba(138,10,163,.35)]"
            />
            <SlotImage
              slot="jobsVenueInterior"
              className="absolute top-[50px] right-0 h-[300px] w-[190px]"
              style={{ borderRadius: "95px 95px 20px 20px" }}
              sizes="190px"
            />
            <SlotImage
              slot="jobsStaffMember"
              className="absolute top-0 left-[150px] h-[420px] w-[300px]"
              style={{ borderRadius: "150px 150px 24px 24px" }}
              sizes="300px"
            />
            <SlotImage
              slot="jobsAccentCircle"
              className="absolute top-[30px] left-[70px] h-[90px] w-[110px] rounded-full"
              placeholderClassName="ps-img-dash"
              sizes="110px"
            />
            {JOBS_SECTION.showStat && (
            <div className="ps-cd absolute top-[190px] left-0 flex w-[220px] flex-col gap-1.5 p-5 shadow-[0_16px_40px_rgba(17,17,27,.12)]">
              <span className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(91,8,123,.08)]">
                <BuildingIcon size={18} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
              </span>
              <span className="ps-serif !text-[38px] text-(--beeliv-purple)">
                <T>{JOBS_SECTION.statValue}</T>
              </span>
              <span className="ps-sm">
                <T>{JOBS_SECTION.statLabel}</T>
              </span>
            </div>
            )}
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-5">
          {jobs.map((job, i) => (
            <Reveal key={job.id} delay={stagger(i)} className="h-full">
              <PublicJobCard job={job} />
            </Reveal>
          ))}

          <Reveal delay={stagger(jobs.length)} className="col-span-2 h-full">
            <Link
              href={JOBS_SECTION.cta.href}
              className="flex h-full flex-col justify-center gap-3.5 rounded-[18px] p-[26px] text-(--ink)"
              style={{ background: "linear-gradient(160deg, rgba(91,8,123,.05), rgba(138,10,163,.14))" }}
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(91,8,123,.12)]">
                <ArrowRightIcon size={22} strokeWidth={2} stroke="var(--beeliv-purple)" />
              </span>
              <span className="ps-serif !text-[26px]">
                <T>{JOBS_SECTION.viewAllTile.title}</T>
              </span>
              <span className="ps-sm">
                <T>{JOBS_SECTION.viewAllTile.body}</T>
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

function MobileJobCard({ job }: { job: JobCardData }) {
  return (
    <div className="w-[308px] shrink-0">
      <PublicJobCard job={job} />
    </div>
  );
}

/**
 * Circular pager arrow. Previous is neutral-bordered, Next is purple - not a
 * symmetric pair, matched from Home-Mobile-2.dc.html. Uses aria-disabled (not
 * `disabled`) so keyboard focus is not dropped once an end is reached.
 */
function MobileArrowButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: "left" | "right";
}) {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;
  const active = direction === "right";
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full border-[1.5px] bg-white transition-opacity duration-300 ease-(--ps-ease)",
        active ? "border-(--beeliv-purple)" : "border-(--soft-border)",
        disabled ? "pointer-events-none opacity-30" : "cursor-pointer",
      )}
    >
      <Icon size={20} strokeWidth={1.7} stroke={active ? "var(--beeliv-purple)" : "var(--muted-text)"} />
    </button>
  );
}

function JobsTeaserMobile({ jobs }: { jobs: JobCardData[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const motionAllowed = useMotionAllowed();
  const inView = useInView(scroller, { once: true, amount: 0.6 });

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [current, setCurrent] = useState(1);

  /** Shared X offset for the one-time nudge, applied to every card wrapper. */
  const nudgeX = useMotionValue(0);
  const nudgeState = useRef<"idle" | "played" | "cancelled">("idle");
  const nudgeAnim = useRef<ReturnType<typeof animate> | null>(null);
  const frame = useRef(0);

  /** Distance from one card's left edge to the next (card width + gap). */
  const cardStep = useCallback(() => {
    const el = scroller.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return 0;
    const second = el.children[1] as HTMLElement | undefined;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    const start = scrollLeft <= 1;
    const end = scrollLeft >= max - 1;
    setAtStart(start);
    setAtEnd(end);
    const step = cardStep();
    const idx = end ? jobs.length : Math.round(scrollLeft / (step || 1)) + 1;
    setCurrent(Math.min(jobs.length, Math.max(1, idx)));
  }, [cardStep, jobs.length]);

  /** Stop the nudge for good; ease back to rest if it was mid-flight. */
  const cancelNudge = useCallback(() => {
    if (nudgeState.current === "cancelled") return;
    const wasPlaying = nudgeState.current === "idle" || nudgeAnim.current !== null;
    nudgeState.current = "cancelled";
    nudgeAnim.current?.stop();
    nudgeAnim.current = null;
    if (wasPlaying && nudgeX.get() !== 0) {
      animate(nudgeX, 0, { duration: 0.3, ease: EASE });
    }
  }, [nudgeX]);

  // Scroll position -> pager / arrows (rAF-throttled).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const onScroll = () => {
      cancelNudge();
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(sync);
    };

    sync();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      cancelAnimationFrame(frame.current);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [sync, cancelNudge]);

  // One-time nudge the first time the carousel is in view. Never runs in the
  // loading skeleton or under reduced motion.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !inView || !motionAllowed) return;
    if (nudgeState.current !== "idle" || el.closest(".skel")) return;

    const timer = window.setTimeout(() => {
      if (nudgeState.current !== "idle" || el.scrollLeft > 1) return;
      nudgeAnim.current = animate(nudgeX, [0, -NUDGE_PX, 0], {
        duration: NUDGE_S,
        ease: EASE,
        times: [0, 0.4, 1],
        onComplete: () => {
          nudgeAnim.current = null;
          nudgeState.current = "played";
        },
      });
    }, NUDGE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [inView, motionAllowed, nudgeX]);

  // Unmount safety.
  useEffect(() => () => nudgeAnim.current?.stop(), []);

  const scrollByCard = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    cancelNudge();
    el.scrollBy({ left: dir * cardStep(), behavior: motionAllowed ? "smooth" : "auto" });
  };

  return (
    <section className="border-t border-(--soft-border) wf-d:hidden">
      <div className="flex flex-col gap-5 overflow-hidden py-14 pb-[60px] pl-5">
        <Reveal className="flex flex-col gap-3.5 pr-5">
          <div className="flex items-center gap-3">
            <Eyebrow>{JOBS_SECTION.eyebrow}</Eyebrow>
            <span aria-hidden="true" className="h-px w-9 bg-(--deep-gold)" />
          </div>
          <h2 className="ps-serif [--fs-m:30]">
            <T>{JOBS_SECTION.headlineLead}</T>{" "}
            <span className="ps-hl-b">
              <T>{JOBS_SECTION.headlineAccent}</T>
            </span>{" "}
            <T>{JOBS_SECTION.headlineTrail}</T>
          </h2>
          <p className="ps-bd">
            <T>{JOBS_SECTION.body}</T>
          </p>
        </Reveal>

        <Reveal delay={stagger(1)} className="pr-5">
          <ul className="m-0 mt-1 flex list-none flex-col rounded-[22px] bg-[rgba(91,8,123,.05)] px-[18px] py-1">
            {JOBS_SECTION.trust.map((item, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <li
                  key={item.title}
                  className={cn(
                    "flex items-center gap-4 py-4",
                    i > 0 && "border-t border-[rgba(91,8,123,.12)]",
                  )}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(91,8,123,.1)]">
                    <Icon size={22} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
                  </span>
                  <span className="flex flex-col gap-[3px]">
                    <b className="text-[17px] text-(--ink)">
                      <T>{item.title}</T>
                    </b>
                    <span className="text-[15px] leading-[1.4] text-(--muted-text)">
                      <T>{item.mobileBody}</T>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal delay={stagger(2)} className="relative mr-5 h-[250px] min-[480px]:mx-auto min-[480px]:w-[370px]">
          <div
            aria-hidden="true"
            className="absolute top-[-6px] left-[100px] h-[200px] w-[200px] rounded-full bg-[rgba(138,10,163,.07)]"
          />
          <div
            aria-hidden="true"
            className="absolute top-10 right-[-10px] h-[150px] w-[150px] rounded-full bg-[rgba(138,10,163,.07)]"
          />
          <div
            aria-hidden="true"
            className="absolute top-3 right-[30px] h-3.5 w-3.5 rounded-full bg-[rgba(138,10,163,.35)]"
          />
          {/* Project lead (2026-09-29): the staff member is the main photo in
              front; the orchid/venue accent sits smaller behind it. */}
          <SlotImage
            slot="jobsVenueInterior"
            className="absolute top-12 right-[22px] h-[160px] w-[110px]"
            style={{ borderRadius: "55px 55px 16px 16px" }}
            sizes="110px"
          />
          <SlotImage
            slot="jobsStaffMember"
            className="absolute top-3.5 left-[150px] h-[230px] w-[160px]"
            style={{ borderRadius: "80px 80px 18px 18px" }}
            sizes="160px"
          />
          {JOBS_SECTION.showStat && (
          <div className="ps-cd absolute top-[30px] left-0 z-[2] flex w-[170px] flex-col gap-1.5 px-[18px] py-5 shadow-[0_16px_36px_rgba(17,17,27,.12)]">
            <span className="ps-serif !text-[40px] leading-none text-(--deep-plum)">
              <T>{JOBS_SECTION.statValue}</T>
            </span>
            <span className="text-[15px] leading-[1.35] text-(--muted-text)">
              <T>{JOBS_SECTION.statLabel}</T>
            </span>
          </div>
          )}
        </Reveal>

        <div
          ref={scroller}
          onPointerDown={cancelNudge}
          onWheel={cancelNudge}
          onKeyDown={cancelNudge}
          className="ps-swipe flex [touch-action:pan-x_pan-y] scroll-pl-5 gap-3.5 overscroll-x-contain pr-5"
        >
          {jobs.map((job, i) => (
            <Reveal key={job.id} delay={stagger(i, 0.24)} style={{ x: nudgeX }} className="shrink-0">
              <MobileJobCard job={job} />
            </Reveal>
          ))}
        </div>

        <div className="flex items-center gap-4 pr-5">
          <span className="text-[17px] font-bold text-(--beeliv-purple)">
            {String(current).padStart(2, "0")}
            <span className="font-normal text-(--muted-text)"> / {String(jobs.length).padStart(2, "0")}</span>
          </span>
          <span className="sr-only" aria-live="polite">
            Card {current} of {jobs.length}
          </span>
          <div className="flex flex-1 gap-1.5" role="presentation">
            {jobs.map((job, i) => (
              <span
                key={job.id}
                aria-hidden="true"
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < current ? "bg-(--beeliv-purple)" : "bg-[rgba(91,8,123,.12)]",
                )}
              />
            ))}
          </div>
          <MobileArrowButton label="Previous job" disabled={atStart} onClick={() => scrollByCard(-1)} direction="left" />
          <MobileArrowButton label="Next job" disabled={atEnd} onClick={() => scrollByCard(1)} direction="right" />
        </div>

        <Btn
          href={JOBS_SECTION.cta.href}
          label={JOBS_SECTION.cta.label}
          variant="bo"
          className="mr-5 !h-14 !text-[17px]"
        />
      </div>
    </section>
  );
}

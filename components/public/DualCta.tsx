"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { FINAL_CTA, ROUTES } from "@/lib/public-site/content";
import { ArrowRightIcon, BuildingIcon, PeopleIcon } from "./icons";
import { Reveal } from "./kit";
import { T } from "./primitives";
import { EASE, VIEWPORT, useMotionAllowed } from "./motion";

const CARDS = [
  {
    title: "For Job Seekers",
    body: "Find opportunities and grow your hospitality career.",
    href: ROUTES.jobs,
    icon: <PeopleIcon size={20} strokeWidth={1.8} />,
  },
  {
    title: "For Businesses",
    body: "Access pre-screened, professional hospitality talent.",
    href: ROUTES.business,
    icon: <BuildingIcon size={20} strokeWidth={1.8} />,
  },
  {
    title: "Training & Services",
    body: "Build the skills and systems for world-class service.",
    href: ROUTES.training,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 9l10-5 10 5-10 5-10-5z" />
        <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      </svg>
    ),
  },
];

/**
 * 10 Final CTA: purple gradient panel with two options.
 * The outlined curve (desktop) draws itself in, then the two panels rise.
 * The gradient is the one place the approved purple gradient is used at full
 * scale; the gold here is text/detail only.
 */
export function DualCta() {
  const motionOk = useMotionAllowed();
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: "var(--purple-gradient)" }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 620 620"
        className="pointer-events-none absolute hidden wf-d:block"
        style={{
          right: "calc(-100*var(--u))",
          top: "calc(100*var(--u))",
          width: "calc(620*var(--u))",
          height: "calc(620*var(--u))",
        }}
      >
        <motion.path
          d="M310 20 C470 40 600 170 590 330 C580 490 430 610 280 590 C130 570 20 440 40 290 C60 140 170 5 310 20 Z"
          fill="none"
          stroke="rgba(255,255,255,.22)"
          strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 1.6, ease: EASE }}
        />
      </svg>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute hidden wf-d:block"
        animate={motionOk ? { y: [0, -12, 0] } : undefined}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
        style={{
          right: "calc(10*var(--u))",
          top: "calc(70*var(--u))",
          width: "calc(900*var(--u))",
          height: "calc(600*var(--u))",
        }}
      >
        <Reveal y={60} delay={0.85} className="relative h-full w-full">
          <Image src="/images/cta-waiter-bell.png" alt="" fill sizes="40vw" className="object-contain" />
        </Reveal>
      </motion.div>

      <div className="relative mx-auto flex max-w-[calc(1440*var(--u))] flex-col gap-9 px-5 pt-[76px] pb-[72px] wf-d:gap-[calc(64*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(130*var(--u))]">
        <div className="flex flex-col gap-9 wf-d:gap-[calc(64*var(--u))]">
          <Reveal delay={0.1} className="ps-eb !text-[12px] !text-(--antique-gold)">
            <T>{FINAL_CTA.eyebrow}</T>
          </Reveal>
          <Reveal delay={0.45}>
          <h2 className="ps-serif max-w-none [--fs-d:67] wf-d:max-w-[12ch]">
            <T>{FINAL_CTA.headlineLead}</T>{" "}
            <span className="text-(--antique-gold)">
              <T>{FINAL_CTA.headlineAccent}</T>
            </span>
          </h2>
          </Reveal>
        </div>

        <div className="flex flex-col gap-4 wf-d:grid wf-d:grid-cols-3 wf-d:gap-6">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={1.25 + i * 0.35}>
              <Link
                href={c.href}
                className="flex items-center gap-4 rounded-[18px] border border-white/35 bg-[rgba(138,10,163,.35)] p-5 backdrop-blur-md !text-white transition-colors hover:bg-white/[.12]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/[.22]">
                  {c.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[16px] font-semibold">{c.title}</span>
                  <span className="text-[14px] leading-[1.45] text-white/[.8]">{c.body}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/60">
                  <ArrowRightIcon size={16} strokeWidth={1.8} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-[40px] w-full wf-d:h-[calc(70*var(--u))]"
      >
        <path d="M0 44 C200 80 420 80 620 52 C820 24 1020 8 1220 36 C1320 50 1400 56 1440 48 V80 H0 Z" fill="var(--deep-plum)" />
      </svg>
    </section>
  );
}

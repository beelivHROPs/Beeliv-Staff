import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, RefreshIcon } from "../icons";
import { T } from "../primitives";
import { TRAINING_CYCLE } from "@/lib/public-site/training-content";

/**
 * "HOW WE WORK · TRAINING CYCLE" diagram. Desktop: a circular 2x2 layout
 * (Understand top-left -> Design top-right -> Develop bottom-right -> Improve
 * bottom-left -> back to Understand), with a centre "cycle" badge. Mobile: a
 * stacked list closed by a "back to 01" panel. Two separate trees (a 2D grid
 * vs a 1D stack are not reasonably the same DOM), both reading the same
 * `TRAINING_CYCLE.steps` array so the copy itself is never duplicated.
 *
 * NOT a reuse of Home's HowWeWork/StepBar: same four stage names, but a
 * different layout, different copy and no scroll-linked draw-in (see the
 * content file's note on TRAINING_CYCLE).
 */
export function TrainingCycle() {
  const [understand, design, develop, improve] = TRAINING_CYCLE.steps;
  return (
    <>
      {/* Desktop: circular 2x2 grid. */}
      <div
        className="relative mx-auto hidden w-full max-w-[1060px] wf-d:grid"
        style={{
          gridTemplateColumns: "minmax(0,1fr) 150px minmax(0,1fr)",
          gridTemplateRows: "auto 56px auto",
        }}
      >
        <StepCard step={understand} />
        <Connector><ArrowRightIcon stroke="var(--antique-gold)" /></Connector>
        <StepCard step={design} />

        <Connector><ArrowUpIcon stroke="var(--antique-gold)" /></Connector>
        <div aria-hidden="true" />
        <Connector><ArrowDownIcon stroke="var(--antique-gold)" /></Connector>

        <StepCard step={improve} />
        <Connector><ArrowLeftIcon stroke="var(--antique-gold)" /></Connector>
        <StepCard step={develop} />

        <div
          className="absolute top-1/2 left-1/2 z-[2] flex h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1.5 rounded-full p-[18px] text-center text-white"
          style={{
            background: "var(--deep-plum)",
            boxShadow: "0 0 0 6px var(--warm-white), 0 0 0 7.5px var(--antique-gold)",
          }}
        >
          <RefreshIcon stroke="var(--antique-gold)" />
          <span className="ps-serif [--fs-d:18] leading-[1.15]">
            <T>{TRAINING_CYCLE.centerLabel}</T>
          </span>
        </div>
      </div>

      {/* Mobile: stacked list + closing panel. */}
      <div className="flex flex-col gap-2 pt-2 wf-d:hidden">
        <StepCard step={understand} />
        <MobileArrow />
        <StepCard step={design} />
        <MobileArrow />
        <StepCard step={develop} />
        <MobileArrow />
        <StepCard step={improve} />
        <div className="mt-2 flex items-center gap-3.5 rounded-[18px] px-[22px] py-5 text-white" style={{ background: "var(--deep-plum)" }}>
          <RefreshIcon stroke="var(--antique-gold)" />
          <span className="text-[17px] leading-[1.45]">
            <T>{TRAINING_CYCLE.mobileClosing.lead}</T>{" "}
            <b className="text-(--antique-gold)">
              <T>{TRAINING_CYCLE.mobileClosing.num}</T>
            </b>
            <T>{TRAINING_CYCLE.mobileClosing.trail}</T>
          </span>
        </div>
      </div>
    </>
  );
}

function StepCard({ step }: { step: (typeof TRAINING_CYCLE.steps)[number] }) {
  return (
    <article className="ps-cd flex flex-col gap-3 p-6 wf-d:p-[calc(32*var(--u))]">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
        style={{ background: "var(--beeliv-purple)" }}
      >
        <T>{step.num}</T>
      </span>
      <h3 className="ps-serif [--fs-d:30] [--fs-m:26]">
        <T>{step.name}</T>
      </h3>
      <p className="ps-bd text-base">
        <T>{step.text}</T>
      </p>
    </article>
  );
}

function Connector({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      {children}
    </div>
  );
}

function MobileArrow() {
  return (
    <div className="flex justify-center" aria-hidden="true">
      <ArrowDownIcon stroke="var(--antique-gold)" />
    </div>
  );
}

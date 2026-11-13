"use client";

/**
 * "Applying for" role card of the job-application sign-up (desktop brand panel
 * in Auth-Signup-Desktop.dc.html; COPY.md "Role card" + "Steps"). Shows the
 * role, three chips and the three-step progress row. The active step's top bar
 * draws in (transform-only) and, once the account step is done, the next bar
 * fills - the "step indicator progress" motion. Layout never changes.
 *
 * `tone="panel"` = the wireframe's white card on the dark panel.
 * `tone="page"`  = the same card on the warm-white mobile page (bordered).
 */

import { AnimatePresence, motion } from "motion/react";
import { Chip } from "@/components/public/primitives";
import { DUR, EASE } from "@/components/public/motion";
import { ROLE_CARD } from "@/lib/public-site/auth-content";
import type { Job } from "@/lib/public-site/jobs";
import { cn } from "@/lib/utils";

export function RoleCard({
  job,
  step,
  tone,
}: {
  job: Job;
  /** 1 = creating the account, 2 = account created (next: "Your experience"). */
  step: 1 | 2;
  tone: "panel" | "page";
}) {
  return (
    <div
      className={cn(
        "flex max-w-[400px] flex-col gap-3.5 rounded-[18px] px-[22px] py-5 text-(--ink)",
        tone === "panel"
          ? "bg-white/[.96]"
          : "border border-(--soft-border) bg-white",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="ps-eb !text-[10px] !text-(--muted-text)">{ROLE_CARD.eyebrow}</span>
        <span className="relative h-[18px] overflow-hidden text-xs font-medium text-(--beeliv-purple)">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={step}
              className="block whitespace-nowrap"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: DUR.fast, ease: EASE }}
            >
              {ROLE_CARD.step(step)}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <div className="ps-serif [--fs-d:29] [--fs-m:26]">{job.role}</div>

      <div className="flex flex-wrap gap-1.5">
        <Chip>{job.company}</Chip>
        <Chip>{job.location}</Chip>
        <Chip>{job.employmentType}</Chip>
      </div>

      <ol
        aria-label={ROLE_CARD.progressLabel}
        className="m-0 grid list-none grid-cols-3 gap-2 p-0 text-xs text-(--muted-text)"
      >
        {ROLE_CARD.steps.map((name, i) => {
          const n = i + 1;
          const reached = n <= step;
          const current = n === step;
          return (
            <li
              key={name}
              aria-current={current ? "step" : undefined}
              className={cn(
                "relative pt-[11px] transition-colors duration-500",
                reached && "font-medium text-(--beeliv-purple)",
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-(--soft-border)"
              />
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] origin-left bg-(--beeliv-purple)"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: reached ? 1 : 0 }}
                transition={{ duration: DUR.slow, ease: EASE, delay: reached ? 0.3 + i * 0.1 : 0 }}
              />
              {name}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

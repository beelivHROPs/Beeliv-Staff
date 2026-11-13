"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { T } from "./primitives";
import { useMotionAllowed } from "./motion";

/**
 * One "How we work" stage bar. As it scrolls into view the bar draws in from
 * the left (clip-path) and its gold step number lights up, so the four stages
 * read in sequence as the page moves. Static (fully drawn) under reduced
 * motion. Layout is untouched: only clip-path / opacity change.
 */
export function StepBar({
  name,
  num,
  last,
}: {
  name: string;
  num: string;
  last: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 94%", "start 64%"],
  });
  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"],
  );
  const numOpacity = useTransform(scrollYProgress, [0.5, 1], [0.25, 1]);

  return (
    <motion.div
      ref={ref}
      style={allowed ? { clipPath } : undefined}
      className={cn(
        "flex items-baseline justify-between rounded-[14px] px-[18px] py-3.5 text-white",
        "wf-d:-ml-px wf-d:rounded-l-none wf-d:rounded-r-[14px] wf-d:px-[22px] wf-d:py-4",
        last
          ? "bg-[linear-gradient(135deg,#8A0AA3_0%,#5B087B_55%,#250044_100%)] wf-d:w-full"
          : "bg-(--ink) wf-d:w-[calc(100%+40px)]",
      )}
      data-ps-reveal
    >
      <span className="ps-serif [--fs-d:29] [--fs-m:25]">
        <T>{name}</T>
      </span>
      <motion.span
        // When motion is not allowed, pin opacity to 1 explicitly so neither
        // React nor motion can leave a stale 0.25 inline value after hydration.
        style={allowed ? { opacity: numOpacity } : { opacity: 1 }}
        data-ps-num
        className="ps-serif text-(--antique-gold) [--fs-d:29] [--fs-m:25]"
      >
        <T>{num}</T>
      </motion.span>
    </motion.div>
  );
}

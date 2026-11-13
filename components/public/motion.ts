"use client";

/**
 * Shared motion language for the public marketing site (all pages reuse this).
 *
 * Rules (project-lead motion spec):
 * - ONE easing curve, durations 0.5 to 0.8s.
 * - Motion never changes layout: only transform / opacity / clip-path (and SVG
 *   pathLength) are animated, and space is always reserved.
 * - prefers-reduced-motion is honoured globally via <MotionConfig
 *   reducedMotion="user"> in app/(public)/layout.tsx (transform animations are
 *   dropped, opacity fades stay) and explicitly by parallax / path drawing via
 *   `useMotionAllowed()`.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Transition, Variants } from "motion/react";

/** The single shared easing curve. Mirrors --ps-ease in public-site.css. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DUR = {
  fast: 0.5,
  base: 0.7,
  slow: 0.8,
  /** Slow unveil for sculpted images. */
  unveil: 1.4,
} as const;

/** Stagger between siblings (80ms per spec). */
export const STAGGER = 0.08;

/** Fade + rise ~24px. */
export const RISE_Y = 24;

export const baseTransition: Transition = { duration: DUR.base, ease: EASE };

/**
 * whileInView config: once, fire when ~15% of the element is on screen. (An
 * amount, not a negative rootMargin: a margin would leave anything in the last
 * few % of the page - i.e. the footer - permanently un-revealed.)
 */
export const VIEWPORT = { once: true, amount: 0.15 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: RISE_Y },
  show: { opacity: 1, y: 0, transition: baseTransition },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
};

/** True at the desktop breakpoint (matches Tailwind `wf-d`, 820px). */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 820px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduce(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getReduce = () => window.matchMedia(REDUCE_QUERY).matches;
/** The server cannot know the visitor's setting: assume motion is allowed. */
const getReduceServer = () => false;

/**
 * True when the visitor prefers reduced motion. Hydration-safe: the server
 * snapshot is `false`, and React uses that same snapshot for the first client
 * (hydration) render before switching to the real value, so server HTML and the
 * first client render always match (motion's own `useReducedMotion` reads the
 * media query on the first client render and so can differ from the server,
 * which left clip-paths / class names un-cleared). Prefer this over
 * `useReducedMotion` for anything that changes rendered markup or inline style.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduce, getReduce, getReduceServer);
}

/** Scroll-linked motion (parallax, path drawing) only when the user allows it. */
export function useMotionAllowed(): boolean {
  return !usePrefersReducedMotion();
}

/** Parallax is desktop-only and skipped under reduced motion. */
export function useParallaxAllowed(): boolean {
  const desktop = useIsDesktop();
  const allowed = useMotionAllowed();
  return desktop && allowed;
}

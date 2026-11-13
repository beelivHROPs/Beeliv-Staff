"use client";

/**
 * Motion (motion.dev) building blocks for the applicant dashboard.
 * CSS still handles simple entrances/hover/press (applicant.css "MOTION
 * SYSTEM"); Motion is used only where CSS can't do it well:
 *  - shared-layout pills that slide between items (layoutId)
 *  - swipe-down-to-close phone sheets with spring snap-back
 *  - smooth height changes when content swaps (AutoHeight)
 *  - list items that glide into place when one is removed
 *  - scroll reveals + the hero clip unveil, in the public site's motion
 *    language (Reveal / Unveil below, built on components/public/motion.ts)
 */
import { AnimatePresence, MotionConfig, motion, useAnimate, useDragControls, useInView, type HTMLMotionProps, type PanInfo } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DUR, EASE, RISE_Y, STAGGER, VIEWPORT } from "@/components/public/motion";
import { useApplicantSettings } from "@/lib/applicant/settings";

/** Snappy spring used for pills and sheets. */
export const SPRING = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 } as const;
/** Softer spring for height and list re-flow. */
export const SPRING_SOFT = { type: "spring", stiffness: 340, damping: 36 } as const;

/** True below 768px — the dashboard's phone breakpoint. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

/** True once running in the browser (portals need document.body). */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Wraps the dashboard. Motion follows the OS "reduce motion" preference,
 * and Settings > Reduce motion forces it off everywhere.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const { motion: reduce } = useApplicantSettings();
  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}

/**
 * Phone bottom-sheet panel: slides up, and can be dragged down from its
 * handle/header to close (fast flick or past 110px); otherwise it springs
 * back. Render inside <AnimatePresence> so it also slides out.
 */
export function SwipeSheet({
  onClose,
  children,
  className = "",
  header,
  ...aria
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Rendered in the draggable zone under the handle (e.g. title + close). */
  header?: ReactNode;
  id?: string;
  role?: string;
  "aria-modal"?: boolean | "true";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const controls = useDragControls();
  return (
    <motion.div
      {...aria}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={SPRING}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.04, bottom: 0.7 }}
      onDragEnd={(_: unknown, info: PanInfo) => {
        if (info.offset.y > 110 || info.velocity.y > 600) onClose();
      }}
      className={`w-full rounded-t-[24px] bg-white shadow-[0_-12px_40px_rgba(17,17,27,.18)] ${className}`}
    >
      <div className="cursor-grab touch-none pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
        <span className="mx-auto block h-1 w-10 rounded-full bg-(--ap-line)" aria-hidden="true" />
        {header}
      </div>
      {children}
    </motion.div>
  );
}

/**
 * Smoothly animates its height when the content inside changes (e.g. a
 * Profile section switching between view and edit). `k` identifies the
 * content; a new key crossfades in. Overflow is clipped only while the
 * height is moving, so dropdowns inside forms aren't cut off.
 */
export function AutoHeight({ k, children }: { k: string; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | "auto">("auto");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height: h }}
      transition={SPRING_SOFT}
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={() => setMoving(false)}
      style={{ overflow: moving ? "hidden" : "visible" }}
    >
      <div ref={inner} className="relative flow-root">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll reveal: the public site's Reveal (components/public/kit.tsx) */
/* ------------------------------------------------------------------ */

// Sibling stagger: reveals that start in the same frame (cards that are on
// screen together at first paint, or scroll in together) are spaced STAGGER
// (80ms) apart, capped so a long list never waits more than ~0.5s.
let batchAt = -1;
let batchN = 0;
function nextStaggerDelay(): number {
  const now = performance.now();
  if (now - batchAt > 50) {
    batchAt = now;
    batchN = 0;
  }
  return Math.min(batchN++, 6) * STAGGER;
}

const REVEAL_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  aside: motion.aside,
  li: motion.li,
} as const;

type RevealProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView" | "ref"> & {
  /** Element to render; the Reveal can BE the card (its inline transform is cleared once it lands). */
  as?: keyof typeof REVEAL_TAGS;
  children?: ReactNode;
};

/**
 * Fade + rise RISE_Y (24px) over DUR.base with the shared EASE, once, when
 * 15% of it is on screen (VIEWPORT) - identical to the public site's Reveal.
 * Anything already on screen at first paint reveals immediately, so the same
 * component covers "on mount" (hero, first cards) and "on scroll" (below the
 * fold). Siblings that start together are staggered 80ms.
 *
 * - Once it lands, the inline opacity/transform are removed, so CSS hover
 *   lifts (.ap-card-hover) work and no transform traps position:fixed children.
 * - `data-ap-reveal` + the <noscript> rule in app/applicant/layout.tsx keep
 *   content visible without JS; reduced motion follows <MotionRoot>.
 */
export function Reveal({ as = "div", children, ...rest }: RevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, VIEWPORT);
  useEffect(() => {
    const el = scope.current;
    if (!inView || !el) return;
    const controls = animate(el, { opacity: 1, y: 0 }, { duration: DUR.base, ease: EASE, delay: nextStaggerDelay() });
    controls.then(() => {
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
    });
    return () => controls.stop();
  }, [inView, animate, scope]);
  const Comp = REVEAL_TAGS[as] as typeof motion.div;
  return (
    <Comp ref={scope} data-ap-reveal="" initial={{ opacity: 0, y: RISE_Y }} {...rest}>
      {children}
    </Comp>
  );
}

/**
 * Clip-path unveil for the hero cutout - the public hero's sculpted-image
 * wipe (components/public/HeroSculptForm.tsx), left to right over DUR.unveil.
 * The clip is removed when it finishes so the image's drop-shadow isn't cut.
 */
export function Unveil({ className = "", delay = 0.1, children }: { className?: string; delay?: number; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <motion.span
      ref={ref}
      data-ap-reveal=""
      className={`block ${className}`}
      // Wipe left -> right. The clip runs with negative insets (-50%) so its
      // resting state never cuts anything outside the box - it can be
      // re-applied when a parent re-renders (e.g. the rotating Staff hero),
      // and cutouts that overhang their room must stay whole.
      initial={{ clipPath: "inset(-50% 100% -50% -50%)" }}
      animate={{ clipPath: "inset(-50% -50% -50% -50%)" }}
      transition={{ duration: DUR.unveil, ease: EASE, delay }}
      onAnimationComplete={() => ref.current?.style.setProperty("clip-path", "none")}
    >
      {children}
    </motion.span>
  );
}

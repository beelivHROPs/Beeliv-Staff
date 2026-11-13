"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
} from "motion/react";
import { CLIENT_LOGOS } from "@/lib/public-site/assets";
import { CLIENTS } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";
import { Reveal } from "./kit";
import { usePrefersReducedMotion } from "./motion";
import { Eyebrow, T } from "./primitives";

/** Pixels per second the logo strip travels. */
const SPEED = 42;

/**
 * Section 02: client logo marquee.
 *
 * Desktop (Main.dc.html): a raised white card overlapping the hero, six logos
 * visible, continuous scroll. Mobile (Home-Mobile.dc.html): a rounded white
 * strip tucked under the hero, four logos visible, hairline separators,
 * auto-scroll that pauses on touch.
 *
 * One DOM for both: cell width is `(visible - 1) gaps` carved out of the
 * container, so the visible count is 6 on desktop and 4 on mobile.
 * Pauses on hover (desktop) and while touched (mobile). Under
 * prefers-reduced-motion the strip does not move and can be swiped instead.
 */
export function ClientMarquee({ skeleton = false }: { skeleton?: boolean }) {
  // Hydration-safe (server + first client render agree), see motion.ts.
  const reduce = usePrefersReducedMotion();
  const animate = !skeleton && !reduce;
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const paused = useRef(false);
  const loop = useRef(0);
  const [measured, setMeasured] = useState(false);

  // Loop length = width of one full set of logos (half the doubled track).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      loop.current = el.scrollWidth / 2;
      setMeasured(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useAnimationFrame((_, delta) => {
    if (!animate || paused.current || !measured || loop.current === 0) return;
    let next = x.get() - (SPEED * delta) / 1000;
    if (next <= -loop.current) next += loop.current;
    x.set(next);
  });

  const names = CLIENTS.names;
  const cell = "calc((100cqw - (var(--vis) - 1) * var(--gap)) / var(--vis))";

  const renderSet = (setIndex: number) =>
    names.map((name, i) => {
      const src = CLIENT_LOGOS[name] ?? null;
      const first = setIndex === 0 && i === 0;
      return (
        <div
          key={`${setIndex}-${name}`}
          aria-hidden={setIndex === 1 ? true : undefined}
          className={cn(
            "ps-logo ps-logo-cell shrink-0",
            !first && "ps-sep",
            src && "!border-0 !bg-transparent",
          )}
          style={{ width: cell, marginRight: "var(--gap)" }}
        >
          {src ? (
            <span className="relative block h-full w-full">
              <Image src={src} alt={setIndex === 0 ? name : ""} fill sizes="200px" className="object-contain" />
            </span>
          ) : (
            <T>{name}</T>
          )}
        </div>
      );
    });

  return (
    <section
      className={cn(
        "relative z-[6] -mt-[22px] flex flex-col gap-4 overflow-hidden rounded-t-[22px] bg-white px-5 pt-[26px] pb-[26px]",
        // Wireframe: 40px side margins at 1440. Width is capped to the content
        // column (1360 at 1440, scaled by --u so it grows on big screens); below 1440 the margins scale with --u as before.
        "wf-d:z-[7] wf-d:mx-auto wf-d:w-[calc(100%-80*var(--u))] wf-d:max-w-[calc(1360*var(--u))] wf-d:-mt-[calc(76*var(--u))] wf-d:gap-5 wf-d:overflow-visible wf-d:rounded-[18px] wf-d:border wf-d:border-(--soft-border) wf-d:px-[calc(56*var(--u))] wf-d:pt-[30px] wf-d:pb-[34px] wf-d:shadow-[0_10px_40px_rgba(17,17,27,.08)]",
      )}
    >
      {/* Mobile-only: subtle sculptural-wave background texture behind the
          logo strip, with a near-white tint on top so the logos stay
          legible. Desktop keeps its plain white card (no wireframe note
          for a textured desktop marquee background). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 wf-d:hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.82), rgba(255,255,255,.82)), url(/images/sculpted-white-waves.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Reveal className="relative z-[1] flex flex-col gap-4 wf-d:gap-5">
        <div className="flex items-baseline justify-between">
          <Eyebrow className="!text-[10px] !tracking-[.24em] !text-(--muted-text) wf-d:!text-[12px] wf-d:!tracking-[.22em]">
            {CLIENTS.label}
          </Eyebrow>
        </div>

        <div
          className={cn(
            "[--gap:0px] [--vis:4] wf-d:[--gap:28px] wf-d:[--vis:6]",
            "[container-type:inline-size]",
            skeleton || animate ? "overflow-hidden" : "ps-swipe",
          )}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") paused.current = true;
          }}
          onPointerLeave={() => {
            paused.current = false;
          }}
          onTouchStart={() => {
            paused.current = true;
          }}
          onTouchEnd={() => {
            paused.current = false;
          }}
          onTouchCancel={() => {
            paused.current = false;
          }}
        >
          <motion.div
            ref={trackRef}
            className="flex w-max"
            style={{ x: animate ? x : 0 }}
          >
            {renderSet(0)}
            {renderSet(1)}
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

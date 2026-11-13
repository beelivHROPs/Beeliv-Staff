"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Time each slide stays up before the cross-fade (project lead: "moderate"). */
const HOLD_MS = 6000;

/**
 * Shared slide clock for a hero: the pictures (HeroCarousel) and the words
 * (HeroRotatingText) read the same index, so they change together. Pauses
 * while the tab is hidden; stays on slide 0 for people who prefer reduced motion.
 */
export function useHeroRotation(count: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [count]);
  return index;
}

const FADE = "transition-opacity duration-[1100ms] ease-in-out";

/** Hero cutouts (STAFF_ART.heroCutouts), cross-fading; fills its parent room bottom-centre. */
export function HeroCarousel({
  images,
  index,
  alt,
  priority = false,
  phoneShift = {},
}: {
  images: readonly string[];
  index: number;
  alt: string;
  priority?: boolean;
  /** Extra px to push a picture right on phones (by src), e.g. so a wide tray clears the words. */
  phoneShift?: Readonly<Record<string, number>>;
}) {
  const active = index % images.length;
  return (
    <>
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === active ? alt : ""}
          aria-hidden={i === active ? undefined : true}
          width={1000}
          height={1000}
          priority={priority && i === 0}
          sizes="(max-width: 767px) 220px, 340px"
          style={phoneShift[src] ? ({ "--ph-shift": `${phoneShift[src]}px` } as React.CSSProperties) : undefined}
          className={`absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain max-[767px]:right-[calc(-16px-var(--ph-shift,0px))] max-[767px]:left-auto max-[767px]:translate-x-0 drop-shadow-[0_22px_22px_rgba(41,32,82,.26)] ${FADE} ${i === active ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </>
  );
}

/**
 * Hero line that changes with the pictures. All lines are stacked in one grid
 * cell so the box keeps the height of the longest line (no layout jump).
 * Screen readers get only the current line.
 */
export function HeroRotatingText({ lines, index, className = "" }: { lines: readonly string[]; index: number; className?: string }) {
  const active = index % lines.length;
  return (
    <p className={`grid ${className}`} aria-live="off">
      {lines.map((line, i) => (
        <span key={i} aria-hidden={i === active ? undefined : true} className={`col-start-1 row-start-1 ${FADE} ${i === active ? "opacity-100" : "opacity-0"}`}>
          {line}
        </span>
      ))}
    </p>
  );
}

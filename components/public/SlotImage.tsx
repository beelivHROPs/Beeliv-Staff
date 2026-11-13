"use client";

/**
 * A photo slot: a fixed-size / fixed-shape box (the clip shape and size come
 * from className) that shows the wireframe's hatched placeholder until a real
 * file is set in lib/public-site/assets.ts. Motion is attached to the slot, so
 * swapping in the photo needs no restructure.
 *
 * - `unveil`   : sculpted images open up through their curve (clip-path) while
 *                the photo settles from scale 1.08 to 1.
 * - `parallax` : gentle +/- vertical drift on scroll (desktop only, off under
 *                reduced motion). Value is the px range, e.g. 40.
 * - `hoverZoom`: slow zoom on hover (pathway cards).
 */

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { IMAGE_SLOTS, type ImageSlot, type ImageSlotKey } from "@/lib/public-site/assets";
import { useMotionAllowed, useParallaxAllowed } from "./motion";

type Props = {
  slot: ImageSlotKey;
  className?: string;
  style?: React.CSSProperties;
  /** Extra classes applied only while the slot is still a placeholder. */
  placeholderClassName?: string;
  /** "contain-bottom" is for cutout PNGs; default is a cover crop. */
  fit?: "cover" | "contain" | "contain-bottom" | "contain-top";
  unveil?: boolean;
  parallax?: number;
  hoverZoom?: boolean;
  sizes?: string;
  priority?: boolean;
};

export function SlotImage({
  slot,
  className,
  style,
  placeholderClassName = "ps-img",
  fit = "cover",
  unveil = false,
  parallax = 0,
  hoverZoom = false,
  sizes = "(min-width: 820px) 50vw, 100vw",
  priority = false,
}: Props) {
  const cfg: ImageSlot = IMAGE_SLOTS[slot];
  const ref = useRef<HTMLDivElement>(null);
  const parallaxOn = useParallaxAllowed() && parallax > 0;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [parallax, -parallax]);

  const hasSrc = cfg.src !== null;
  // Parallax needs a little overscan so the moving layer never exposes an edge.
  const overscan = parallaxOn ? -parallax : 0;

  // Unveil is scroll-linked (geometry based, so it does not depend on an
  // IntersectionObserver reading a clipped element): the image opens up from
  // its bottom-right corner through the curve while the photo settles 1.08 -> 1.
  const motionOk = useMotionAllowed();
  const unveilOn = unveil && motionOk;
  const { scrollYProgress: revealProgress } = useScroll({
    target: ref,
    offset: ["start 96%", "start 52%"],
  });
  const clipPath = useTransform(
    revealProgress,
    [0, 1],
    ["inset(100% 0% 0% 100%)", "inset(0% 0% 0% 0%)"],
  );
  const settle = useTransform(revealProgress, [0, 1], [1.08, 1]);

  return (
    <motion.div
      ref={ref}
      data-ps-reveal={unveil ? "" : undefined}
      className={cn(
        "relative overflow-hidden",
        !hasSrc && placeholderClassName,
        className,
      )}
      style={unveilOn ? { ...style, clipPath } : style}
    >
      <motion.div
        className="absolute"
        style={{
          inset: overscan,
          y: parallaxOn ? y : 0,
          scale: unveilOn ? settle : 1,
        }}
        whileHover={hoverZoom ? { scale: 1.04 } : undefined}
      >
        {hasSrc && (
          <Image
            src={cfg.src as string}
            alt={cfg.alt}
            fill
            sizes={sizes}
            priority={priority}
            className={
              fit === "contain" ? "object-contain object-center" : fit === "contain-bottom" ? "object-contain object-bottom" : fit === "contain-top" ? "object-contain object-top" : "object-cover"
            }
            style={cfg.position ? { objectPosition: cfg.position } : undefined}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

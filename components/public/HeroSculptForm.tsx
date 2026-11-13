"use client";

import { motion } from "motion/react";
import { DUR, EASE } from "./motion";

/** Path data for the sculptural form, shared by the fill path and its clip. */
const SCULPT_PATH = "M0 0 H1040 C930 110 770 230 830 420 C890 610 760 780 650 920 H0 Z";

/**
 * The hero's white sculptural form (Main.dc.html: 1120 x 920 SVG, path copied
 * verbatim). It flows from the nav down into the hero and masks the left of
 * the photograph. The wireframe's dashed outline is a design-tool "mask line"
 * annotation and is not drawn. On load the form wipes in from the left.
 *
 * The fill is a subtle white sculptural-wave texture (public/images/
 * sculpted-white-waves.png), clipped to this exact path so the silhouette is
 * unchanged - a soft white wash sits on top to keep it reading as a light
 * surface detail rather than a distinct photo.
 */
export function HeroSculptForm() {
  return (
    <motion.svg
      data-ps-reveal
      aria-hidden="true"
      className="absolute top-0 left-0 z-[1] h-full"
      style={{ width: "77.7778%" }}
      viewBox="0 0 1120 920"
      preserveAspectRatio="none"
      initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: DUR.slow + 0.2, ease: EASE }}
    >
      <defs>
        <clipPath id="heroSculptClip" clipPathUnits="userSpaceOnUse">
          <path d={SCULPT_PATH} />
        </clipPath>
      </defs>
      {/* Base fill: guarantees the exact original silhouette even if the
          texture image fails to load. */}
      <path d={SCULPT_PATH} fill="#fff" />
      <g clipPath="url(#heroSculptClip)">
        <image
          href="/images/sculpted-white-waves.png"
          x={0}
          y={0}
          width={1120}
          height={920}
          preserveAspectRatio="xMidYMid slice"
        />
        {/* Soft white wash so the texture stays subtle. */}
        <rect x={0} y={0} width={1120} height={920} fill="#fff" fillOpacity={0.55} />
      </g>
    </motion.svg>
  );
}

"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Applies the visitor's prefers-reduced-motion setting to every motion
 * component on the public site: transform/layout animations are dropped and
 * only short opacity fades remain.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

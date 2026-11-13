"use client";

/**
 * Icons for the auth screens. Path data, sizes and stroke widths are copied
 * verbatim from Auth-*.dc.html. They draw in `currentColor` (the wireframe's
 * literal #686672 / #5B087B / #fff is applied by the parent's text colour) so
 * the colour can transition on focus.
 *
 * Not in the wireframe (functional states only, drawn to match the set):
 * EyeIcon's "off" slash, AlertIcon, CheckIcon, SpinnerIcon, and the two tile
 * glyphs for screens with no board yet: MailCheckIcon, ShieldCheckIcon.
 */
import { motion } from "motion/react";
import { DUR, EASE, useMotionAllowed } from "@/components/public/motion";
import type { ReactNode } from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Svg({
  size,
  strokeWidth,
  className,
  children,
}: Required<Pick<IconProps, "size" | "strokeWidth">> &
  Pick<IconProps, "className"> & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Field icon, 18px / 1.7. */
export function MailIcon({ size = 18, strokeWidth = 1.7, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </Svg>
  );
}

/** Field icon, 18px / 1.7. */
export function LockIcon({ size = 18, strokeWidth = 1.7, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

/** Field icon, 18px / 1.7. */
export function UserIcon({ size = 18, strokeWidth = 1.7, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
    </Svg>
  );
}

/** Field icon, 18px / 1.7. */
export function PhoneIcon({ size = 18, strokeWidth = 1.7, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </Svg>
  );
}

/** Show/hide password eye, 20px / 1.7. `off` draws the slash (functional state). */
export function EyeIcon({
  off = false,
  size = 20,
  strokeWidth = 1.7,
  className,
}: IconProps & { off?: boolean }) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      <motion.path
        d="m4 4 16 16"
        initial={false}
        animate={{ pathLength: off ? 1 : 0, opacity: off ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      />
    </Svg>
  );
}

/** Forgot-password tile glyph, 26px / 1.7 (key). */
export function KeyIcon({ size = 26, strokeWidth = 1.7, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M15 8l2 2" />
    </Svg>
  );
}

/**
 * Check-your-email tile glyph, 26px / 1.7 (same envelope as the field icon).
 * The strokes draw in once on load (skipped under reduced motion).
 */
export function MailDrawIcon({
  size = 26,
  strokeWidth = 1.7,
  className,
  still = false,
}: IconProps & { still?: boolean }) {
  const allowed = useMotionAllowed() && !still;
  const draw = (delay: number) =>
    allowed
      ? {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: DUR.slow, ease: EASE, delay },
        }
      : {};
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <motion.rect x="3" y="5" width="18" height="14" rx="2" {...draw(0.25)} />
      <motion.path d="m3.5 6.5 8.5 6.5 8.5-6.5" {...draw(0.55)} />
    </Svg>
  );
}

/**
 * NOT in the wireframe (no board for the Verify email screen): tile glyph,
 * 26px / 1.7. The Check-your-email envelope with a tick at its lower right.
 * Same draw-in as MailDrawIcon (envelope, flap, then the tick).
 */
export function MailCheckIcon({
  size = 26,
  strokeWidth = 1.7,
  className,
  still = false,
}: IconProps & { still?: boolean }) {
  const allowed = useMotionAllowed() && !still;
  const draw = (delay: number) =>
    allowed
      ? {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: DUR.slow, ease: EASE, delay },
        }
      : {};
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <motion.path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" {...draw(0.25)} />
      <motion.path d="m3.5 6.5 8.5 6.5 8.5-6.5" {...draw(0.55)} />
      <motion.path d="m15.5 18.5 2 2 4-4.5" {...draw(0.85)} />
    </Svg>
  );
}

/**
 * NOT in the wireframe (no board for the success screens): tile glyph, 26px /
 * 1.7. A shield outline with a tick (Email verified / Password reset).
 */
export function ShieldCheckIcon({
  size = 26,
  strokeWidth = 1.7,
  className,
  still = false,
}: IconProps & { still?: boolean }) {
  const allowed = useMotionAllowed() && !still;
  const draw = (delay: number) =>
    allowed
      ? {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: DUR.slow, ease: EASE, delay },
        }
      : {};
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <motion.path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6z" {...draw(0.25)} />
      <motion.path d="m8.75 12 2.5 2.5 4.25-4.5" {...draw(0.6)} />
    </Svg>
  );
}

/** Mobile back arrow, 20px / 1.8. */
export function ChevronLeftIcon({ size = 20, strokeWidth = 1.8, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

/** Inline error marker (functional state; not in the wireframe). */
export function AlertIcon({ size = 14, strokeWidth = 1.8, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </Svg>
  );
}

/** Success tick (functional state; not in the wireframe). */
export function CheckIcon({ size = 14, strokeWidth = 2, className }: IconProps) {
  return (
    <Svg size={size} strokeWidth={strokeWidth} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

/** Button loading spinner (functional state; rotation is transform-only). */
export function SpinnerIcon({ size = 18, strokeWidth = 2.2, className }: IconProps) {
  return (
    <motion.span
      aria-hidden="true"
      className="inline-flex"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
    >
      <Svg size={size} strokeWidth={strokeWidth} className={className}>
        <path d="M12 3a9 9 0 1 0 9 9" />
      </Svg>
    </motion.span>
  );
}

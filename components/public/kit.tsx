"use client";

/**
 * Client-side building blocks shared by every public-site section:
 * scroll reveals, buttons, text links, floating cards. All motion goes
 * through components/public/motion.ts (one easing curve, shared durations).
 */

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { T } from "./primitives";
import {
  DUR,
  EASE,
  RISE_Y,
  VIEWPORT,
  baseTransition,
  usePrefersReducedMotion,
} from "./motion";

/* ------------------------------------------------------------------ */
/* Reveal: fade + rise on scroll into view (once).                     */
/* ------------------------------------------------------------------ */

type RevealProps = Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView"> & {
  delay?: number;
  y?: number;
  /** "view" = on scroll into view (default), "mount" = on first paint (hero). */
  when?: "view" | "mount";
  /** Render as a list item when the wrapper sits directly inside an <ol>/<ul>. */
  as?: "div" | "li";
  children?: ReactNode;
};

export function Reveal({
  delay = 0,
  y = RISE_Y,
  when = "view",
  as = "div",
  className,
  children,
  ...rest
}: RevealProps) {
  const target = { opacity: 1, y: 0 };
  const transition = { ...baseTransition, delay };
  const Comp = (as === "li" ? motion.li : motion.div) as typeof motion.div;
  return (
    <Comp
      data-ps-reveal
      className={className}
      initial={{ opacity: 0, y }}
      {...(when === "mount"
        ? { animate: target }
        : { whileInView: target, viewport: VIEWPORT })}
      transition={transition}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Arrowed labels: "Book a Service Audit →" - the arrow nudges on hover. */
/* ------------------------------------------------------------------ */

function splitArrow(label: string): { text: string; arrow: boolean } {
  const m = label.match(/^(.*?)\s*→$/);
  return m ? { text: m[1], arrow: true } : { text: label, arrow: false };
}

const arrowVariants = { rest: { x: 0 }, hover: { x: 4 } };

function ArrowLabel({ label }: { label: string }) {
  const { text, arrow } = splitArrow(label);
  return (
    <T>
      {text}
      {arrow && (
        <>
          {" "}
          <motion.span
            variants={arrowVariants}
            transition={{ duration: 0.3, ease: EASE }}
            className="inline-block"
          >
            →
          </motion.span>
        </>
      )}
    </T>
  );
}

const MotionLink = motion.create(Link);

type BtnVariant = "bp" | "bo" | "bw" | "bo-w";

/** Pill button. Height/padding overrides (mobile hero) come in via className/style. */
export function Btn({
  href,
  label,
  variant,
  className,
  style,
  hero,
  icon,
}: {
  href: string;
  label: string;
  variant: BtnVariant;
  className?: string;
  style?: CSSProperties;
  /** HERO / MAIN action (one button language): label plus a circular arrow, and an icon disc when `icon` is given. */
  hero?: boolean;
  icon?: ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      className={cn("ps-btn", `ps-${variant}`, hero && "ps-btn-hero", hero && icon && "ps-has-icon", className)}
      style={style}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {hero ? (
        <>
          {icon ? (
            <span className="ps-btn-disc" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="flex-1">
            <T>{splitArrow(label).text}</T>
          </span>
          <motion.span
            variants={{ rest: { x: 0 }, hover: { x: 2 } }}
            transition={{ duration: 0.3, ease: EASE }}
            className="ps-btn-disc"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </motion.span>
        </>
      ) : (
        <ArrowLabel label={label} />
      )}
    </MotionLink>
  );
}

/** Underlined text link (.ln in the wireframe). */
export function TextLink({
  href,
  label,
  className,
  style,
}: {
  href: string;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <MotionLink
      href={href}
      className={cn("ps-ln", className)}
      style={style}
      initial="rest"
      whileHover="hover"
    >
      <ArrowLabel label={label} />
    </MotionLink>
  );
}

/* ------------------------------------------------------------------ */
/* SoftLink: a link whose destination may not exist yet.               */
/* ------------------------------------------------------------------ */

/**
 * Drop-in link for destinations that are still placeholders (`href="#"`).
 * A bare "#" scrolls the page to the top, so the click is swallowed instead;
 * the element stays a real, focusable link (same look, same keyboard focus).
 * Any other href renders a normal next/link, so swapping in a real destination
 * later needs no other change.
 */
export function SoftLink({
  href,
  onClick,
  children,
  ...rest
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  if (href === "#") {
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick?.(e);
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Card lift: +4px lift and a soft shadow on hover.                    */
/* ------------------------------------------------------------------ */

export function LiftCard({
  className,
  style,
  children,
  as = "article",
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  as?: "article" | "div";
}) {
  const Comp = as === "article" ? motion.article : motion.div;
  return (
    <Comp
      className={className}
      style={style}
      whileHover={{ y: -4, boxShadow: "0 18px 40px rgba(17,17,27,.10)" }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Float: slow idle bob (used once, on the hero talent card).          */
/* ------------------------------------------------------------------ */

export function Float({
  className,
  style,
  children,
  delay = 0,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Entrance delay (s) before the idle bob starts. */
  delay?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      data-ps-reveal
      className={className}
      style={style}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, ease: EASE, delay }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{
          duration: 5,
          ease: "easeInOut",
          repeat: Infinity,
          delay: delay + DUR.slow,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

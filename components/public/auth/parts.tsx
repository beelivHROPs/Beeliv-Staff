"use client";

/**
 * Small pieces the four screens share: the heading block, the 56px icon tile
 * and the linked footer sentence ("New to Beeliv? Create an account").
 */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { motion } from "motion/react";
import { Reveal } from "@/components/public/kit";
import { T } from "@/components/public/primitives";
import { DUR, EASE } from "@/components/public/motion";
import type { IllustrationKey } from "@/lib/public-site/auth-content";
import { IMAGE_SLOTS } from "@/lib/public-site/assets";
import { cn } from "@/lib/utils";

/** h1 (Newsreader 500; 30px mobile, 48px desktop) + the 17px subhead. */
export function AuthHeading({
  lead,
  accent,
  sub,
  headingRef,
  delay = 0.15,
}: {
  lead: string;
  accent: string;
  sub: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  delay?: number;
}) {
  return (
    <Reveal when="mount" delay={delay} className="flex flex-col gap-2">
      <h1 ref={headingRef} tabIndex={-1} className="ps-serif [--fs-d:48] outline-none">
        <T>{lead.trimEnd()}</T>{" "}
        <span className="ps-hl-b">
          <T>{accent}</T>
        </span>
      </h1>
      <p className="text-[17px] leading-[1.55] text-(--muted-text)">
        <T>{sub}</T>
      </p>
    </Reveal>
  );
}

/**
 * 56px rounded tile with a purple glyph (Forgot password / Check your email).
 *
 * `slot` (new screens only): the mobile illustration slot. This is where the
 * tile sits on the phone layout; until the slot's `src` is set in
 * lib/public-site/assets.ts the tile shows as normal. Once artwork exists it
 * replaces the tile BELOW xl (96px, provisional size; desktop keeps the tile
 * beside the brand panel's own illustration).
 */
export function IconTile({
  children,
  delay = 0.1,
  slot,
}: {
  children: ReactNode;
  delay?: number;
  slot?: IllustrationKey;
}) {
  const cfg = slot ? IMAGE_SLOTS[slot] : null;
  const art = cfg?.src ?? null;
  return (
    <motion.div
      data-ps-reveal
      className={cn(
        "flex items-center justify-center text-(--beeliv-purple)",
        art
          ? "relative h-24 w-24 wf-d:h-14 wf-d:w-14 wf-d:rounded-[18px] wf-d:bg-[rgba(91,8,123,.08)]"
          : "h-14 w-14 rounded-[18px] bg-[rgba(91,8,123,.08)]",
      )}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DUR.fast, ease: EASE, delay }}
    >
      {art && cfg ? (
        <>
          <Image src={art} alt={cfg.alt} fill sizes="96px" className="object-contain wf-d:hidden" />
          <span className="hidden wf-d:flex">{children}</span>
        </>
      ) : (
        children
      )}
    </motion.div>
  );
}

/** `.au-foot`: centred 15px line pushed to the bottom of the mobile screen. */
export function AuthFoot({
  lead,
  href,
  label,
  delay,
}: {
  lead: string;
  href: string;
  label: string;
  delay: number;
}) {
  return (
    <Reveal when="mount" delay={delay} y={12} className="mt-auto">
      <p className="au-foot mt-0">
        <T>{lead.trimEnd()}</T>{" "}
        <Link href={href}>
          <T>{label}</T>
        </Link>
      </p>
    </Reveal>
  );
}

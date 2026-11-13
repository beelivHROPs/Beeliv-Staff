"use client";

/**
 * The auth screens' frame (Auth-*-Desktop.dc.html / Auth-*.dc.html).
 * Two responsive bands (project lead, 2026-10-01 - see the "Auth frame"
 * block at the end of public-site.css for the exact breakpoints and why;
 * a centred "popup card" treatment for the in-between range was tried and
 * explicitly rejected - the whole direction, not a detail):
 *
 * - Split (>= 820px wide): the brand panel (Deep Plum base, purple scrim,
 *   white logo, headline) sits beside the form column edge-to-edge, pinned
 *   while the form scrolls - never a floating centred card, at any width.
 *   The panel's column width is a fluid clamp(), so iPad portrait, Surface
 *   Duo Open, Kiosk etc. each get their own proportional width instead of
 *   one fixed number. Below the Full sub-range the panel also drops the
 *   illustration/body copy/role-card extras and tightens its own padding
 *   and type (this file's classes), since a narrower/shorter panel has no
 *   room for them.
 *   - Full sub-range (>= 1280px wide AND >= 780px tall): panel widens to
 *     the original 620px-at-1440 fluid width and the illustration/body
 *     copy/role-card reappear. Unchanged from before the popup-card
 *     experiment.
 * - Phone (< 820px): the mobile composition (purple curve header with back
 *   arrow, full-colour logo, then the form). Unchanged.
 *
 * ONE form instance serves both bands: the frame only switches presentation
 * with CSS, so field ids/state are never duplicated. `AuthBody` is the
 * wireframe's `form.au-body` (or a plain div on the Check-your-email screen).
 *
 * The wireframe's design-tool markers (black AUTH tags, monospace IMG notes)
 * are not rendered.
 */

import Image from "next/image";
import Link from "next/link";
import type { FormEventHandler, ReactNode, Ref } from "react";
import { motion } from "motion/react";
import { Logo } from "@/components/public/Logo";
import { Reveal } from "@/components/public/kit";
import { DUR, EASE, useMotionAllowed } from "@/components/public/motion";
import { T, stagger } from "@/components/public/primitives";
import {
  AUTH_FRAMES,
  AUTH_ROUTES,
  AUTH_SHARED,
  type AuthScreen,
  type IllustrationKey,
} from "@/lib/public-site/auth-content";
import { IMAGE_SLOTS } from "@/lib/public-site/assets";
import { cn } from "@/lib/utils";
import { authPaths } from "@/lib/auth/portals";
import { ChevronLeftIcon } from "./AuthIcons";

const MotionLink = motion.create(Link);

/* ------------------------------ desktop panel ------------------------------ */

function BrandPanel({
  screen,
  extra,
  animated,
  copy,
}: {
  screen: AuthScreen;
  extra?: ReactNode;
  animated: boolean;
  copy?: PanelCopy;
}) {
  const f = { ...AUTH_FRAMES[screen], ...copy };
  const wipe = animated
    ? {
        initial: { clipPath: "inset(0% 100% 0% 0% round 28px)" },
        animate: { clipPath: "inset(0% 0% 0% 0% round 28px)" },
        transition: { duration: DUR.slow + 0.2, ease: EASE },
      }
    : {};
  return (
    <div className="hidden wf-d:block wf-d:py-4 wf-d:pl-4">
      <motion.aside
        data-ps-reveal
        className="relative flex h-[calc(100dvh/var(--ps-zoom,1)-32px)] min-h-[720px] flex-col justify-between overflow-hidden rounded-[28px] p-10 text-white wf-d:sticky wf-d:top-4"
        {...wipe}
      >
        {/* Wireframe: solid Deep Plum base, then the purple scrim. */}
        <div aria-hidden="true" className="absolute inset-0 bg-(--deep-plum)" />
        <div
          aria-hidden="true"
          className="au-scrim absolute inset-0"
        />
        <PanelRing animated={animated} />

        <Reveal when="mount" delay={0.35} y={12} className="relative z-[2] self-start">
          <Link href={AUTH_ROUTES.home} aria-label="Beeliv Hospitality home" className="block">
            <Logo
              kind="white"
              tone="light"
              className="h-11 w-[150px] !border-white/55 !bg-transparent"
            />
          </Link>
        </Reveal>

        <Illustration slot={f.illustration} />

        <div className="relative z-[2] flex flex-col gap-[22px]">
          <Reveal when="mount" delay={0.5} y={20}>
            {/* Serif headline styling, but a <p>: the page's h1 is the form heading. */}
            <p
              className="ps-serif text-white [--fs-d:53] min-[1441px]:[--fs-d:34] min-[1441px]:!max-w-[22ch]"
              style={{ maxWidth: "13ch" }}
            >
              <T>{f.lead.trimEnd()}</T>{" "}
              <span className="text-(--antique-gold)">
                <T>{f.accent}</T>
              </span>
            </p>
          </Reveal>
          {f.body && (
            <Reveal when="mount" delay={0.62} y={16}>
              <p
                className="text-base leading-[1.55] text-white/[.82]"
                style={{ maxWidth: "38ch" }}
              >
                <T>{f.body}</T>
              </p>
            </Reveal>
          )}
          {extra && (
            <Reveal when="mount" delay={0.74} y={20}>
              {extra}
            </Reveal>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

/**
 * The panel's illustration slot (Auth-*-Desktop.dc.html: 420 x 380, 1.5px
 * dashed outline, 28px radius, cube glyph). The wireframe's "ILLUSTRATION"
 * note inside it is a design-tool tag and is not rendered. Real artwork:
 * set the slot's `src` in lib/public-site/assets.ts. The box shrinks (never
 * grows) when the panel is short, so the headline and role card always fit.
 */
function Illustration({ slot }: { slot: IllustrationKey }) {
  const cfg = IMAGE_SLOTS[slot];
  return (
    <div className="relative z-[2] flex min-h-0 grow items-center justify-center py-6">
      <motion.div
        data-ps-reveal
        className={cn(
          "relative flex h-[380px] max-h-full w-[420px] max-w-full shrink-0 items-center justify-center rounded-[28px] min-[1441px]:h-[470px] min-[1441px]:w-[540px]",
          !cfg.src && "border-[1.5px] border-dashed border-white/45 bg-white/[.06]",
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE, delay: 0.4 }}
      >
        {cfg.src ? (
          <Image
            src={cfg.src}
            alt={cfg.alt}
            fill
            sizes="420px"
            className="object-contain"
          />
        ) : (
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM12 12 20 7.5M12 12v9M12 12 4 7.5" />
          </svg>
        )}
      </motion.div>
    </div>
  );
}

/** The outlined organic ring bleeding off the panel's top-right corner. */
function PanelRing({ animated }: { animated: boolean }) {
  const allowed = useMotionAllowed();
  const draw =
    animated && allowed
      ? {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 1.6, ease: EASE, delay: 0.3 },
        }
      : {};
  return (
    <svg
      aria-hidden="true"
      className="absolute"
      style={{ right: -80, top: -60 }}
      width="360"
      height="360"
      viewBox="0 0 360 360"
    >
      <motion.path
        d="M180 12c92 8 170 80 166 168-4 90-86 170-178 166C76 342 8 264 14 176 20 90 92 4 180 12z"
        fill="none"
        stroke="rgba(255,255,255,.25)"
        strokeWidth="1.5"
        {...draw}
      />
    </svg>
  );
}

/* ------------------------------ mobile header ------------------------------ */

function MobileTop({
  screen,
  animated,
  copy,
  portal,
}: {
  screen: AuthScreen;
  animated: boolean;
  copy?: PanelCopy;
  portal?: "client" | "staff" | "admin";
}) {
  const f = { ...AUTH_FRAMES[screen], ...copy };
  if (portal) {
    // Keep "back" inside this app's own auth pages.
    const p = authPaths(portal);
    if (f.back.href === "/login") f.back = { ...f.back, href: p.loginPath };
    else if (f.back.href === "/forgot-password") f.back = { ...f.back, href: p.forgotPath };
  }
  const h = f.curve;
  // Paths copied from the wireframe (390 wide); stretched to the screen width.
  const d1 =
    h === 150
      ? "M0 0H390V96C340 124 280 106 214 116C140 127 78 156 0 130Z"
      : "M0 0H390V118C340 150 280 128 214 140C140 153 78 190 0 158Z";
  const d2 =
    h === 150
      ? "M170 0H390V70C350 92 300 80 250 58C214 44 190 24 170 0Z"
      : "M170 0H390V86C350 112 300 98 250 72C214 54 190 30 170 0Z";
  const rise = animated
    ? {
        initial: { y: -24, opacity: 0 },
        animate: { y: 0, opacity: 1 },
      }
    : {};
  return (
    <div className="relative shrink-0 wf-d:hidden" style={{ height: h }}>
      <svg
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-full"
        viewBox={`0 0 390 ${h}`}
        preserveAspectRatio="none"
      >
        <motion.path
          d={d1}
          style={{ fill: "var(--beeliv-purple)" }}
          {...rise}
          transition={{ duration: DUR.slow, ease: EASE }}
        />
        <motion.path
          d={d2}
          style={{ fill: "var(--beeliv-bright-purple)" }}
          opacity={0.5}
          {...rise}
          transition={{ duration: DUR.slow, ease: EASE, delay: 0.12 }}
        />
      </svg>
      <MotionLink
        href={f.back.href}
        aria-label={f.back.label}
        className="absolute top-[14px] left-3 z-[3] flex h-11 w-11 items-center justify-center rounded-full bg-white/[.16] !text-white"
        whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.26)" }}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.25, ease: EASE }}
      >
        <ChevronLeftIcon />
      </MotionLink>
    </div>
  );
}

/* ---------------------------------- frame ---------------------------------- */

/** Per-screen overrides of the panel text / mobile back link (portal sign-ins, invite, status pages). */
export type PanelCopy = {
  lead?: string;
  accent?: string;
  body?: string | null;
  back?: { href: string; label: string };
};

export function AuthFrame({
  screen,
  panelExtra,
  skeleton = false,
  portal,
  panel,
  children,
}: {
  screen: AuthScreen;
  /** Accent for the Client / Staff / Admin sign-ins (CSS vars in auth.css); omit for the default purple. */
  portal?: "client" | "staff" | "admin";
  panel?: PanelCopy;
  /** Signup job variant: the "Applying for" role card under the panel headline. */
  panelExtra?: ReactNode;
  /** Loading frame: same layout, no entrance motion. */
  skeleton?: boolean;
  children: ReactNode;
}) {
  const allowed = useMotionAllowed();
  const animated = allowed && !skeleton;
  return (
    // Two classes on purpose: `au-shell` is the bare var-scope hook Contact/
    // Request ALSO use (auth.css --au-error) and must stay layout-free;
    // `au-frame` carries this component's own responsive-band CSS (see the
    // "Auth frame" block at the end of public-site.css).
    <div
      className="au-shell au-frame min-h-[calc(100dvh/var(--ps-zoom,1))]"
      data-portal={portal}
    >
      <BrandPanel screen={screen} extra={panelExtra} animated={animated} copy={panel} />

      <div className="au-formcol flex min-h-[calc(100dvh/var(--ps-zoom,1))] flex-col">
        <MobileTop screen={screen} animated={animated} copy={panel} portal={portal} />

        <div className="au-backlink items-center">
          <MotionLink
            href={AUTH_ROUTES.home}
            className="inline-flex items-center gap-1.5 text-sm !text-(--muted-text) hover:!text-(--beeliv-purple)"
            initial="rest"
            whileHover="hover"
          >
            <T>
              <motion.span
                aria-hidden="true"
                className="inline-block"
                variants={{ rest: { x: 0 }, hover: { x: -4 } }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                ←
              </motion.span>{" "}
              Back to website
            </T>
          </MotionLink>
        </div>

        <main className="flex grow flex-col">{children}</main>

        <div className="au-legal justify-between text-[13px] text-(--muted-text)">
          <span>
            <T>{AUTH_SHARED.legalLeft}</T>
          </span>
          <span>
            <Link href={AUTH_ROUTES.privacy} className="!text-(--muted-text) hover:!text-(--beeliv-purple)">
              <T>{AUTH_SHARED.privacy}</T>
            </Link>
            {" "}
            <T>·</T>
            {" "}
            <Link href={AUTH_ROUTES.terms} className="!text-(--muted-text) hover:!text-(--beeliv-purple)">
              <T>{AUTH_SHARED.terms}</T>
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- body ----------------------------------- */

/**
 * The wireframe's `.au-body`: mobile = full-width column with 24px side
 * padding (centred, max 520 on wide phones/tablets); desktop = 440px column
 * centred in the form area with 48px above and below. `gap` is the mobile
 * row gap (Sign up uses 20, the rest 22).
 */
export function AuthBody({
  as = "form",
  gap = 22,
  logo = true,
  formRef,
  onSubmit,
  ariaBusy,
  children,
}: {
  as?: "form" | "div";
  gap?: 20 | 22;
  /** Mobile full-colour logo slot above the heading (Log in / Sign up only). */
  logo?: boolean;
  formRef?: Ref<HTMLFormElement>;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  ariaBusy?: boolean;
  children: ReactNode;
}) {
  const cls = cn(
    "flex w-full grow flex-col px-6 pt-1 pb-8",
    "mx-auto max-w-[520px]",
    "wf-d:mx-auto wf-d:my-auto wf-d:w-[440px] wf-d:max-w-none wf-d:grow-0 wf-d:px-0 wf-d:py-12",
    // Mobile row gap 22 (Sign up: 20); desktop rows are always 22, except on
    // a short split-band window (e.g. Surface Duo Open, 1114x705), where
    // the gap tightens so the form column fits without scrolling.
    gap === 20 ? "gap-5 wf-d:gap-[22px]" : "gap-[22px]",
    "[@media(min-width:820px)_and_(max-height:779.98px)]:gap-3.5 [@media(min-width:820px)_and_(max-height:779.98px)]:py-0",
  );
  const inner = (
    <>
      {logo && (
        <Reveal
          when="mount"
          y={12}
          delay={stagger(0, 0.1)}
          className="self-start wf-d:hidden"
        >
          <Logo kind="fullColour" className="h-14 w-[53px]" />
        </Reveal>
      )}
      {children}
    </>
  );
  if (as === "div") {
    return (
      <div className={cls}>
        {inner}
      </div>
    );
  }
  return (
    <form
      ref={formRef}
      // POST, so a submit before the page has hydrated can never put the
      // password in the URL (the default GET would).
      method="post"
      noValidate
      onSubmit={onSubmit}
      aria-busy={ariaBusy}
      className={cls}
    >
      {inner}
    </form>
  );
}

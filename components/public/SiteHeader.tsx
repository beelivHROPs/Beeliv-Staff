"use client";

/**
 * Public-site navigation.
 *
 * - DesktopHeader : sits inside the hero composition (Main.dc.html header).
 * - MobileHeader  : full-bleed hero header (Home-Mobile.dc.html) with the
 *                   hamburger that opens the Nav-Mobile.dc.html menu.
 * - MobileMenu    : the open-menu state, real open/close (Esc, scroll lock,
 *                   focus return), slides in with staggered links.
 * - StickyBar     : a compact bar that appears once the hero has scrolled
 *                   past, with a solid background + soft shadow. Fixed
 *                   overlay, so it never moves page layout.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { Logo } from "./Logo";
import { Btn } from "./kit";
import { T, u } from "./primitives";
import { DUR, EASE } from "./motion";
import { MOBILE_MENU, NAV_LINKS, ROUTES } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";

/* ---------------- menu state (shared by hero header + sticky bar) ------- */

type MenuCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Open the menu, remembering which button opened it (focus returns there). */
  openMenu: (trigger: HTMLElement) => void;
  /** The button that opened the menu (hero hamburger OR sticky hamburger). */
  triggerRef: React.RefObject<HTMLElement | null>;
};
const MenuContext = createContext<MenuCtx>({
  open: false,
  setOpen: () => {},
  openMenu: () => {},
  triggerRef: { current: null },
});

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const openMenu = useCallback((trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setOpen(true);
  }, []);
  return (
    <MenuContext.Provider value={{ open, setOpen, openMenu, triggerRef }}>
      {children}
      <MobileMenu />
    </MenuContext.Provider>
  );
}

/** Open/close the mobile menu from a header that lives inside <MenuProvider>. */
export function useMenu() {
  return useContext(MenuContext);
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/* ---------------- desktop nav link -------------------------------------- */

const MotionLink = motion.create(Link);

export function NavLink({
  href,
  label,
  active: forcedActive,
}: {
  href: string;
  label: string;
  /** Force the active state (e.g. Request pages keep "For Businesses" lit). */
  active?: boolean;
}) {
  const pathname = usePathname();
  const active = forcedActive ?? isActive(pathname, href);
  return (
    <MotionLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("ps-navlink relative pb-[6px]", active && "!text-(--beeliv-purple)")}
      initial="rest"
      whileHover="hover"
    >
      <T>{label}</T>
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-(--beeliv-purple)"
        variants={{ rest: { scaleX: active ? 1 : 0 }, hover: { scaleX: 1 } }}
        transition={{ duration: 0.3, ease: EASE }}
      />
    </MotionLink>
  );
}

function DesktopActions({ onDark }: { onDark: boolean }) {
  const tone = onDark ? "text-white" : "text-(--ink)";
  return (
    <div
      className="flex items-center [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-2.5"
      style={{ gap: u(22) }}
    >
      {/* Search drops out 960-1279 only (not <960, not >=1280): no room
          beside a full "Log in" + "Get Started" once the nav row itself
          takes its share - project lead, 2026-10-01 nav-widening pass. */}
      <button
        type="button"
        aria-label="Search"
        className={cn(
          "hidden h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent min-[1280px]:flex",
          tone,
        )}
      >
        <SearchIcon size={20} strokeWidth={1.8} />
      </button>
      <Link
        href={ROUTES.login}
        className={cn(
          "text-base font-extrabold whitespace-nowrap [@media(min-width:960px)_and_(max-width:1279.98px)]:!text-[13px]",
          tone,
        )}
      >
        <T>Log in</T>
      </Link>
      <Btn
        href={ROUTES.signup}
        label="Get Started →"
        variant="bp"
        style={{ height: 50 }}
      />
    </div>
  );
}

/** 820-1279px: the nav row is folded into the hamburger menu. */
export function CompactActions({ onDark }: { onDark: boolean }) {
  const { openMenu } = useContext(MenuContext);
  const tone = onDark ? "text-white" : "text-(--ink)";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Search"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent",
          tone,
        )}
      >
        <SearchIcon size={20} strokeWidth={1.8} />
      </button>
      <Link
        href={ROUTES.login}
        className={cn("px-1.5 py-3 text-[15px] font-extrabold whitespace-nowrap", tone)}
      >
        <T>Log in</T>
      </Link>
      <button
        type="button"
        aria-label="Open menu"
        aria-controls="mnav"
        aria-haspopup="dialog"
        onClick={(e) => openMenu(e.currentTarget)}
        className={cn("flex h-11 w-11 items-center justify-center border-0 bg-transparent", tone)}
      >
        <MenuIcon size={24} strokeWidth={1.6} />
      </button>
    </div>
  );
}

/* ---------------- desktop header (inside the hero stage) --------------- */

export function DesktopHeader() {
  return (
    <header
      className="absolute inset-x-0 top-0 z-[6] flex items-center [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-6 [@media(min-width:960px)_and_(max-width:1279.98px)]:!pr-7 [@media(min-width:960px)_and_(max-width:1279.98px)]:!pl-8"
      style={{
        // max(): the 60px logo must not be clipped by the scaled-down bar.
        height: `max(84px, ${u(110)})`,
        padding: `0 ${u(64)} 0 ${u(96)}`,
        gap: u(44),
      }}
    >
      <Link href={ROUTES.home} aria-label="Beeliv Hospitality home" className="shrink-0">
        <Logo
          kind="fullColour"
          eager
          className="h-[60px] w-[211px] [@media(min-width:960px)_and_(max-width:1279.98px)]:h-11 [@media(min-width:960px)_and_(max-width:1279.98px)]:w-[150px]"
        />
      </Link>
      {/* Straight nav row from 960px up (project lead, 2026-10-01: Duo Open,
          "desktop mode" phones, Kiosk and the iPad should keep the real nav
          row at their own size, not drop to the hamburger) - below that,
          820-959, there genuinely isn't room and it folds into the
          hamburger. 960-1279 also tightens gap/padding/logo (above) and the
          actions row + .ps-btn (public-site.css "Compact straight nav"
          block), since there's real room but not Full's room. */}
      <nav
        aria-label="Main"
        className="hidden grow justify-center min-[960px]:flex [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-4 [@media(min-width:960px)_and_(max-width:1279.98px)]:!justify-start [@media(min-width:960px)_and_(max-width:1279.98px)]:!pl-4"
        style={{ gap: u(34) }}
      >
        {NAV_LINKS.map((l) => (
          <NavLink key={l.href} href={l.href} label={l.label} />
        ))}
      </nav>
      <div className="ml-auto hidden min-[960px]:ml-0 min-[960px]:block">
        <DesktopActions onDark />
      </div>
      <div className="ml-auto min-[960px]:hidden">
        <CompactActions onDark />
      </div>
    </header>
  );
}

/* ---------------- mobile header (inside the mobile hero) --------------- */

export function MobileHeader() {
  const { openMenu } = useContext(MenuContext);
  return (
    <header className="relative z-[5] flex h-[72px] items-center justify-between pr-4 pl-5">
      <Link href={ROUTES.home} aria-label="Beeliv Hospitality home">
        <Logo kind="white" tone="light" className="h-10 w-[124px]" />
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          href={ROUTES.login}
          className="px-1.5 py-3 text-[15px] font-extrabold text-white"
        >
          <T>Log in</T>
        </Link>
        <button
          type="button"
          aria-label="Search"
          className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white/[.14] text-white"
        >
          <SearchIcon size={19} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Open menu"
          aria-controls="mnav"
          aria-haspopup="dialog"
          onClick={(e) => openMenu(e.currentTarget)}
          className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-white"
        >
          <MenuIcon size={24} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}

/* ---------------- mobile menu (Nav-Mobile.dc.html) --------------------- */

function MobileMenu() {
  const { open, setOpen, triggerRef } = useContext(MenuContext);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll lock + Escape + focus handling while open.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    // Make the rest of the page inert while the dialog is open so keyboard AND
    // screen-reader virtual-cursor navigation cannot leave it (aria-modal alone
    // is not honoured everywhere). The dialog's siblings are the page content.
    const panel = panelRef.current;
    const inerted: HTMLElement[] = [];
    if (panel?.parentElement) {
      for (const el of Array.from(panel.parentElement.children)) {
        if (el !== panel && el instanceof HTMLElement && !el.inert) {
          el.inert = true;
          inerted.push(el);
        }
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 960px)").matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const trigger = triggerRef.current;
    return () => {
      html.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      // Un-inert BEFORE returning focus (inert elements cannot take focus).
      // preventScroll: the trigger may be the (fixed) sticky-bar button or the
      // off-screen hero button; either way the page must not jump.
      for (const el of inerted) el.inert = false;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, setOpen, triggerRef]);

  // Close when the route changes.
  useEffect(() => setOpen(false), [pathname, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mnav"
          id="mnav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          ref={panelRef}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-(--deep-plum) text-white min-[960px]:hidden"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: DUR.fast, ease: EASE }}
        >
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[.12] pr-4 pl-5">
            <Link href={ROUTES.home} aria-label="Beeliv Hospitality home">
              <Logo kind="white" tone="light" className="h-10 w-[124px]" />
            </Link>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white/[.12] text-white"
            >
              <CloseIcon size={20} strokeWidth={1.8} />
            </button>
          </div>

          <nav aria-label="Main" className="flex flex-col px-5 pt-11">
            <div className="ps-eb mb-1.5 !text-[11px] !text-(--antique-gold)">
              {MOBILE_MENU.eyebrow}
            </div>
            {NAV_LINKS.map((l, i) => {
              const active = isActive(pathname, l.href);
              return (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE, delay: 0.12 + i * 0.06 }}
                >
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-14 items-center justify-between border-b border-white/[.12] py-2.5",
                      active ? "!text-(--antique-gold)" : "!text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {active && (
                        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-(--antique-gold)" />
                      )}
                      {/* Dialed back from !font-extrabold (800) per project-lead
                          feedback - 800 read as too heavy for the mobile menu list;
                          !font-semibold (600) still overrides .ps-serif's 500 default
                          but reads lighter. */}
                      <span className="ps-serif [--fs-m:26] !font-semibold">{l.label}</span>
                    </span>
                    <ArrowRightIcon size={20} strokeWidth={1.8} className="text-(--antique-gold)" />
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <motion.div
            className="flex flex-col gap-3 px-5 pt-7"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE, delay: 0.12 + NAV_LINKS.length * 0.06 }}
          >
            <Btn href={ROUTES.signup} label={MOBILE_MENU.getStarted} variant="bw" />
            <Link
              href={ROUTES.login}
              onClick={() => setOpen(false)}
              className="ps-btn !border-[1.5px] !border-white/60 !text-white"
            >
              {MOBILE_MENU.login}
            </Link>
            <Link
              href={ROUTES.request}
              onClick={() => setOpen(false)}
              className="py-2.5 text-center text-base !text-white"
            >
              {MOBILE_MENU.hiringPrompt}{" "}
              <span className="font-bold text-(--antique-gold)">{MOBILE_MENU.hiringLink}</span>
            </Link>
          </motion.div>

          <div className="mt-auto flex items-center justify-between border-t border-white/[.12] px-5 pt-[18px] pb-[22px] text-sm text-white/[.72]">
            <span>{MOBILE_MENU.phone}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- sticky bar ------------------------------------------- */

/**
 * Appears after the hero scrolls out of view. `sentinelId` is a zero-height
 * marker placed at the bottom of the hero.
 */
export function StickyBar({ sentinelId }: { sentinelId: string }) {
  const [show, setShow] = useState(false);
  const { openMenu } = useContext(MenuContext);

  // Scroll-position based (not an IntersectionObserver transition): it also
  // works after anchor jumps, reloads mid-page and back-navigation scroll
  // restoration, where the sentinel never crosses the viewport gradually.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = document.getElementById(sentinelId);
      if (el) setShow(el.getBoundingClientRect().top < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sentinelId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.header
          key="sticky"
          className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center gap-6 bg-white/95 px-5 shadow-[0_4px_24px_rgba(17,17,27,.08)] backdrop-blur-md wf-d:px-[max(24px,calc(64*var(--u)))] [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-4"
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: DUR.fast, ease: EASE }}
        >
          <Link href={ROUTES.home} aria-label="Beeliv Hospitality home" className="shrink-0">
            <Logo kind="fullColour" eager className="h-12 w-[149px] wf-d:h-[52px] wf-d:w-[177px] [@media(min-width:960px)_and_(max-width:1279.98px)]:!h-10 [@media(min-width:960px)_and_(max-width:1279.98px)]:!w-[135px]" />
          </Link>
          <nav
            aria-label="Main (sticky)"
            className="hidden grow justify-center min-[960px]:flex [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-4 [@media(min-width:960px)_and_(max-width:1279.98px)]:!justify-start [@media(min-width:960px)_and_(max-width:1279.98px)]:!pl-4"
            style={{ gap: u(34) }}
          >
            {NAV_LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
          </nav>
          <div className="ml-auto hidden min-[960px]:block">
            <DesktopActions onDark={false} />
          </div>
          <div className="ml-auto flex items-center gap-1.5 min-[960px]:hidden">
            <Link href={ROUTES.login} className="px-1.5 py-3 text-[15px] font-extrabold">
              Log in
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              aria-controls="mnav"
              aria-haspopup="dialog"
              onClick={(e) => openMenu(e.currentTarget)}
              className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-(--ink)"
            >
              <MenuIcon size={24} strokeWidth={1.6} />
            </button>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}

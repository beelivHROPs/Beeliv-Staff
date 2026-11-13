"use client";

/**
 * Standard marketing header for inner pages (the header drawn on the Request
 * wireframes; Home's header is a different, hero-overlaid composition).
 *
 * - Desktop (>= 820px): white 96px bar, hairline underneath - logo, centred
 *   nav (the page's section stays lit), search, "Log in", "Get Started →".
 * - Mobile: white 72px bar - logo, "Log in", hamburger (opens the shared
 *   Nav-Mobile menu from SiteHeader's <MenuProvider>, which the page must wrap
 *   this in).
 *
 * The wireframe's hamburger is the short-last-line variant (M3 17h12), unlike
 * Home's hero header, so it is drawn here.
 */

import Link from "next/link";
import { Logo } from "./Logo";
import { Btn } from "./kit";
import { NavLink, useMenu } from "./SiteHeader";
import { SearchIcon } from "./icons";
import { T } from "./primitives";
import { NAV_LINKS, ROUTES } from "@/lib/public-site/content";

export function PageHeader({ activeHref }: { activeHref: string }) {
  const { openMenu } = useMenu();
  return (
    <header className="border-b border-(--soft-border) bg-white">
      <div className="mx-auto flex h-[72px] max-w-[calc(1440*var(--u))] items-center justify-between px-5 wf-d:h-[calc(96*var(--u))] wf-d:gap-[calc(48*var(--u))] wf-d:px-[calc(96*var(--u))] [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-5 [@media(min-width:960px)_and_(max-width:1279.98px)]:!px-8">
      <Link href={ROUTES.home} aria-label="Beeliv Hospitality home" className="shrink-0">
        <Logo kind="fullColour" eager className="h-12 w-[158px] wf-d:h-14 wf-d:w-[205px] [@media(min-width:960px)_and_(max-width:1279.98px)]:!h-11 [@media(min-width:960px)_and_(max-width:1279.98px)]:!w-[150px]" />
      </Link>

      {/* Straight nav from 960px up - see SiteHeader.tsx's DesktopHeader for
          why (project lead, 2026-10-01: Duo Open/Kiosk/iPad/"desktop mode"
          keep the real nav row, sized down, instead of the hamburger). */}
      <nav
        aria-label="Main"
        className="hidden grow justify-center min-[960px]:flex [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-4 [@media(min-width:960px)_and_(max-width:1279.98px)]:!justify-start [@media(min-width:960px)_and_(max-width:1279.98px)]:!pl-4"
        style={{ gap: "calc(36*var(--u))" }}
      >
        {NAV_LINKS.map((l) => (
          <NavLink key={l.href} href={l.href} label={l.label} active={l.href === activeHref} />
        ))}
      </nav>

      {/* Desktop actions. Search drops out 960-1279 (see SiteHeader.tsx's
          DesktopActions for why); .ps-btn itself shrinks for that range via
          the "Compact straight nav" block in public-site.css. */}
      <div className="hidden items-center gap-6 min-[960px]:flex [@media(min-width:960px)_and_(max-width:1279.98px)]:!gap-2.5">
        <button
          type="button"
          aria-label="Search"
          className="hidden h-11 w-11 items-center justify-center border-0 bg-transparent text-(--ink) min-[1280px]:flex"
        >
          <SearchIcon size={20} strokeWidth={1.8} />
        </button>
        <Link href={ROUTES.login} className="text-[15px] font-extrabold whitespace-nowrap !text-(--ink) hover:!text-(--deep-plum) [@media(min-width:960px)_and_(max-width:1279.98px)]:!text-[13px]">
          <T>Log in</T>
        </Link>
        <Btn href={ROUTES.signup} label="Get Started →" variant="bp" style={{ height: 48 }} />
      </div>

      {/* Mobile actions */}
      <div className="ml-auto flex items-center gap-1 min-[960px]:hidden">
        <Link href={ROUTES.login} className="px-2.5 py-3 text-[15px] font-extrabold !text-(--ink)">
          <T>Log in</T>
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-controls="mnav"
          aria-haspopup="dialog"
          onClick={(e) => openMenu(e.currentTarget)}
          className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-(--ink)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M3 7h18M3 12h18M3 17h12" />
          </svg>
        </button>
      </div>
      </div>
    </header>
  );
}

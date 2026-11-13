"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { T } from "./primitives";
import { DUR, EASE } from "./motion";
import { cn } from "@/lib/utils";
import { PILLAR_INDICATOR, ROUTES } from "@/lib/public-site/content";
import { Logo } from "./Logo";
import { MenuIcon } from "./icons";
import { SiteSearch } from "./SiteSearch";
import { useMenu } from "./SiteHeader";

/**
 * Hero headline. On load the words rise in one after another (reading as a
 * line-by-line reveal), with the highlighted phrase landing last. Words are
 * real text in the heading, so screen readers and copy/paste are unaffected.
 * In skeleton mode it renders the plain wrapped text the Skel boards show.
 */
export function HeroHeadline({
  lead,
  accent,
  accentClassName,
  className,
  skeleton = false,
  delay = 0.15,
}: {
  lead: string;
  accent: string;
  accentClassName: string;
  className?: string;
  skeleton?: boolean;
  delay?: number;
}) {
  if (skeleton) {
    return (
      <h1 className={className}>
        <T>{lead}</T>{" "}
        <span className={accentClassName}>
          <T>{accent}</T>
        </span>
      </h1>
    );
  }
  const leadWords = lead.split(" ");
  const accentWords = accent.split(" ");
  const word = (w: string, i: number, extra: number) => (
    <span key={`${w}-${i}-${extra}`}>
      <motion.span
        data-ps-reveal
        className="inline-block"
        initial={{ opacity: 0, y: "0.5em" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE, delay: delay + (i + extra) * 0.045 }}
      >
        {w}
      </motion.span>{" "}
    </span>
  );
  return (
    <h1 className={className}>
      {leadWords.map((w, i) => word(w, i, 0))}
      <span className={accentClassName}>
        {accentWords.map((w, i) => word(w, i, leadWords.length + 4))}
      </span>
    </h1>
  );
}

/**
 * Desktop hero "01 People / 02 Systems / 03 Service" indicator. Each item
 * smooth-scrolls to its pillar column in section 05. The gold state follows
 * hover/focus, then the last item chosen (01 by default, as wireframed).
 */
export function PillarIndicator({ skeleton = false }: { skeleton?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const current = hovered ?? selected;

  const go = (id: string, i: number) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setSelected(i);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      aria-label="Pillars"
      // Karla (--font-sans) loads as a 200-800 variable font, so 800
      // (font-extrabold) is the heaviest weight actually available - project
      // lead: "make the nav text really bold to show" against the real photo.
      className="flex flex-col text-xs font-extrabold tracking-[.08em] uppercase"
      style={{ gap: "calc(22*var(--u))" }}
    >
      {PILLAR_INDICATOR.map((p, i) => (
        <a
          key={p.target}
          href={`#${p.target}`}
          onClick={skeleton ? undefined : go(p.target, i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
          className={cn(
            "border-l-[1.5px] pl-2.5 transition-colors duration-300",
            current === i
              ? "!border-(--antique-gold) !text-(--antique-gold)"
              : "!border-white/40 !text-white",
          )}
        >
          <T>{p.num}</T>
          <br />
          <T>{p.label}</T>
        </a>
      ))}
    </nav>
  );
}

/**
 * Hero-only mobile header (Home's full-bleed photo hero). Same slots as
 * SiteHeader's `MobileHeader` (logo, search, hamburger) minus the "Log in"
 * link - project-lead direction: "remove the login button in the mobile
 * hero and leave only the search bar". Every OTHER page keeps the shared
 * `MobileHeader` (with "Log in") unchanged; this component is not used there.
 * The hamburger reuses the same `useMenu()` context/menu as every other
 * header, so it opens the one real mobile menu already built in SiteHeader.
 */
export function HeroMobileHeader() {
  const { openMenu } = useMenu();
  return (
    <header className="relative z-[5] flex h-[72px] items-center justify-between pr-4 pl-5">
      <Link href={ROUTES.home} aria-label="Beeliv Hospitality home">
        <Logo kind="white" tone="light" className="h-10 w-[124px]" />
      </Link>
      <div className="flex items-center gap-1.5">
        <SiteSearch
          triggerClassName="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white/[.14] text-white"
          panelAlign="right"
        />
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

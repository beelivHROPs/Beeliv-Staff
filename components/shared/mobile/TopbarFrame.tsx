"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import "./phone-header.css";

/**
 * Shared FLAT phone header (below 768px), approved 2026-10-27 (docs/design-references/header-proposal-2026-10-27.html).
 * Pure presentation, no app imports, themed only through --ap-* variables so Applicant, Staff (incl. dark mode),
 * Client and Admin all use it. Styles live in phone-header.css.
 *
 * <TopbarFrame title? subtitle? home?>   sticky transparent row; after ~40px of scroll it blurs, gets a hairline and a
 *                                        small centred title; below the row the ONE large page title scrolls away
 *   leading: <TopbarAvatarLink/> (+ <TopbarGreeting/> on Home) or a back circle
 *   actions: <GlobalSearchButton className={topbarCircle}/> + bell (TopbarButton.tsx)
 * </TopbarFrame>
 *
 * Use <TopbarSpacer/> (the `spacer` slot) to push the actions to the right on inner pages.
 */
export function TopbarFrame({
  children,
  style,
  className = "",
  title,
  subtitle,
  home = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  /** Inner pages: the one large page title (also the small title that fades in while scrolled). */
  title?: string;
  subtitle?: string;
  /** Home: greeting row only, no large title. */
  home?: boolean;
}) {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let on = false;
    const update = () => {
      const next = window.scrollY > 40;
      if (next === on) return;
      on = next;
      el.toggleAttribute("data-scrolled", next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header ref={bar} style={style} data-ph={home ? "home" : "inner"} className={`bv-ph ap-topbar ${className}`}>
        <div className="bv-ph-row">{children}</div>
        {title && !home ? (
          <span className="bv-ph-mini" aria-hidden="true">
            {title}
          </span>
        ) : null}
      </header>
      {title && !home ? (
        <div className="bv-ph-titlewrap ap-topbar" aria-hidden="true">
          <div className="bv-ph-title">{title}</div>
          {subtitle ? <div className="bv-ph-sub">{subtitle}</div> : null}
        </div>
      ) : null}
    </>
  );
}

/** Pushes the actions to the right on inner pages. */
export function TopbarSpacer() {
  return <span className="min-w-0 flex-1" aria-hidden="true" />;
}

/** 44px gradient circle with a 3px surface-colour ring and a soft shadow, a plain link to the profile. Put a 38px avatar inside. */
export function TopbarAvatarLink({ href, label = "Open profile", children }: { href: string; label?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="bv-ph-avatar relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)"
    >
      {children}
    </Link>
  );
}

const subscribeNever = () => () => {};
function timeGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function TopbarGreeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribeNever, timeGreeting, () => "Welcome");
  return (
    <div className="min-w-0 flex-1 leading-tight">
      <span className="block truncate text-[13px] text-(--ap-muted)">{greeting}</span>
      <b className="block truncate text-[19px] font-bold text-(--ap-ink)">{name}</b>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Roughly the button's own vertical center in the viewport (bottom-5/~20px
// on mobile, bottom-6/~24px on sm:+, size-11/44px tall) — used to test
// whether a `data-tinted-bg` section currently covers that point, not an
// exact hit-test (a few px of slop doesn't matter for a color swap).
const BUTTON_OFFSET_FROM_BOTTOM = 42;

// Tailwind's `sm` breakpoint — the tinted-bg contrast swap below is
// mobile-only (project-lead direction); on desktop the button always stays
// solid purple regardless of what's scrolled underneath it.
const MOBILE_BREAKPOINT_PX = 640;

/**
 * Floating "back to top" button for long scrolling pages (the homepage,
 * with its hero → How It Works → Open Positions → FAQ → closing CTA →
 * footer stack, is the motivating case). Hidden until the visitor has
 * actually scrolled past the hero, so it doesn't clutter the first
 * screenful; fixed bottom-right, matching the floating-control convention
 * already established elsewhere (e.g. chat/help widgets on other sites,
 * this app's own floating chip in HeroPreviewCard).
 *
 * Self-adjusting contrast, mobile only: solid purple by default, but flips
 * to an inverse (white/bordered) style whenever it's currently sitting over
 * a `data-tinted-bg` section (the hero's bg-hero-glow, HowItWorks' bg-brand-
 * wash, the purple job cards) — those can make a solid purple button start
 * blending in, especially on mobile where the button sits closer to the
 * content it's floating over. Desktop keeps the plain solid style always
 * (project-lead direction) — checked on scroll via getBoundingClientRect
 * rather than IntersectionObserver, since the button's screen position is
 * fixed, so a direct point-in-rect test against each tinted section is
 * simpler than fighting rootMargin math to approximate the same corner.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [onTintedBg, setOnTintedBg] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 480);

      if (window.innerWidth >= MOBILE_BREAKPOINT_PX) {
        setOnTintedBg(false);
        return;
      }

      const buttonY = window.innerHeight - BUTTON_OFFSET_FROM_BOTTOM;
      const tintedSections = document.querySelectorAll<HTMLElement>("[data-tinted-bg]");
      let overTinted = false;
      for (const section of tintedSections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= buttonY && rect.bottom >= buttonY) {
          overTinted = true;
          break;
        }
      }
      setOnTintedBg(overTinted);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      // sm:bg-primary! etc. (Tailwind v4's trailing-`!` important syntax) —
      // CSS-guaranteed on top of the JS width check above — sm: and up
      // always renders solid purple, forced over the onTintedBg branch's
      // classes regardless of any state timing.
      className={`fixed right-5 bottom-5 z-30 flex size-11 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:shadow-xl sm:right-6 sm:bottom-6 sm:border-0! sm:bg-primary! sm:text-primary-foreground! sm:shadow-primary/20! ${
        onTintedBg
          ? "border border-border bg-white text-primary shadow-primary/10 hover:bg-white/90"
          : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
      } ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <ArrowUp className="size-5" strokeWidth={2.25} />
    </button>
  );
}

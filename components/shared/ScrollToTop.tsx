"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const KEY = "bv-scroll";

const here = () => window.location.pathname + window.location.search;

function readMap(): Record<string, number> {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function remember(pos: number) {
  try {
    const map = readMap();
    map[here()] = Math.round(pos);
    window.sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode): going back simply starts at the top.
  }
}

/**
 * Opening a page from a link, a menu or a reload starts at the top (project
 * lead: "all pages should start from the top always"). Going BACK or FORWARD
 * (the browser button, or a swipe back on a phone) returns to where the person
 * was, e.g. back to the same place in a long staff list. The browser's own
 * scroll restoration is off, so this component does both. Links to an in-page
 * anchor (#section) are left alone so they still jump there.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const popped = useRef(false);
  const ignoreScrollUntil = useRef(0);

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Remember where the person is on each page.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (Date.now() < ignoreScrollUntil.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => remember(window.scrollY));
    };
    // Just before following a link or row, save the exact spot, and ignore the reset to the top that follows.
    const onClick = () => {
      // Any click may start a navigation (links, clickable table rows, buttons), so save the spot first.
      remember(window.scrollY);
      ignoreScrollUntil.current = Date.now() + 1500;
    };
    const onPop = () => {
      popped.current = true;
      window.setTimeout(() => (popped.current = false), 3000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useLayoutEffect(() => {
    if (window.location.hash) return;
    if (!popped.current) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    popped.current = false;
    const target = readMap()[here()] ?? 0;
    if (target <= 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    // The page may still be loading its data: keep trying until it is tall enough (or give up after 2.5s).
    ignoreScrollUntil.current = Date.now() + 2600;
    const started = Date.now();
    let timer = 0;
    const tryRestore = () => {
      window.scrollTo({ top: target, left: 0, behavior: "instant" });
      const reached = Math.abs(window.scrollY - target) < 3;
      if (!reached && Date.now() - started < 2500) timer = window.setTimeout(tryRestore, 60);
    };
    tryRestore();
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

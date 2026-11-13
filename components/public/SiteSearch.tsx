"use client";

/**
 * Site-wide search trigger + results panel. A self-contained, reusable
 * component (search() call, debounce, keyboard handling, panel) so any
 * header can drop it in; today only the mobile hero header wires it up
 * (see HeroParts.tsx `HeroMobileHeader`).
 *
 * Behaviour:
 *  - Tapping/focusing the trigger opens an inline results panel (no page
 *    navigation, no layout shift - the panel is absolutely positioned).
 *  - Debounced (~200ms) live results as the visitor types.
 *  - Enter navigates to the top (or arrow-selected) result.
 *  - Escape closes the panel and returns focus to the trigger.
 *  - Arrow up/down move a "selected" result (nice-to-have keyboard nav).
 *  - Reduced motion drops the panel's rise, keeping the opacity fade.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CloseIcon, SearchIcon } from "./icons";
import { search, type SearchResult } from "@/lib/public-site/search";
import { searchJobs } from "@/lib/public-site/search-jobs";
import { DUR, EASE, usePrefersReducedMotion } from "./motion";
import { cn } from "@/lib/utils";
import { GlassIcon } from "@/components/shared/icons";

const DEBOUNCE_MS = 200;

export function SiteSearch({
  triggerClassName,
  triggerLabel = "Search",
  iconSize = 19,
  panelClassName,
  panelAlign = "right",
}: {
  triggerClassName?: string;
  triggerLabel?: string;
  iconSize?: number;
  panelClassName?: string;
  /** Which edge of the trigger the panel hangs from. */
  panelAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const reduce = usePrefersReducedMotion();
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Debounced live results. Each new result set resets the keyboard selection.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      // Pages match locally; jobs come from a server action (empty when the server says no sample data).
      const pages = search(query);
      searchJobs(query)
        .then((jobs) => !cancelled && setResults([...jobs, ...pages]))
        .catch(() => !cancelled && setResults(pages));
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  // Focus the input on open; Escape (from anywhere in the panel) and outside
  // clicks close it.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex >= 0 ? activeIndex : 0];
      if (target) {
        router.push(target.href);
        close();
      }
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close search" : triggerLabel}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={triggerClassName}
      >
        {open ? (
          <CloseIcon size={iconSize} strokeWidth={1.8} />
        ) : (
          <SearchIcon size={iconSize} strokeWidth={1.8} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            key="site-search-panel"
            role="search"
            className={cn(
              "absolute top-[calc(100%+8px)] z-[20] w-[min(92vw,360px)] rounded-[16px] bg-white p-3 shadow-[0_18px_40px_rgba(17,17,27,.18)]",
              panelAlign === "right" ? "right-0" : "left-0",
              panelClassName,
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: DUR.fast, ease: EASE }}
          >
            <div className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-2">
              <SearchIcon size={17} strokeWidth={1.8} className="shrink-0 text-(--muted-text)" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search jobs, pages..."
                aria-label="Search the site"
                aria-autocomplete="list"
                aria-controls={listId}
                className="w-full border-0 bg-transparent text-[15px] text-(--ink) outline-none placeholder:text-(--muted-text)"
              />
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label="Search results"
              className="mt-2 flex max-h-[280px] flex-col gap-1 overflow-y-auto"
            >
              {query.trim() === "" ? (
                <li className="px-3 py-2 text-[13px] text-(--muted-text)">
                  Start typing to search jobs and pages.
                </li>
              ) : results.length === 0 ? (
                <li className="flex items-center gap-2 px-3 py-2 text-[13px] text-(--muted-text)">
                  <GlassIcon name="search" size={40} />
                  <span>No results for &ldquo;{query}&rdquo;.</span>
                </li>
              ) : (
                results.map((r, i) => (
                  <li key={r.id} role="option" aria-selected={i === activeIndex}>
                    <Link
                      href={r.href}
                      onClick={close}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-[10px] px-3 py-2 text-(--ink) transition-colors",
                        i === activeIndex ? "bg-[rgba(91,8,123,.08)]" : "hover:bg-black/[.03]",
                      )}
                    >
                      <span className="text-[14px] font-semibold">{r.title}</span>
                      {r.subtitle && (
                        <span className="text-[12px] text-(--muted-text)">{r.subtitle}</span>
                      )}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

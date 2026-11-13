"use client";

/**
 * Narrow-desktop job page helper (768 to 999px): the right-hand side card does not fit there, so once the facts
 * container has scrolled out of view a SLIM summary card slides in under the top bar with the key details and the
 * calls to action (Apply, Save, Share). It is one row high, sits in a zero-height sticky wrapper (so it never moves
 * the page content) and is inert while hidden. Shared by the Applicant and the public job pages.
 */
import { useEffect, useState, type ReactNode } from "react";

export function JobStickySummary({
  observeId,
  topClass = "top-[104px]",
  title,
  details,
  children,
}: {
  /** id of the element (the facts container) whose scrolling out of view reveals the card. */
  observeId: string;
  /** Tailwind `top-[..]` class that clears the page's fixed header. */
  topClass?: string;
  title: string;
  details: string[];
  /** The buttons: one Apply control, then icon buttons. */
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(observeId);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.bottom < 120),
      // The fixed top bar covers the first ~110px, so treat that strip as outside the viewport.
      { threshold: 0, rootMargin: "-112px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [observeId]);

  return (
    <div className={`sticky z-30 hidden h-0 min-[768px]:max-[999px]:block ${topClass}`}>
      <div
        inert={!show}
        className={`absolute inset-x-0 top-0 flex items-center gap-3 rounded-[18px] border border-(--ap-line) bg-white px-4 py-2.5 shadow-[0_10px_28px_rgba(37,0,68,.14)] transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
          show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[15px] leading-tight text-(--ap-ink)">{title}</b>
          <span className="block truncate text-[13px] leading-snug text-(--ap-muted)">{details.filter(Boolean).join(" · ")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

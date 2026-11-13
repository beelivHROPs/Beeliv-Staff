"use client";

/**
 * A small "i" button that opens a popover with an explanation or a note.
 * Replaces grey explanatory paragraphs: the page stays quiet, the words stay
 * one tap away. Keyboard: Enter / Space opens, Escape closes. z-[150].
 */
import { useId, useState, type ReactNode } from "react";
import { usePopover } from "./usePopover";

const WIDTH = 300;

export function InfoHint({ label = "More information", children, className = "" }: { /** Accessible name of the button, e.g. "About late and absent". */ label?: string; children: ReactNode; className?: string }) {
  const { open, setOpen, wrap, trigger } = usePopover();
  const id = useId();
  // Left offset (px, relative to the button) that keeps the popover on screen.
  const [shift, setShift] = useState(0);
  const toggle = () => {
    if (!open && wrap.current) {
      const r = wrap.current.getBoundingClientRect();
      const w = Math.min(WIDTH, window.innerWidth - 24);
      const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, 12), window.innerWidth - w - 12);
      setShift(left - r.left);
    }
    setOpen(!open);
  };
  return (
    <div ref={wrap} className={`relative inline-flex ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
        className="ap-hit inline-flex size-7 items-center justify-center rounded-full text-(--ap-muted) transition-colors hover:bg-(--ap-line-2) hover:text-(--ap-ink) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none"
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.2" />
          <circle cx="12" cy="7.7" r=".6" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div id={id} role="note" style={{ left: shift, width: `min(${WIDTH}px, calc(100vw - 24px))` }} className="ap-pop-in absolute top-[calc(100%+6px)] z-[150] rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-3.5 text-left text-[13px] leading-relaxed font-normal text-(--ap-ink-2) shadow-(--ap-shadow)">
          {children}
        </div>
      ) : null}
    </div>
  );
}

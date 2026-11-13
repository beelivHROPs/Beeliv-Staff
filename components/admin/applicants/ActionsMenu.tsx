"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "@/components/applicant/icons";
import { QUIET_ICON_BTN } from "@/components/admin/standard/MoreMenu";

export interface ActionsMenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
}

/**
 * A single "More" button that opens a short list of secondary actions, so a page header shows one main button
 * instead of five. Esc and an outside click close it; arrow keys move between items.
 */
export function ActionsMenu({ label = "More", items, disabled = false, quiet = false, triggerClassName, alignEnd = false }: { label?: string; items: ActionsMenuItem[]; disabled?: boolean; /** Show the trigger as the quiet "..." icon button instead of the labelled "More" button. */ quiet?: boolean; /** Replaces the quiet trigger's classes (phone cover: round white button). */ triggerClassName?: string; /** Phones: open the menu towards the left, for a trigger at the right edge. */ alignEnd?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;
  const itemCls = "flex h-11 w-full items-center rounded-[10px] px-3 text-left text-[15px] font-semibold hover:bg-(--ap-line-2)";
  return (
    <div ref={wrap} className="relative" data-no-row>
      <button
        type="button"
        disabled={disabled}
        aria-label={quiet ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={quiet ? `${triggerClassName ?? QUIET_ICON_BTN} disabled:opacity-50` :"ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold max-[767px]:h-10 max-[767px]:px-4 max-[767px]:text-[14px]"}
      >
        {quiet ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        ) : (
          <>
            {label}
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </>
        )}
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={label} className={`ap-pop-in absolute top-[calc(100%+6px)] right-0 z-40 w-[250px] ${alignEnd ? "max-[767px]:right-0" : "max-[767px]:right-auto max-[767px]:left-0"} rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-1.5 shadow-(--ap-shadow)`}>
          {items.map((it, i) => (
            <div key={it.label}>
              {it.tone === "danger" && i > 0 ? <hr className="my-1 border-(--ap-line-2)" /> : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={`${itemCls} ${it.tone === "danger" ? "text-(--ap-rose)" : "text-(--ap-ink-2)"}`}
              >
                {it.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

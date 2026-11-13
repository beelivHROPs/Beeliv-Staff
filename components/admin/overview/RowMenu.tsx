"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { useIsClient } from "@/components/applicant/motion";

export interface RowMenuItem {
  label: string;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
}

/**
 * Three-dot row menu. Links navigate; actions call onSelect. Esc and outside
 * click close it. role="menu" so the dark-mode layer in admin.css styles it.
 * Phones (<768px) get a bottom sheet (never clips off-screen, 52px rows);
 * larger screens get the anchored popover, flipped upward when there is no room below.
 * The trigger is a 44px target, centred on its row by the parent's items-center.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [up, setUp] = useState(false);
  const isClient = useIsClient();
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    if (sheet) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.body.style.overflow = prev;
        document.removeEventListener("keydown", onEsc);
      };
    }
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, sheet]);

  function toggle() {
    if (open) return setOpen(false);
    setSheet(window.matchMedia("(max-width: 767px)").matches);
    const r = wrap.current?.getBoundingClientRect();
    setUp(!!r && window.innerHeight - r.bottom < items.length * 44 + 40 && r.top > window.innerHeight - r.bottom);
    setOpen(true);
  }

  const itemCls = sheet
    ? "flex h-[52px] w-full items-center rounded-[12px] px-4 text-left text-[15px] font-semibold active:bg-(--ap-line-2)"
    : "flex h-11 w-full items-center rounded-[10px] px-3 text-left text-[15px] font-semibold hover:bg-(--ap-line-2)";
  const list = items.map((it) =>
    it.href ? (
      <Link key={it.label} role="menuitem" href={it.href} className={`${itemCls} text-(--ap-ink-2)`} onClick={() => setOpen(false)}>
        {it.label}
      </Link>
    ) : (
      <button
        key={it.label}
        type="button"
        role="menuitem"
        className={`${itemCls} ${it.tone === "danger" ? "text-(--ap-rose)" : "text-(--ap-ink-2)"}`}
        onClick={() => {
          setOpen(false);
          it.onSelect?.();
        }}
      >
        {it.label}
      </button>
    ),
  );
  return (
    <div ref={wrap} className={`relative shrink-0${items.every((i) => i.href) ? " ad-rowmenu-nav" : ""}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className="ap-hit -mr-2 flex size-11 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2) hover:text-(--ap-ink) min-[768px]:mr-0 min-[768px]:size-10"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5.5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="18.5" r="1.7" />
        </svg>
      </button>
      {open && !sheet ? (
        <div id={menuId} role="menu" aria-label={label} className={`ap-pop-in absolute right-0 z-40 w-[210px] rounded-2xl border border-(--ap-line) bg-(--ap-surface) p-1.5 shadow-[0_18px_40px_rgba(37,0,68,.14)] ${up ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"}`}>
          {list}
        </div>
      ) : null}
      {open && sheet && isClient
        ? createPortal(
            <div className={`${ADMIN_THEME} fixed inset-0 z-[130] flex items-end`} style={{ background: "rgba(17,17,27,.45)" }} onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
              <div id={menuId} role="menu" aria-label={label} className="w-full rounded-t-[16px] border-t border-(--ap-line) bg-(--ap-surface) px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] text-(--ap-ink)">
                <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-9 rounded-full bg-(--ap-line)" />
                <p className="truncate px-4 pb-1 text-[12.5px] text-(--ap-muted)">{label}</p>
                {list}
                <button type="button" onClick={() => setOpen(false)} className="mt-1.5 flex h-[52px] w-full items-center justify-center rounded-[12px] border border-(--ap-line) text-[15px] font-semibold text-(--ap-ink)">
                  Cancel
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

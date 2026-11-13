"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Makes whole list rows clickable (project lead: anything with a three-dot menu should also open on click).
 * Rows and cards in the shared list kit carry the class `ad-clickrow`. A click anywhere on one, except on a button,
 * link, field, checkbox, menu or anything marked `data-no-row`, opens the row's main link (the first /admin link in
 * it). Ctrl/Cmd-click opens a new tab. Selectable rows (aria-selected) are left alone. Mounted once in the Admin layout.
 */
const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=menu],[role=menuitem],[role=dialog],[role=checkbox],[role=switch],[data-no-row]";

export function RowClick() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (!t || t.closest(INTERACTIVE)) return;
      const row = t.closest<HTMLElement>(".ad-clickrow");
      if (!row || row.hasAttribute("aria-selected")) return;
      if (window.getSelection()?.toString()) return; // the person is selecting text
      const link = row.querySelector<HTMLAnchorElement>('a[href^="/admin"]');
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (e.metaKey || e.ctrlKey) window.open(href, "_blank", "noopener");
      else router.push(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}

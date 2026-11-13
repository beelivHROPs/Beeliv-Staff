"use client";

import { shareOrOpenSheet } from "@/lib/share/share-link";
import { T } from "./primitives";

function ShareGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}

/**
 * Share a job: the phone's share sheet where there is one, otherwise copy the
 * link and say so. `icon` = square icon-only button for the mobile apply bar.
 */
export function ShareButton({ title, text, label, icon = false, className = "" }: { title: string; text?: string; label: string; icon?: boolean; className?: string }) {
  function share() {
    // Straight from the click: the native share needs the user gesture, so nothing is awaited before it.
    void shareOrOpenSheet({ title, text: text ?? `${title}: apply on Beeliv` });
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={icon ? `Share ${title}` : undefined}
      className={icon ? `ps-btn ps-bo !h-[52px] !w-[52px] shrink-0 !px-0 bg-white ${className}` : `ps-btn ps-bo gap-2 bg-white font-semibold ${className}`}
    >
      <ShareGlyph />
      {icon ? null : <T>{label}</T>}
    </button>
  );
}

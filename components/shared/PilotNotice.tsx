"use client";

import { usePathname } from "next/navigation";
import { usePilotHidden } from "@/lib/pilot/context";

/**
 * One calm banner for a screen that is not part of the pilot (lib/pilot/menu.ts). It never blocks: the screen below
 * still works so the project lead can demo it. Shown only while the pilot menu is on. Presentation only.
 */
export function PilotNotice() {
  const hidden = usePilotHidden();
  const pathname = usePathname();
  if (!hidden(pathname)) return null;
  return (
    <p role="note" className="mb-4 rounded-xl border border-(--ap-line) bg-(--ap-tint-soft) px-4 py-2.5 text-[13.5px] leading-snug text-(--ap-ink-2)">
      <b className="font-semibold text-(--ap-ink)">This screen is not part of the pilot yet.</b> It is shown for preview and may not reflect real records.
    </p>
  );
}

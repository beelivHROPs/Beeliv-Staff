import type { ReactNode } from "react";
import type { LucideIcon } from "@/components/applicant/icons";
import { Reveal } from "./motion";

/**
 * Small presentational pieces shared by the Documents / Profile /
 * Notifications / Settings screens, mirroring the wireframe's final cascade:
 * - IconTile  -> `.si` / `.ri` / `.ni` flat tinted tiles with duotone glyphs
 * - SectionCard -> `.card.psec` with its `.ch` header row
 */

/** Wireframe tile tones (final override block, lines ~1186-1189). */
// Icon tiles are brand violet only (project lead: too many colours). Status colour lives on the status pills, not the icons.
export const TILE_TONE = {
  v: "bg-[#F5EAF8] text-(--ap-violet)",
  r: "bg-[#F5EAF8] text-(--ap-violet)",
  a: "bg-[#F5EAF8] text-(--ap-violet)",
  ok: "bg-[#F5EAF8] text-(--ap-violet)",
} as const;
export type TileTone = keyof typeof TILE_TONE;

export function IconTile({
  icon: Icon,
  tone = "v",
  className = "size-11 rounded-xl",
  iconClassName = "size-[22px]",
}: {
  icon: LucideIcon;
  tone?: TileTone;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span aria-hidden="true" className={`ap-duo flex shrink-0 items-center justify-center ${TILE_TONE[tone]} ${className}`}>
      <Icon className={iconClassName} />
    </span>
  );
}

/** `.card` at the wireframe's desktop / tablet / phone paddings and radii. */
export const CARD =
  "ap-card rounded-[20px] p-6 min-[768px]:max-[1100px]:p-[22px] max-[767px]:rounded-[18px] max-[767px]:px-[18px] max-[767px]:py-5";

/** `.ch h2` - serif 29px (26px tablet, 25px phone); `aside` variant is 25px. */
export function sectionTitleClass(aside = false) {
  return aside
    ? "ap-serif min-w-0 text-[25px]"
    : "ap-serif min-w-0 text-[25px] min-[768px]:max-[1100px]:text-[26px] max-[767px]:text-[25px]";
}

/** Section card: CARD padding, h2 header row, and the scroll Reveal (motion.tsx). */
export function SectionCard({
  id,
  title,
  aside = false,
  action,
  className = "",
  children,
}: {
  id?: string;
  title: string;
  aside?: boolean;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Reveal as="section" id={id} className={`${CARD} scroll-mt-[90px] ${className}`} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="mb-3.5 flex items-center justify-between gap-3 max-[640px]:flex-wrap">
        <h2 id={id ? `${id}-h` : undefined} className={sectionTitleClass(aside)}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Reveal>
  );
}

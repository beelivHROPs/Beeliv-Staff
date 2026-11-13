/**
 * Client-only glyphs missing from components/applicant/icons.tsx (and the few
 * Staff additions re-exported for convenience). Same make() style: 24px grid,
 * currentColor, round caps/joins, 1.7 stroke.
 */
import type { IconComponent, IconProps } from "@/components/applicant/icons";

function make(d: string, name: string): IconComponent {
  function Icon({ size = 24, strokeWidth = 1.7, ...rest }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-icon={name} {...rest}>
        <path d={d} />
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const BarChart3 = make("M5 20V11M12 20V4M19 20v-6M3 20h18", "BarChart3");
export const Wallet = make("M4 7.5A1.5 1.5 0 0 1 5.5 6H18v3M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H20V9H5.5A1.5 1.5 0 0 1 4 7.5zM16 14h.01", "Wallet");
export const UserPlus = make("M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20c0-3.3 3.1-6 7-6M18 9v6M15 12h6", "UserPlus");
export const Building = make("M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3", "Building");
export const Activity = make("M3 12h4l2.5-6 4 12 2.5-6H21", "Activity");
export { Store, ClipboardList, CircleCheck, Megaphone, History, Ellipsis, ShieldAlert } from "@/components/staff/icons";

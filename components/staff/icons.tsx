/**
 * Staff-only glyphs missing from components/applicant/icons.tsx. Same make()
 * style: 24px grid, currentColor, round caps/joins, 1.7 stroke. Everything
 * else is imported from the Applicant icon set.
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

export const BookOpen = make("M12 6c-1.6-1.3-3.8-2-7-2v14c3.2 0 5.4.7 7 2 1.6-1.3 3.8-2 7-2V4c-3.2 0-5.4.7-7 2zM12 6v14", "BookOpen");
export const ClipboardList = make("M9 4h6v3H9zM7 5.5H5v15h14v-15h-2M9 12h6M9 16h6", "ClipboardList");
export const LogIn = make("M14 5h5v14h-5M10 8l4 4-4 4M14 12H4", "LogIn");
export const Megaphone = make("M4 10v4h3l7 4V6L7 10zM17.5 9.5a3.5 3.5 0 0 1 0 5", "Megaphone");
export const Store = make("M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6", "Store");
export const Coffee = make("M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2", "Coffee");
export const Globe = make("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 12h17M12 3c2.4 2.5 3.6 5.5 3.6 9S14.400 18.500 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.600 5.500 12 3z", "Globe");
export const Ellipsis = make("M6 12h.01M12 12h.01M18 12h.01", "Ellipsis");
export const CircleCheck = make("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 12.3l2.4 2.4 4.6-4.9", "CircleCheck");
export const ShieldAlert = make("M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM12 8.5V13M12 16v.01", "ShieldAlert");
export const History = make("M4 12a8 8 0 1 0 2.4-5.7M4 4v4.3h4.3M12 8v4.5l3 1.8", "History");

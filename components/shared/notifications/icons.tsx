/**
 * Three glyphs the shared notification set needs that the Applicant icon set lacks. Same style as
 * components/applicant/icons.tsx (24px grid, currentColor, round caps, 1.7 stroke). Kept here so no
 * app imports another app's icon file.
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
export const Megaphone = make("M4 10v4h3l7 4V6L7 10zM17.5 9.5a3.5 3.5 0 0 1 0 5", "Megaphone");

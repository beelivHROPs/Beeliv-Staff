/**
 * Applicant dashboard icons — the same kind of icon source the public site
 * uses (components/public/icons.tsx): an in-repo set of inline SVGs whose
 * path data is copied verbatim from the wireframe, not an icon library.
 *
 * The public site is the reference: wherever it already draws a glyph (Search,
 * Bell, Mail, Phone, MapPin, Clock, Bookmark, Chevrons, Menu, Filters, Home,
 * People, Shield, Refresh, X, ArrowRight...) its exact path data is used here.
 * Remaining paths come from the applicant wireframe's own icon table (`var P` in
 * beeliv-website/applicant/index.html), generated into this file. Exported
 * under the names the dashboard already used, so every screen keeps its
 * icon-per-slot mapping. Consistent brand stroke: 24px grid, currentColor,
 * round caps/joins, 1.7 default weight (public site).
 */
import type { CSSProperties, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string; strokeWidth?: number | string; style?: CSSProperties };
export type IconComponent = (props: IconProps) => React.JSX.Element;
/** Drop-in alias for the former lucide-react type. */
export type LucideIcon = IconComponent;

function make(d: string, name: string, defaultStroke = 1.7): IconComponent {
  function Icon({ size = 24, strokeWidth = defaultStroke, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        data-icon={name}
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ArrowRight = make("M5 12h14M13 6l6 6-6 6", "ArrowRight");
export const ArrowUpLeft = make("M17 17L7 7M7 15V7h8", "ArrowUpLeft");
export const Award = make("M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5", "Award");
/** Stacked layers (Applications quick link). */
export const Pencil = make("M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5zM15 5l4 4", "Pencil");
export const Layers = make("M12 3 3 8l9 5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5", "Layers");
/** Plain exclamation mark (used white on a solid red circle for anything that needs attention). */
export const Exclaim = make("M12 6v8M12 18.5v.01", "Exclaim");
export const Bell = make("M12 3v1.6M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4", "Bell");
export const Bookmark = make("M6 3h12v18l-6-4-6 4z", "Bookmark");
export const Share = make("M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13", "Share");
export const Briefcase = make("M4 8h16v11H4zM9 8V5h6v3M4 13h16", "Briefcase");
export const BriefcaseBusiness = make("M4 8h16v11H4zM9 8V5h6v3M4 13h16", "BriefcaseBusiness");
/** Leave / time off: an open door (Staff nav). */
export const DoorOpen = make("M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56z", "DoorOpen");
export const Calendar = make("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Calendar");
export const CalendarCheck = make("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-3.5", "CalendarCheck");
export const CalendarCheck2 = make("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9.5 15l2 2 3.5-3.5", "CalendarCheck2");
export const Camera = make("M4 8h3.5l2-3h5l2 3H20v11H4zM12 10.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z", "Camera");
export const Check = make("M5 12.5l4.5 4.5L19 7.5", "Check");
export const ChefHat = make("M7 14h10v6H7zM7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 16.5 6.3 4 4 0 1 1 17 14", "ChefHat");
export const ChevronDown = make("M6 9l6 6 6-6", "ChevronDown");
export const ChevronLeft = make("M15 5l-7 7 7 7", "ChevronLeft");
export const ChevronRight = make("M9 5l7 7-7 7", "ChevronRight");
export const CircleAlert = make("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5.5M12 16.5v.01", "CircleAlert");
export const Clock3 = make("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2", "Clock3");
export const CloudUpload = make("M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18zM9.5 13.5l2 2 3.5-3.5", "CloudUpload");
export const ConciergeBell = make("M4 17h16M5 17a7 7 0 0 1 14 0M12 8V6M10 6h4M3 20h18", "ConciergeBell");
export const Download = make("M12 4v11M7 10l5 5 5-5M5 20h14", "Download");
export const ExternalLink = make("M14 4h6v6M20 4l-9 9M18 14v5H5V6h5", "ExternalLink");
export const Eye = make("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "Eye");
export const EyeOff = make("M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1", "EyeOff");
export const FileCheck2 = make("M7 3h7l5 5v13H7zM14 3v5h5M9.5 15l2 2 4-4", "FileCheck2");
export const FilePenLine = make("M4 20h16M6 16l9.5-9.5 3 3L9 19H6z", "FilePenLine");
export const FileText = make("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6", "FileText");
export const Files = make("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6", "Files");
export const FolderOpen = make("M4 7h6l2 2h8v10H4zM4 7V5h6", "FolderOpen");
export const House = make("M3 11l9-7 9 7v9h-6v-6H9v6H3z", "House");
export const IdCard = make("M3 6h18v12H3zM8 10.5a1.5 1.5 0 1 0 0 .01M6 15c.5-1.3 1.3-2 2-2s1.5.7 2 2M13 10h5M13 13h4", "IdCard");
export const Image = make("M4 5h16v14H4zM4 16l4.5-4.5L13 16l2.5-2.5L20 18M15.5 9.5a1 1 0 1 0 0 .01", "Image");
export const LayoutDashboard = make("M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z", "LayoutDashboard");
export const CircleHelp = make("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.6 9.4a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.8.7-.8 1.2v.6M12 16.8v.2", "CircleHelp");
export const LifeBuoy = make("M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1", "LifeBuoy");
export const LockKeyhole = make("M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3", "LockKeyhole");
export const Pause = make("M9 5v14M15 5v14", "Pause");
export const LogOut = make("M10 5H5v14h5M14 8l4 4-4 4M18 12H9", "LogOut");
export const Mail = make("M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM4 7l8 6 8-6", "Mail");
export const MapPin = make("M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z", "MapPin");
export const Menu = make("M3 7h18M3 12h18M3 17h18", "Menu");
export const MessageSquareText = make("M4 5h16v11H9l-5 4z", "MessageSquareText");
export const Moon = make("M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z", "Moon");
export const Paintbrush = make("M19.5 3.5a1.8 1.8 0 0 1 2.5 2.5l-8.5 9-3-3zM10.5 12l3 3M9.5 13c-2.5 0-4 1.6-4 4 0 1.7-1 2.6-2.5 3 3.5 1.2 8.5.3 8.5-4.2z", "Paintbrush");
export const Phone = make("M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2z", "Phone");
export const Plus = make("M12 5v14M5 12h14", "Plus");
export const RefreshCw = make("M20 12a8 8 0 1 1-2.3-5.7M20 4v4.3h-4.3", "RefreshCw");
export const Repeat = make("M4 8h13l-3-3M20 16H7l3 3", "Repeat");
export const RotateCw = make("M20 12a8 8 0 1 1-2.3-5.7M20 4v4.3h-4.3", "RotateCw");
export const ScrollText = make("M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5", "ScrollText");
export const Search = make("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5", "Search");
export const Settings = make("M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "Settings");
export const ShieldCheck = make("M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6zM9 12l2 2 4-4", "ShieldCheck");
/** Filter funnel (project lead 2026-10-18: filter buttons show this icon, not the word "Filters"). */
export const Funnel = make("M3 4.5h18l-7 8.2V19l-4 2v-8.3z", "Funnel");
export const SlidersHorizontal = make("M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4", "SlidersHorizontal");
export const Sparkles = make("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "Sparkles");
export const Sun = make("M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3", "Sun");
export const Trash2 = make("M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13", "Trash2");
export const Upload = make("M12 16V5M7 10l5-5 5 5M5 19h14", "Upload");
export const UserRound = make("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5", "UserRound");
export const Users = make("M9 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM16.5 6.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2zM3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.3c2.6-.3 4.9 1.2 5.5 4.2", "Users");
export const UsersRound = make("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5M16 5.5a3 3 0 0 1 0 5.8M18 14.8c1.7.7 2.8 2.4 3 5.2", "UsersRound");
export const Video = make("M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5", "Video");
export const Wine = make("M4 4h16l-8 9zM12 13v7M8 20h8", "Wine");
export const X = make("M6 6l12 12M18 6L6 18", "X");
export const Leaf = make("M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7", "Leaf");
/** Alias kept for existing imports (`Image as ImageIcon`). */
export const ImageIcon = Image;

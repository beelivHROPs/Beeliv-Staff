/**
 * Icons for the public site. Every glyph below is copied verbatim from the
 * wireframe boards (path data, stroke width, size) - not swapped for a
 * "similar" icon library glyph. Source noted per icon.
 */
type IconProps = { size?: number; strokeWidth?: number; className?: string; stroke?: string };

function Base({
  size,
  strokeWidth,
  stroke = "currentColor",
  className,
  children,
}: IconProps & { size: number; strokeWidth: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Main.dc.html header (20px, 1.8) / Home-Mobile.dc.html header (19px, 1.8). */
export function SearchIcon({ size = 20, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Base>
  );
}

/** Home-Mobile.dc.html hamburger (24px, 1.6). */
export function MenuIcon({ size = 24, strokeWidth = 1.6, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </Base>
  );
}

/** Nav-Mobile.dc.html close (20px, 1.8). */
export function CloseIcon({ size = 20, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}

/** Nav-Mobile.dc.html link arrow (20px, 1.8, gold). */
export function ArrowRightIcon({ size = 20, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Base>
  );
}

/** Job-Desktop.dc.html / Job-Mobile.dc.html "Required to apply" checklist (16px, 2.2, purple). */
export function CheckIcon({
  size = 16,
  strokeWidth = 2.2,
  stroke = "var(--beeliv-purple)",
  ...p
}: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} stroke={stroke} {...p}>
      <path d="m5 12 5 5 9-10" />
    </Base>
  );
}

/**
 * Talent-card glyph. Drawn in Home-Mobile.dc.html (16px, 1.8, purple). The
 * desktop wireframe shows only an empty 44px circle for the same card - the
 * same glyph is reused there (flagged in the handoff report).
 */
export function PeopleIcon({ size = 16, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="16.5" cy="9" r="2.6" />
      <path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.3c2.6-.3 4.9 1.2 5.5 4.2" />
    </Base>
  );
}

/** "Hospitality people" badge (30px/1.5 desktop, 20px/1.6 mobile) and the Hotels tile. */
export function HotelIcon({ size = 22, strokeWidth = 1.5, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    </Base>
  );
}

/**
 * Jobs-Desktop.dc.html / Jobs-Filters-Mobile.dc.html filter-option glyphs
 * (20px, 1.7). One switch component, same pattern as WhoWeServeIcon, so
 * FiltersPanel doesn't need a dozen near-duplicate exported functions.
 */
export function JobFilterIcon({
  name,
  size = 20,
  strokeWidth = 1.7,
  ...p
}: IconProps & {
  name:
    | "front-of-house"
    | "kitchen"
    | "bar"
    | "management"
    | "admin-operations"
    | "support"
    | "full-time"
    | "part-time"
    | "contract"
    | "casual"
    | "day"
    | "evening"
    | "night"
    | "rotating"
    | "accommodation"
    | "transport"
    | "meals"
    | "flexible";
}) {
  switch (name) {
    case "front-of-house":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 17h16M5 17a7 7 0 0 1 14 0M12 8V6M10 6h4M3 20h18" />
        </Base>
      );
    case "kitchen":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M7 14h10v6H7zM7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 16.5 6.3 4 4 0 1 1 17 14" />
        </Base>
      );
    case "bar":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 4h16l-8 9zM12 13v7M8 20h8" />
        </Base>
      );
    case "management":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5M16 5.5a3 3 0 0 1 0 5.8M18 14.8c1.7.7 2.8 2.4 3 5.2" />
        </Base>
      );
    case "admin-operations":
    case "full-time":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" />
        </Base>
      );
    case "support":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
        </Base>
      );
    case "part-time":
    case "evening":
    case "flexible":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />
        </Base>
      );
    case "contract":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
        </Base>
      );
    case "casual":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </Base>
      );
    case "day":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3" />
        </Base>
      );
    case "night":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
        </Base>
      );
    case "rotating":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.3h-4.3" />
        </Base>
      );
    case "accommodation":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 11l8-7 8 7v9H4zM10 20v-6h4v6" />
        </Base>
      );
    case "transport":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 16v3M17 16v3" />
        </Base>
      );
    case "meals":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1-3 3-3 6v3h3v9" />
        </Base>
      );
  }
}

/** Jobs-Desktop.dc.html hero/sidebar keyword search field (20px, 1.7). */
export function JobsSearchIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5" />
    </Base>
  );
}

/** Jobs-Desktop.dc.html location field / job-card location line (16-20px, 1.7). */
export function LocationPinIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </Base>
  );
}

/**
 * Jobs-Desktop.dc.html job-card "Save" bookmark button (20px, 1.7). The
 * wireframe draws only the outline glyph; the local "saved" toggle (no
 * backend - see JobCard) recolours it via `stroke`/`className`, same as
 * every other icon here, rather than a second filled path.
 */
export function BookmarkIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </Base>
  );
}

/**
 * Home-Desktop-2.dc.html / Home-Mobile-2.dc.html job-card employment-type
 * chip and "Posted X ago" line (13-17px, 1.7). Reused as-is for both -
 * the wireframe draws the identical path for each.
 */
export function ClockIcon({ size = 17, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />
    </Base>
  );
}

/** Home-Desktop-2 / Home-Mobile-2 "Verified businesses" trust icon (20-22px, 1.7). */
export function BuildingIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" />
    </Base>
  );
}

/** Home-Desktop-2 / Home-Mobile-2 "Real opportunities" trust icon (20-22px, 1.7). */
export function ShieldIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
    </Base>
  );
}

/** Home-Desktop-2 / Home-Mobile-2 "Grow your career" trust icon (20-22px, 1.7). */
export function TrendUpIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M5 20V11M11 20V5M17 20v-7M3 20h18" />
    </Base>
  );
}

/** Home-Mobile-2.dc.html jobs-carousel pager, previous (20px, 1.7). */
export function ChevronLeftIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Base>
  );
}

/** Home-Mobile-2.dc.html jobs-carousel pager, next (20px, 1.7). */
export function ChevronRightIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M9 5l7 7-7 7" />
    </Base>
  );
}

/** Jobs-Mobile.dc.html "Filters" trigger button (20px, 1.7). */
export function FiltersIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />
    </Base>
  );
}

/** Jobs-Mobile.dc.html "Most recent" sort trigger (16-18px, 1.7). */
export function SortIcon({ size = 18, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" />
    </Base>
  );
}

/** Jobs-Mobile.dc.html sort menu chevron (16px, 1.7). */
export function ChevronDownIcon({ size = 16, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  );
}

/** Jobs-Empty-Desktop.dc.html "No Search Results" illustration slot (40px, 1.3). */
export function NoResultsIcon({ size = 40, strokeWidth = 1.3, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM12 12 20 7.5M12 12v9M12 12 4 7.5" />
    </Base>
  );
}

/** NotFound-Desktop.dc.html / NotFound-Mobile.dc.html "Go to Homepage" quick-link glyph (22px, 1.7). */
export function HomeIcon({ size = 22, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" />
    </Base>
  );
}

/** NotFound-Desktop.dc.html / NotFound-Mobile.dc.html "Help & Support" quick-link glyph (22px, 1.7). */
export function HelpIcon({ size = 22, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M4 5h16v11H9l-5 4zM12 13v.01M10 8.5a2 2 0 1 1 2.5 2c-.4.2-.5.5-.5 1" />
    </Base>
  );
}

/**
 * NotFound-Desktop.dc.html / NotFound-Mobile.dc.html "For Businesses"
 * quick-link glyph (22px, 1.7). A distinct path from BuildingIcon (which this
 * board reuses as-is for "Browse Vacancies" - identical glyph in the source
 * board) - not a duplicate export of the same shape.
 */
export function OfficeIcon({ size = 22, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M5 21V4h10v17M15 9h4v12M8 8h2M8 12h2M8 16h2M3 21h18" />
    </Base>
  );
}

/** Jobs-Desktop.dc.html "Get job alerts" sidebar card glyph (24px, 1.7). */
export function BellIcon({ size = 24, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
    </Base>
  );
}

/** Home-Mobile.dc.html "Who we serve" strip (22px, 1.5, white). */
export function WhoWeServeIcon({
  name,
  size = 22,
  strokeWidth = 1.5,
  ...p
}: IconProps & {
  name:
    | "restaurant"
    | "hotel"
    | "lounge"
    | "cafe"
    | "events"
    | "catering"
    // Training-Desktop.dc.html / Training-Mobile.dc.html "Who we serve" panel
    // (8 tiles, not Home's 6): "eventCentre" is a distinct glyph from Home's
    // "events" (different rect/path construction in the source board - not a
    // duplicate), "fastFood" and "startup" have no Home equivalent.
    | "eventCentre"
    | "fastFood"
    | "startup";
}) {
  switch (name) {
    case "restaurant":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M6 3v7a2 2 0 0 0 2 2v9M4 3v5M8 3v5M17 3c-2 1-3 3.5-3 6.5V13h3v8" />
        </Base>
      );
    case "hotel":
      return <HotelIcon size={size} strokeWidth={strokeWidth} {...p} />;
    case "lounge":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 4h16l-8 9zM12 13v7M8 20h8" />
        </Base>
      );
    case "cafe":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
        </Base>
      );
    case "events":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M8 3v4M16 3v4" />
        </Base>
      );
    case "eventCentre":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 6h16v14H4zM4 11h16M8 3v4M16 3v4" />
        </Base>
      );
    case "fastFood":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 11a8 6 0 0 1 16 0zM3 14h18M5 17h14v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
        </Base>
      );
    case "startup":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />
        </Base>
      );
    case "catering":
      return (
        <Base size={size} strokeWidth={strokeWidth} {...p}>
          <path d="M4 17h16M5 17a7 7 0 0 1 14 0M12 8V6M10 6h4M3 20h18" />
        </Base>
      );
  }
}

/**
 * Training-Desktop.dc.html / Training-Mobile.dc.html "HOW WE WORK · TRAINING
 * CYCLE" diagram connectors (28px, 1.8, gold). Right-arrow reuses
 * ArrowRightIcon (identical path in that board); down/left/up have no
 * existing equivalent.
 */
export function ArrowDownIcon({ size = 28, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Base>
  );
}

export function ArrowLeftIcon({ size = 28, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Base>
  );
}

export function ArrowUpIcon({ size = 28, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Base>
  );
}

/**
 * Training cycle centre badge (desktop) / closing panel glyph (mobile), 28px
 * 1.8 gold. Same path as the Jobs filter "rotating" glyph, given its own name
 * here since the two uses are unrelated (a filter icon vs. a cycle emblem).
 */
export function RefreshIcon({ size = 28, strokeWidth = 1.8, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.3h-4.3" />
    </Base>
  );
}

/**
 * Contact-Desktop.dc.html / Contact-Mobile.dc.html Email row icon badge
 * (18-20px, 1.7). No mail glyph exists in the locked wireframe boards - added
 * here, matching the same simple-outline/viewBox/stroke-width convention as
 * every icon above, for the reference-screenshot icon badges (not a
 * wireframe-sourced glyph).
 */
export function MailIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </Base>
  );
}

/**
 * Contact-Desktop.dc.html / Contact-Mobile.dc.html Phone row icon badge
 * (18-20px, 1.7). Same status as MailIcon above - added, not wireframe-sourced.
 */
export function PhoneIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2z" />
    </Base>
  );
}

/**
 * ContactForm "Message sent" success badge (24px, 2.4, purple). No paper-plane
 * glyph exists in the locked wireframe boards - added here per project-lead
 * reference image, matching the same simple-outline/viewBox/stroke-width
 * convention as MailIcon/PhoneIcon above (not a wireframe-sourced glyph).
 * Single dart/plane shape with a visible fold line, angled up-right as if
 * just launched - same idea as the familiar Telegram "send" glyph.
 */
export function SendIcon({ size = 20, strokeWidth = 1.7, ...p }: IconProps) {
  return (
    <Base size={size} strokeWidth={strokeWidth} {...p}>
      <path d="M21 3 3 10.6l7.2 2.8L13 21l3.1-5.9L21 3zM10.2 13.4 16.6 7" />
    </Base>
  );
}

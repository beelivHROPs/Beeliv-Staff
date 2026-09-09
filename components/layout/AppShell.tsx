"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Bell, Menu, Search } from "lucide-react";
import type { NavGroup } from "@/lib/nav-config";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Shared authenticated-area shell (header + sidebar + content), per
 * docs/architecture/ui-ux-framework.md §1. One component, role-conditional
 * navigation — not five separate layouts — matching the "single Next.js
 * codebase" principle in docs/architecture/system-architecture.md §1/§3.
 *
 * No real session/auth check happens here (Stage 2 work). This renders the
 * structural shell only; it does not gate access.
 */
// Per-role sidebar/drawer identity — every role except Applicant ("quite
// okay, can be maintained") gets a genuinely dominant, distinguishing nav
// color (a plain bg-card sidebar with only the active item tinted was
// tried and reversed — project-lead: "reverse that"). Ops stays --primary
// purple, HR is a dark gold/purple bronze blend, Staff is --chart-2 (a
// mid-dark purple already in the app's chart palette, related-but-distinct
// from Ops), Client is --foreground (a near-black neutral) — dark, not
// colorful, matching its "oversight, not control" restraint while still
// being visibly its own block instead of Applicant's plain white.
// itemActiveIndicator/itemActiveText split out from itemActive (kept
// unchanged, still used verbatim by the mobile Sheet nav) so the desktop
// nav can animate a single shared layoutId background behind the active
// link — border+bg live on the animated element, font/text stay on the
// Link so the label is never visually affected by the slide.
const NAV_TONE_STYLES = {
  default: {
    container: "bg-sidebar border-sidebar-border",
    groupLabel: "text-muted-foreground",
    itemActive: "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground",
    itemActiveIndicator: "border-sidebar-primary bg-sidebar-accent",
    itemActiveText: "font-medium text-sidebar-accent-foreground",
    itemInactive: "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
    divider: "border-sidebar-border",
    profileName: "text-sidebar-foreground",
    profileRole: "text-muted-foreground",
  },
  purple: {
    container: "bg-primary border-transparent",
    groupLabel: "text-white/55",
    itemActive: "border-white bg-white/15 font-medium text-white",
    itemActiveIndicator: "border-white bg-white/15",
    itemActiveText: "font-medium text-white",
    itemInactive: "border-transparent text-white/75 hover:bg-white/10 hover:text-white",
    divider: "border-white/15",
    profileName: "text-white",
    profileRole: "text-white/60",
  },
  gold: {
    // Same gradient formula/base token as HeroStatCard's tone="gold" —
    // project-lead: nav and hero card should be the exact matching color.
    container:
      "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--tone-gold)_45%,white_55%)_0%,var(--tone-gold)_100%)] border-transparent",
    groupLabel: "text-white/55",
    itemActive: "border-white bg-white/15 font-medium text-white",
    itemActiveIndicator: "border-white bg-white/15",
    itemActiveText: "font-medium text-white",
    itemInactive: "border-transparent text-white/75 hover:bg-white/10 hover:text-white",
    divider: "border-white/15",
    profileName: "text-white",
    profileRole: "text-white/60",
  },
  lavender: {
    container: "bg-[color:var(--chart-2)] border-transparent",
    groupLabel: "text-white/55",
    itemActive: "border-white bg-white/15 font-medium text-white",
    itemActiveIndicator: "border-white bg-white/15",
    itemActiveText: "font-medium text-white",
    itemInactive: "border-transparent text-white/75 hover:bg-white/10 hover:text-white",
    divider: "border-white/15",
    profileName: "text-white",
    profileRole: "text-white/60",
  },
  slate: {
    // The sidebar itself now uses --tone-client (the logo hand's exact
    // sampled color) instead of plain --foreground — the earlier version
    // only added small accents on top of an unchanged near-black
    // background, which is why it still read as "close to black".
    container: "bg-[color:var(--tone-client)] border-transparent",
    groupLabel: "text-white/55",
    itemActive: "border-[color:var(--chart-1)] bg-white/15 font-medium text-white",
    // Soft inset glow on the active-item indicator — Client-only for now
    // (project-lead: try the sidebar active-item polish idea from the
    // pasted reference CSS, scoped to this one dashboard rather than all
    // five). Uses --chart-1 (the same token already driving this tone's
    // active-item border) via color-mix instead of a hardcoded rgba.
    itemActiveIndicator:
      "border-[color:var(--chart-1)] bg-white/15 shadow-[inset_0_0_18px_color-mix(in_srgb,var(--chart-1)_40%,transparent)]",
    itemActiveText: "font-medium text-white",
    itemInactive: "border-transparent text-white/75 hover:bg-white/10 hover:text-white",
    divider: "border-white/15",
    profileName: "text-white",
    profileRole: "text-white/60",
  },
} as const;

export function AppShell({
  roleLabel,
  scopeLabel,
  navItems,
  userName,
  showSearch = false,
  notifications = [],
  navTone = "default",
  children,
}: {
  roleLabel: string;
  scopeLabel?: string;
  navItems: NavGroup[];
  /** When provided, renders the user identity slot (header avatar + sidebar
   *  identity card). Omitted roles just don't show one yet. */
  userName?: string;
  /** Structural placeholder only — no search backend exists yet. */
  showSearch?: boolean;
  /** Sidebar/mobile-drawer identity — see NAV_TONE_STYLES. */
  navTone?: "default" | "purple" | "gold" | "lavender" | "slate";
  /** Bell badge count is this array's length, not a separately-passed
   *  number — a role with no real notification data model yet (no backing
   *  list) shows no badge instead of an arbitrary/unfounded count. */
  notifications?: { id: string; title: string; date: string }[];
  children: React.ReactNode;
}) {
  const notificationCount = notifications.length;
  const pathname = usePathname();
  const tone = NAV_TONE_STYLES[navTone];
  const prefersReducedMotion = useReducedMotion();
  const navIndicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 480, damping: 38, mass: 0.9 };

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  const flatItems = navItems.flatMap((group) => group.items);
  // Derived, not hardcoded — only the applicant nav has a "Profile" entry so
  // far (other roles aren't redesigned yet, per nav-config.ts); the avatar
  // only becomes a link once that role actually has somewhere to send it.
  const profileHref = flatItems.find((item) => item.label === "Profile")?.href;
  // Same derivation for Notifications — only Staff/Applicant have a real
  // route (lib/nav-config.ts); HR/Ops/Client have no notifications page or
  // data model, so their bell stays a Popover preview instead of a dead
  // link. Project-lead: "I want them to be clickable so they take us to
  // the notification page when clicked."
  const notificationsHref = flatItems.find((item) => item.label === "Notifications")?.href;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* Mobile nav trigger — now the same Sheet drawer primitive as
              PublicHeader's mobile nav (components/shared/PublicHeader.tsx),
              swapped in this session for consistency with that established
              pattern instead of the old inline below-header dropdown. Opens
              from the left, matching this button's own position (unlike
              PublicHeader, which moved its trigger to the right and opens
              from the right — here the bell/role/avatar cluster on the
              right needs to stay visible on every breakpoint, so the
              trigger has nowhere to move to). */}
          <Sheet>
            <SheetTrigger
              aria-label="Open navigation menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent sm:hidden"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              overlayClassName="bg-black/50 backdrop-blur-sm"
              className={`w-72 gap-0 p-0 ${tone.container}`}
            >
              <SheetHeader className={`border-b bg-white ${tone.divider}`}>
                <SheetTitle className="sr-only">{roleLabel} navigation</SheetTitle>
                <Image
                  src="/beeliv-logo-mark-hd.png"
                  alt="Beeliv Hospitality"
                  width={314}
                  height={342}
                  className="h-10 w-auto object-contain"
                />
              </SheetHeader>
              <nav aria-label={`${roleLabel} navigation`} className="flex flex-col gap-4 overflow-y-auto p-3">
                {navItems.map((group, groupIndex) => (
                  <div key={group.label ?? groupIndex}>
                    {group.label ? (
                      <p className={`mb-1 px-3 text-[11px] font-semibold tracking-wide uppercase ${tone.groupLabel}`}>
                        {group.label}
                      </p>
                    ) : null}
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <SheetClose
                            nativeButton={false}
                            render={
                              <Link
                                href={item.href}
                                className={`block rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors ${
                                  isActive(item.href) ? tone.itemActive : tone.itemInactive
                                }`}
                              />
                            }
                          >
                            {item.label}
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Image
            src="/beeliv-logo-mark-hd.png"
            alt="Beeliv Hospitality"
            width={314}
            height={342}
            priority
            className="h-16 w-auto object-contain sm:h-20"
          />
          {scopeLabel ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              · {scopeLabel}
            </span>
          ) : null}
        </div>

        {showSearch ? (
          <div className="hidden max-w-xs flex-1 px-6 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search…"
                disabled
                title="Search isn't available yet"
                className="rounded-full bg-muted pl-9"
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {notificationsHref ? (
            // Direct link, not a Popover preview — this role has a real
            // notifications page, so clicking the bell takes you straight
            // there instead of opening a dropdown first.
            <Link
              href={notificationsHref}
              aria-label={
                notificationCount > 0
                  ? `Notifications (${notificationCount} unread)`
                  : "Notifications"
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            >
              <Bell className="size-4.5" strokeWidth={2.25} />
              {notificationCount > 0 ? (
                <Badge
                  variant="default"
                  className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center rounded-full bg-gold px-1 text-[10px] text-gold-foreground"
                >
                  {notificationCount}
                </Badge>
              ) : null}
            </Link>
          ) : (
            <Popover>
              <PopoverTrigger
                aria-label={
                  notificationCount > 0
                    ? `Notifications (${notificationCount} unread)`
                    : "Notifications"
                }
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/15"
              >
                <Bell className="size-4.5" strokeWidth={2.25} />
                {notificationCount > 0 ? (
                  <Badge
                    variant="default"
                    className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center rounded-full bg-gold px-1 text-[10px] text-gold-foreground"
                  >
                    {notificationCount}
                  </Badge>
                ) : null}
              </PopoverTrigger>
              <PopoverContent align="end">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                </div>
                {notifications.length > 0 ? (
                  <ul className="m-0 max-h-80 list-none divide-y divide-border overflow-y-auto p-0">
                    {notifications.map((item) => (
                      <li key={item.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.date}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </p>
                )}
              </PopoverContent>
            </Popover>
          )}
          {/* Purple-branded role pill with a thin gold ring — project-lead
              direction ("make purple the primary color here, with a touch
              of gold"), replacing the plain neutral bg-secondary pill. */}
          <span className="rounded-full border border-[color:var(--gold)]/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {roleLabel}
          </span>
          {userName ? (
            profileHref ? (
              <Link
                href={profileHref}
                aria-label={`${userName} — view profile`}
                title="View profile"
                className="rounded-full transition-opacity hover:opacity-80"
              >
                <Avatar name={userName} size="sm" ring />
              </Link>
            ) : (
              <Avatar name={userName} size="sm" ring />
            )
          ) : null}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar navigation */}
        <nav
          aria-label={`${roleLabel} navigation`}
          className={`hidden w-56 shrink-0 border-r p-4 sm:block ${tone.container}`}
        >
          <div className="space-y-5">
            {navItems.map((group, groupIndex) => (
              <div key={group.label ?? groupIndex}>
                {group.label ? (
                  <p className={`mb-1.5 px-3 text-[11px] font-semibold tracking-wide uppercase ${tone.groupLabel}`}>
                    {group.label}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href} className="relative">
                        {active ? (
                          <motion.div
                            layoutId="desktop-nav-active-indicator"
                            transition={navIndicatorTransition}
                            className={`absolute inset-0 rounded-md border-l-2 ${tone.itemActiveIndicator}`}
                          />
                        ) : null}
                        <Link
                          href={item.href}
                          className={`relative block rounded-md border-l-2 border-transparent px-3 py-2 text-sm transition-colors ${
                            active ? tone.itemActiveText : tone.itemInactive
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {userName ? (
            profileHref ? (
              <Link
                href={profileHref}
                className={`mt-6 flex items-center gap-2.5 border-t pt-4 transition-opacity hover:opacity-80 ${tone.divider}`}
              >
                <Avatar name={userName} size="md" ring />
                <div className="min-w-0">
                  <div className={`truncate text-sm font-semibold ${tone.profileName}`}>
                    {userName}
                  </div>
                  <div className={`text-xs ${tone.profileRole}`}>{roleLabel}</div>
                </div>
              </Link>
            ) : (
              <div className={`mt-6 flex items-center gap-2.5 border-t pt-4 ${tone.divider}`}>
                <Avatar name={userName} size="md" ring />
                <div className="min-w-0">
                  <div className={`truncate text-sm font-semibold ${tone.profileName}`}>
                    {userName}
                  </div>
                  <div className={`text-xs ${tone.profileRole}`}>{roleLabel}</div>
                </div>
              </div>
            )
          ) : null}
        </nav>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

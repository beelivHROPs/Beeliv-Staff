"use client";

/**
 * Admin shell (HR identity first). Mirrors components/client/ClientShell.tsx:
 * same breakpoints, sidebar + sliding nav pill, top bars, bottom nav + swipeable
 * More sheet, confirm host. Differences: the HR navigation (Master Spec 13.4,
 * grouped), a collapsible desktop sidebar, no outlet switcher (HR scope is a
 * set of assigned clients / outlets, not a switcher in this slice) and the
 * phone top bar NAMES THE PAGE (page titles are hidden on phones).
 * Colours come from the `.admin-theme` + role tokens (app/admin/admin.css).
 *
 * This shell is presentation only. Real protection is server-side (Admin auth
 * -> role -> client / outlet scope -> RLS) and arrives with the backend.
 */
import { isAppAuthPath } from "@/lib/auth/portals";
import { usePortalSignOut } from "@/lib/ui/use-portal-sign-out";
import { useAuthLive } from "@/lib/ui/auth-live";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { setAdminDark, useAdminDark } from "@/lib/admin/theme";
import { Bell, CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, LogOut, Menu, Moon, Plus, Settings, Sun, UserRound, X } from "@/components/applicant/icons";
import { applyDisplaySettings } from "@/lib/applicant/settings";
import { ConfirmHost } from "@/components/applicant/ConfirmDialog";
import { newsreader } from "@/components/applicant/fonts";
import { MotionRoot, SPRING, SwipeSheet, useIsClient } from "@/components/applicant/motion";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { BottomNavBar, BottomNavButton, BottomNavLink } from "@/components/applicant/BottomNav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROTOTYPE_MODES, setPrototypeMode, usePrototypeMode } from "@/lib/admin/dev-controls";
import { useAdminSession, useNavCounts, useNotifications } from "@/lib/admin/hooks";
import { ADMIN_NOTIFICATIONS_HREF } from "@/lib/admin/links";
import { setSidebarCollapsed, useSidebarCollapsed } from "@/lib/admin/sidebar";
import type { AdminNotification, AdminSession, NavCounts } from "@/lib/admin/types";
import { AdminAvatar } from "./AdminAvatar";
import { AdminThemeFlag } from "./AdminThemeFlag";
import { playAdminSound, stopRingtone, useRinging } from "@/lib/admin/sound";
import { adminKindOf, fromAdmin } from "@/lib/notifications/adapters";
import { NotificationPopoverBody } from "@/components/shared/notifications/NotificationRow";
import { soundForKinds } from "@/lib/notifications/catalog";
import { InviteSheet } from "@/components/admin/team-access/InviteSheets";
import type { InvitationKind } from "@/lib/admin/team-access/types";
import { HOME_RECIPES, homeRoleFor } from "./overview/home-recipes";
import { ADMIN_ROLE_CLASS, administrationItemsFor, HR_NAV_ITEMS, OPS_NAV_ITEMS, isNavActive, MOBILE_PRIMARY_HREFS, navGroupsFor, activeNavItem, isOpsInHrWorkspace, OPS_IN_HR_NAV, type AdminNavGroup, type AdminNavItem } from "./nav";
import { canOpenRoute, isRestrictedRoute, useAccessRole } from "@/lib/admin/role-access";
import { Can } from "./Can";
import { PilotNotice } from "@/components/shared/PilotNotice";
import { usePilotMenu } from "@/lib/pilot/context";
import { pilotFilter, pilotFilterGroups } from "@/lib/pilot/menu";
import { Restricted } from "./ops/parts";
import { IDENTITY_OPTIONS, hasLiveAdminIdentity, opsSessionFrom, setAdminIdentity, useAdminIdentity, useAdminRole, type AdminIdentityId } from "@/lib/admin/ops/identity";
import "./ops/ops-identity.css";
import { InterviewSoonSound } from "./InterviewSoonSound";
import { ApprovalWaitingSound } from "./ops/ApprovalWaitingSound";
import { ReacceptGate } from "@/components/shared/agreements/ReacceptGate";
import { topbarCircle, TopbarLink } from "@/components/shared/mobile/TopbarButton";
import { TopbarAvatarLink, TopbarFrame, TopbarGreeting, TopbarSpacer } from "@/components/shared/mobile/TopbarFrame";
import { GlobalSearch, GlobalSearchButton } from "@/components/shared/search/GlobalSearch";
import { useAdminSearchProvider } from "./search/adminSearchProvider";

export const ADMIN_THEME = `applicant-shell admin-theme ${ADMIN_ROLE_CLASS} ${newsreader.variable}`;
const THEME = ADMIN_THEME;

const PILL_ROW = "flex h-10.5 items-center gap-2.5 rounded-[9px] px-2.5 text-sm font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)";

const PRIMARY_ITEMS = MOBILE_PRIMARY_HREFS.map((href) => HR_NAV_ITEMS.find((i) => i.href === href)).filter((i): i is AdminNavItem => !!i);

/** Phone "Administration" menu: items grouped by their nav `section` (a missing section continues the previous one). */
function moreGroups(items: AdminNavItem[]): { heading: string; items: AdminNavItem[] }[] {
  const groups: { heading: string; items: AdminNavItem[] }[] = [];
  for (const item of items) {
    if (item.section || !groups.length) groups.push({ heading: item.section ?? "More", items: [] });
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}

/** One row inside a grouped container: 48px tall, hairline between rows. */
const GROUP_ROW = "flex min-h-12 w-full items-center gap-3 border-t border-(--ap-line-2) px-3.5 text-[15px] font-semibold text-(--ap-ink-2) first:border-t-0 hover:bg-(--ap-line-2)";

/** Muted small heading + ONE rounded container holding the group's rows. */
function SheetGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-1.5 px-1.5 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{heading}</h3>
      <div className="overflow-hidden rounded-2xl border border-(--ap-line-2) bg-(--ap-tint-soft)">{children}</div>
    </section>
  );
}

const CLIENT_REQUESTS_HREF = "/admin/clients/requests";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: hrSession } = useAdminSession();
  // PROTOTYPE identity switch (HR / Operations); see lib/admin/ops/identity.ts.
  const role = useAdminRole() ?? "hr";
  const protoSession = role === "ops" ? opsSessionFrom(hrSession) : hrSession;
  // Live: the signed-in person's real role is known (seeded from the server session) but the sample session's
  // fictional name must never show. Use the role label until the real name is wired in.
  const identityNow = useAdminIdentity();
  const liveId = hasLiveAdminIdentity() ? identityNow : null;
  const session = liveId && protoSession
    ? { ...protoSession, user: { firstName: liveId === "ops" ? "Operations" : liveId === "hr-manager" ? "HR Manager" : "HR", lastName: "", avatarUrl: null } }
    : protoSession;
  // Role-specific menu and route guard (prototype of the server rules, lib/admin/role-access.ts).
  const access = useAccessRole();
  const navRole = access ?? "hr_officer";
  // Pilot menu (server-decided, lib/pilot/menu.ts): later-stage screens are left out of the menus, never deleted.
  const pilot = usePilotMenu();
  // Phone More sheet: role-allowed items, minus what this role's Home recipe hides; Operations also gets its own screens.
  const homeRecipe = HOME_RECIPES[homeRoleFor(useAdminIdentity(), hrSession?.hrLevel)];
  const adminItems = pilotFilter(administrationItemsFor(navRole), pilot).filter((i) => !homeRecipe.moreHide.some((p) => i.href === p || i.href.startsWith(`${p}/`)));
  const opsItems = navRole === "operations" ? pilotFilter(OPS_NAV_ITEMS.filter((i) => i.href !== "/admin"), pilot) : [];
  // Notifications and menu badges still come from sample data: blank on a live deployment (no fake counts or chimes).
  const sampleNotes = useNotifications().data;
  const sampleCounts = useNavCounts().data;
  const notes = useMemo(() => (liveId ? [] : sampleNotes), [liveId, sampleNotes]);
  const navCounts = liveId ? undefined : sampleCounts;
  const collapsed = useSidebarCollapsed();
  const unread = (notes ?? []).filter((n) => !n.read).length;
  // Soft chimes when something new arrives (never on first load).
  const prevUnread = useRef<number | null>(null);
  const prevInbox = useRef<number | null>(null);
  // A NEW unread client-request notification rings the service bell (up to 3 times) instead of the glass clink.
  const seenIds = useRef<Set<string> | null>(null);
  // One "message" sound at most per moment: a new Inbox item raises both a bell item and the Inbox badge.
  const lastMessageAt = useRef(0);
  const playMessage = () => {
    if (Date.now() - lastMessageAt.current < 2500) return;
    lastMessageAt.current = Date.now();
    playAdminSound("message");
  };
  useEffect(() => {
    if (!notes) return;
    const fresh = notes.filter((n) => !n.read && seenIds.current && !seenIds.current.has(n.id));
    seenIds.current = new Set(notes.map((n) => n.id));
    // The sound belongs to the event (lib/notifications/catalog.ts), not to the screen that happens to be open.
    const sound = soundForKinds(fresh.map(adminKindOf));
    if (sound === "ringtone") {
      // Already looking at Client requests = already acknowledged: a soft clink is enough.
      playAdminSound(window.location.pathname.startsWith(CLIENT_REQUESTS_HREF) ? "notify" : "ringtone");
    } else if (sound === "message") playMessage();
    else if (prevUnread.current !== null && unread > prevUnread.current) playAdminSound(sound ?? "notify");
    prevUnread.current = unread;
  }, [notes, unread]);
  // Acknowledge: opening Client requests silences the ringtone (Escape also does, see lib/admin/sound.ts).
  useEffect(() => {
    if (pathname.startsWith(CLIENT_REQUESTS_HREF)) stopRingtone();
  }, [pathname]);
  const inboxCount = navCounts?.inbox ?? 0;
  useEffect(() => {
    if (prevInbox.current !== null && inboxCount > prevInbox.current) playMessage();
    prevInbox.current = inboxCount;
  }, [inboxCount]);
  const counts: NavCounts = navCounts ?? { inbox: 0, documentation: 0 };
  // An open Inbox conversation is a full-screen chat on phones: no top bar, no bottom nav, no page scroll.
  const chat = /^\/admin\/inbox\/[^/]+\/?$/.test(pathname);

  useEffect(() => applyDisplaySettings(), []);

  // A phone sheet is tied to the page it was opened on: any navigation closes it.
  const [sheet, setSheet] = useState<{ at: string; kind: "admin" | "add" } | null>(null);
  const openSheet = (kind: "admin" | "add") => setSheet({ at: pathname, kind });

  return (
    <MotionRoot>
      <AdminThemeFlag roleClass={role === "ops" ? "admin-role-ops" : ADMIN_ROLE_CLASS} />
      <InterviewSoonSound />
      {role === "ops" ? <ApprovalWaitingSound /> : null}
      <div
        className={`mx-auto grid min-h-[calc(100vh/var(--ps-zoom,1))] w-full grid-cols-1 min-[768px]:grid-cols-[84px_minmax(0,1fr)] ${
          collapsed ? "" : "min-[1101px]:grid-cols-[248px_minmax(0,1fr)] min-[1361px]:grid-cols-[264px_minmax(0,1fr)]"
        }`}
      >
        <Sidebar pathname={pathname} counts={counts} collapsed={collapsed} session={session} role={role} groups={pilotFilterGroups(isOpsInHrWorkspace(navRole, pathname) ? OPS_IN_HR_NAV : navGroupsFor(navRole), pilot)} />

        <div className="relative min-w-0">
          <DesktopTopbar unread={unread} notes={notes ?? []} session={session} />
          <div className={chat ? "contents max-[719px]:hidden" : "contents"}>
            <MobileTopbar unread={unread} pathname={pathname} session={session} />
          </div>

          <main id="applicant-view" tabIndex={-1} className={`${chat ? "max-[719px]:h-[calc(100dvh/var(--ps-zoom,1))] max-[719px]:overflow-hidden max-[719px]:p-0! max-[719px]:[&>div]:h-full " : ""}relative mx-auto max-w-[1560px] px-[18px] pt-3 pb-[116px] max-[380px]:px-3.5 min-[641px]:px-7 min-[768px]:pt-5 min-[768px]:pb-[72px] min-[1361px]:px-10 min-[1361px]:pb-20`}>
            <PilotNotice />
            <RouteGuard pathname={pathname} role={access}>
              {children}
            </RouteGuard>
          </main>
        </div>

        {/* DEV-ONLY prototype state, hidden on phones (there it lives in the More sheet). */}
        {SHOW_PROTOTYPE_CONTROLS && (
          <div className="fixed right-4 bottom-4 z-[80] hidden items-center rounded-xl bg-(--ap-ink) py-[5px] pr-[5px] pl-3 shadow-[0_10px_30px_rgba(15,11,24,.25)] min-[768px]:flex">
            <ModeSwitcher />
          </div>
        )}

        {chat ? null : <MobileBottomNav pathname={pathname} counts={counts} onAdd={() => openSheet("add")} onMore={() => openSheet("admin")} moreActive={pathname.startsWith("/admin/people") || adminItems.some((i) => isNavActive(pathname, i.href))} />}
        <MobileSheets sheet={sheet === null || sheet.at !== pathname ? null : sheet.kind} onClose={() => setSheet(null)} counts={counts} session={session} adminItems={adminItems} opsItems={opsItems} />
        <ConfirmHost />
      </div>
    </MotionRoot>
  );
}

/**
 * Role guard (prototype of the server rules, lib/admin/role-access.ts): a route the
 * current identity may not open shows the "not available to your account" panel instead
 * of the page, with no record details. Also shows it for ?state=restricted (dev preview).
 * Until the identity is known, a restricted route renders nothing (no flash of the page).
 */
const subscribeLocation = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};
function RouteGuard({ pathname, role, children }: { pathname: string; role: ReturnType<typeof useAccessRole>; children: React.ReactNode }) {
  const search = useSyncExternalStore(subscribeLocation, () => window.location.search, () => "");
  const live = useAuthLive();
  // ?state=restricted is a preview switch: ignored when the real auth backend is live or in production.
  const forced = !live && SHOW_PROTOTYPE_CONTROLS && new URLSearchParams(search).get("state") === "restricted";
  if (role === null) return isRestrictedRoute(pathname) ? null : <>{children}</>;
  if (forced || !canOpenRoute(role, pathname)) {
    const what = activeNavItem(pathname)?.label ?? "This page";
    return (
      <>
        {/* Marker read by the :has rule in app/applicant/applicant-buttons.css: no phone navigation on this panel. */}
        <span data-admin-nonav="" hidden />
        <Restricted what={what} />
        <p className="mt-3 text-[13px] text-(--ap-muted)">
          <Link href={role === "operations" ? "/admin/ops" : "/admin"} className="font-bold text-(--ap-violet)">Back to Home</Link>
        </p>
      </>
    );
  }
  return <>{children}</>;
}

/** DEV ONLY: which fixture scenario to preview. Not a product setting. */
function ModeSwitcher({ compact }: { compact?: boolean }) {
  const mode = usePrototypeMode();
  const identity = useAdminIdentity() ?? "hr-officer";
  const router = useRouter();
  return (
    <div className={`flex items-center gap-2 text-[13px] font-semibold ${compact ? "text-(--ap-ink-2)" : "text-white/70"}`}>
      {/* PROTOTYPE identity switch: HR officer (scoped), HR Manager (all clients) or Operations (own nav and palette). */}
      <SelectMenu
        label="Prototype identity"
        value={identity}
        onChange={(v) => {
          const next = v as AdminIdentityId;
          setAdminIdentity(next);
          // HR identities share the HR pages, so stay on this page to see the scope change; only crossing to / from Operations changes pages.
          if (next === "ops") router.push("/admin/ops");
          else if (identity === "ops") router.push("/admin");
        }}
        options={IDENTITY_OPTIONS}
        variant={compact ? "compact" : "dark"}
        className={compact ? "h-9! text-[13px]!" : ""}
        placement="top"
        align={compact ? "left" : "right"}
      />
      {!compact && <span className="text-[12px] font-bold tracking-[0.12em] uppercase opacity-70">Prototype state</span>}
      <SelectMenu
        label="Prototype state"
        value={mode}
        onChange={(v) => setPrototypeMode(v as typeof mode)}
        options={PROTOTYPE_MODES}
        variant={compact ? "compact" : "dark"}
        className={compact ? "h-9! text-[13px]!" : ""}
        placement="top"
        align={compact ? "left" : "right"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const NAV_ITEM = "ad-item ap-navitem relative flex min-h-[42px] items-center gap-3 rounded-xl border border-transparent px-3 py-1.5 [@media(max-height:760px)_and_(min-width:1101px)]:min-h-[38px]";

const NAV_OPEN_KEY = "bv-admin-nav-open";

/** Group heading that opens/closes its items (dropdown). The group holding the current page is always open; the rail (icon-only) always lists every item. */
const NAV_EMPTY: Record<string, boolean> = {};
let navOpen: Record<string, boolean> = NAV_EMPTY;
let navLoaded = false;
const navSubs = new Set<() => void>();

function loadNavOpen() {
  if (navLoaded || typeof window === "undefined") return;
  navLoaded = true;
  try {
    const raw = window.localStorage.getItem(NAV_OPEN_KEY);
    if (raw) navOpen = JSON.parse(raw) as Record<string, boolean>;
  } catch {
    // Storage unavailable: groups simply start closed.
  }
}

function useGroupOpen() {
  const open = useSyncExternalStore(
    (cb) => {
      loadNavOpen();
      navSubs.add(cb);
      return () => {
        navSubs.delete(cb);
      };
    },
    () => {
      loadNavOpen();
      return navOpen;
    },
    () => NAV_EMPTY,
  );
  const toggle = (key: string) => {
    navOpen = { ...navOpen, [key]: !navOpen[key] };
    try {
      window.localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(navOpen));
    } catch {
      // Keep in memory only.
    }
    navSubs.forEach((l) => l());
  };
  return { open, toggle };
}

function Sidebar({ pathname, counts, collapsed, session, role, groups }: { pathname: string; counts: NavCounts; collapsed: boolean; session: AdminSession | null; role: "hr" | "ops"; groups: AdminNavGroup[] }) {
  const fullName = session ? `${session.user.firstName} ${session.user.lastName}` : role === "ops" ? "Operations" : "HR";
  const { open, toggle } = useGroupOpen();
  return (
    <aside
      style={{ viewTransitionName: "ap-sidebar" }}
      data-collapsed={collapsed ? "true" : "false"}
      className="ap-sidebar ad-sidebar sticky top-0 hidden h-[calc(100vh/var(--ps-zoom,1))] flex-col overflow-x-hidden overflow-y-auto [scrollbar-color:rgba(255,255,255,.2)_transparent] [scrollbar-width:thin] *:shrink-0 px-3.5 pt-5 pb-3 text-white min-[768px]:flex"
      aria-label="Admin navigation"
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-4">
        <Link href="/admin" aria-label="Beeliv Admin home" className="flex min-w-0 items-center gap-2.5">
          <Image src="/images/beeliv-logo-white.png" alt="Beeliv Hospitality" width={517} height={540} priority className="h-[46px] w-auto" />
          <span className="ad-rail-hide leading-tight">
            <b className="ap-serif block text-[18px] text-white">{role === "ops" ? "Beeliv Operations" : "Beeliv HR"}</b>
            <span className="text-[12px] text-white/60">Admin</span>
          </span>
        </Link>
        {/* Collapse control: tablets are always a rail, so it is only offered on wide screens. */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="ad-collapse-btn hidden size-8 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white min-[1101px]:inline-flex"
        >
          {collapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="Admin sections">
        {groups.map((group, gi) => {
          const groupOpen = (g: AdminNavGroup) => g.items.some((i) => isNavActive(pathname, i.href)) || !!open[g.label ?? ""];
          const groupCount = (g: AdminNavGroup) => g.items.reduce((n, i) => n + (i.countKey ? counts[i.countKey] : 0), 0);
          return (
          <div key={group.label ?? group.items[0].href} className="flex flex-col gap-0.5">
            {group.label && group.quiet ? (
              <>
                <span className="admin-side-label ad-rail-hide mt-3 mb-1 px-3 py-1 text-[11px] opacity-80">{group.label}</span>
                <hr className="ad-rail-show mx-1 my-2 border-0 border-t border-white/12" />
              </>
            ) : group.label ? (
              <>
                <button
                  type="button"
                  onClick={() => toggle(group.label as string)}
                  aria-expanded={groupOpen(group)}
                  aria-controls={`nav-group-${gi}`}
                  className="admin-side-label ad-rail-hide mt-3 mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1 text-left hover:text-white"
                >
                  <span>{group.label}</span>
                  <span className="flex items-center gap-1.5">
                    {!groupOpen(group) && groupCount(group) > 0 ? <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] font-bold tracking-normal text-(--admin-deep)">{groupCount(group)}</span> : null}
                    <ChevronDown className={`size-3.5 transition-transform ${groupOpen(group) ? "" : "-rotate-90"}`} aria-hidden="true" />
                  </span>
                </button>
                <hr className="ad-rail-show mx-1 my-2 border-0 border-t border-white/12" />
              </>
            ) : gi > 0 ? (
              <hr className="mx-2 my-1.5 border-0 border-t border-white/12" />
            ) : null}
            <div id={`nav-group-${gi}`} className={`flex flex-col gap-0.5 ${group.label && !group.quiet && !groupOpen(group) ? "ad-group-shut" : ""}`}>
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              const count = item.countKey ? counts[item.countKey] : 0;
              const showSection = !!group.label && !!item.section;
              return (
                <Fragment key={item.href}>
                {showSection ? <span className="admin-side-label ad-rail-hide mt-2 px-3 text-[11px] opacity-80">{item.section}</span> : null}
                <Link href={item.href} aria-current={active ? "page" : undefined} className={NAV_ITEM}>
                  {active ? <motion.span layoutId="admin-nav-pill" transition={SPRING} className="ap-nav-pill absolute -inset-px rounded-xl" aria-hidden="true" /> : null}
                  <Icon className="relative size-[20px] shrink-0" aria-hidden="true" />
                  <span className="ad-rail-sr relative flex-1 text-[14px]">{item.label}</span>
                  {count > 0 ? (
                    <span className="ad-badge relative inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[rgba(255,255,255,.9)] px-1.5 text-[13px] font-bold text-(--admin-deep)">
                      <span className="sr-only">{count} waiting: </span>
                      {count}
                    </span>
                  ) : null}
                </Link>
                </Fragment>
              );
            })}
            </div>
          </div>
          );
        })}
        <div className="mt-2 border-t border-white/12 px-0 pt-2">
          <SidebarDarkToggle />
        </div>
      </nav>

      {/* Footer: who is signed in (pinned to the bottom of the sidebar, like the HR reference). */}
      <div className="mt-auto pt-3">
        <Link href="/admin/settings" className="ad-footer flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/8 px-2.5 py-2 text-white hover:bg-white/12">
          <AdminAvatar name={fullName} photoUrl={session?.user.avatarUrl} size={36} className="bg-white/90!" />
          <span className="ad-rail-hide min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[14px]">{fullName}</b>
            <span className="block truncate text-[12px] text-white/65">{session?.hrLevel ?? "HR"}</span>
          </span>
          <ChevronRight className="ad-rail-hide size-4 shrink-0 text-white/60" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

/** Sidebar dark-mode switch (desktop); icon-only on the collapsed rail. */
function SidebarDarkToggle() {
  const dark = useAdminDark();
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={() => setAdminDark(!dark)} className={`${NAV_ITEM} w-full text-left`}>
      {dark ? <Sun className="relative size-[20px] shrink-0" aria-hidden="true" /> : <Moon className="relative size-[20px] shrink-0" aria-hidden="true" />}
      <span className="ad-rail-sr relative flex-1 text-[14px]">Dark mode</span>
      <span aria-hidden="true" data-on={dark ? "" : undefined} className="ap-switch ap-switch-sm ad-rail-sr pointer-events-none" />
    </button>
  );
}

/** Phone "More" sheet row with a switch. */
function DarkModeRow() {
  const dark = useAdminDark();
  return (
    <div className={GROUP_ROW}>
      <Moon className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
      <span className="flex-1">Dark mode</span>
      <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={() => setAdminDark(!dark)} className="ap-switch shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top bars                                                            */
/* ------------------------------------------------------------------ */

/** Top-bar search: opens the global search panel (sections, people, jobs, interviews, clients, documents...). Role-scoped, see components/admin/search. */
function SearchBox() {
  const provider = useAdminSearchProvider(useSignOut());
  return <GlobalSearch provider={provider} />;
}

/** Red count badge on the bell (same as the other apps). `size` lets the phone top bar match the bottom-nav icons. */
function BellDot({ unread, size = "size-[19px]" }: { unread: number; size?: string }) {
  return (
    <>
      <Bell className={`${size} ${unread > 0 ? "ap-ring" : ""}`} aria-hidden="true" />
      {unread > 0 ? (
        <span className="ap-dot-pop absolute top-1.5 right-1 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[11px] leading-none font-bold text-white shadow-[0_0_0_2px_#fff]">
          <span className="sr-only">{unread} unread</span>
          <span aria-hidden="true">{unread}</span>
        </span>
      ) : null}
    </>
  );
}

function NotificationsPopover({ unread, notes }: { unread: number; notes: AdminNotification[] }) {
  const [open, setOpen] = useState(false);
  const items = notes.map(fromAdmin);
  const ringing = useRinging();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative inline-flex size-11 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2)" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
        <BellDot unread={unread} />
      </PopoverTrigger>
      <PopoverContent align="end" className={`${THEME} w-95 bg-white! p-3`}>
        <NotificationPopoverBody
          items={items}
          viewAllHref={ADMIN_NOTIFICATIONS_HREF}
          onNavigate={() => setOpen(false)}
          headerExtra={
            ringing ? (
              <button type="button" onClick={stopRingtone} className="text-[13px] font-bold text-(--ap-violet)">
                Acknowledge
              </button>
            ) : null
          }
        />
      </PopoverContent>
    </Popover>
  );
}

/** Sign out, after confirming. Live auth: ends the real session, then goes to /admin/login. Preview: returns to the public site. */
function useSignOut() {
  return usePortalSignOut("admin", {
    tone: "neutral",
    icon: LogOut,
    title: "Sign out of Beeliv Admin?",
    description: "You'll be signed out on this device. Sign back in any time.",
    confirmLabel: "Sign out",
    cancelLabel: "Stay signed in",
  });
}

function ProfileMenu({ session }: { session: AdminSession | null }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const full = session ? `${session.user.firstName} ${session.user.lastName}` : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-12 items-center gap-2.5 rounded-xl py-0 pr-2.5 pl-1 hover:bg-(--ap-line-2)" aria-label="Account menu">
        <AdminAvatar name={full || "HR"} photoUrl={session?.user.avatarUrl} />
        <span className="hidden flex-col text-left leading-tight min-[1101px]:flex">
          <b className="text-sm">{session?.user.firstName ?? "HR"}</b>
          <span className="max-w-[150px] truncate text-[13px] text-(--ap-muted)">{session?.hrLevel ?? "HR"}</span>
        </span>
        <ChevronDown className="size-4 text-(--ap-muted)" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className={`${THEME} w-64 bg-white! p-2`}>
        <div className="p-2.5 leading-tight">
          <b className="block text-(--ap-ink)">{full}</b>
          <span className="text-[13px] text-(--ap-muted)">{session?.hrLevel}</span>
        </div>
        <hr className="my-1.5 border-(--ap-line-2)" />
        <Link href="/admin/settings" onClick={() => setOpen(false)} className={PILL_ROW}>
          <Settings className="size-4" aria-hidden="true" />
          Account &amp; settings
        </Link>
        <Can cap="invitations.manage">
          <Link href="/admin/team-access" onClick={() => setOpen(false)} className={PILL_ROW}>
            <UserRound className="size-4" aria-hidden="true" />
            Team &amp; Access
          </Link>
        </Can>
        <hr className="my-1.5 border-(--ap-line-2)" />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            void signOut();
          }}
          className={`${PILL_ROW} w-full text-left`}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}

function DesktopTopbar({ unread, notes, session }: { unread: number; notes: AdminNotification[]; session: AdminSession | null }) {
  return (
    <header style={{ viewTransitionName: "ap-topbar" }} className="sticky top-0 z-20 hidden h-[72px] items-center gap-4 border-b border-(--ap-line) bg-white/92 px-7 backdrop-blur-md min-[768px]:flex min-[1361px]:px-10">
      <SearchBox />
      <div className="ml-auto flex items-center gap-2">
        <NotificationsPopover unread={unread} notes={notes} />
        <ProfileMenu session={session} />
      </div>
    </header>
  );
}

/** Phone top-bar titles for pages deeper than a nav item (longest prefix wins); anything else uses its nav label. */
const PAGE_TITLES: [string, string][] = [
  ["/admin/recruitment/interviews", "Interviews"],
  ["/admin/recruitment/applicants", "Applicants"],
  ["/admin/recruitment/shortlisting", "Shortlisting"],
  ["/admin/recruitment/vacancies", "Vacancies"],
  ["/admin/recruitment/offers", "Offers"],
  ["/admin/recruitment/documentation", "Documents"],
  ["/admin/recruitment/assessments", "Assessments"],
  ["/admin/recruitment/talent-pool", "Talent pool"],
  ["/admin/recruitment/tests", "Tests"],
  ["/admin/recruitment/client-review", "Client review"],
  ["/admin/clients/requests", "Client requests"],
  ["/admin/clients", "Clients"],
  ["/admin/ops/approvals", "Approvals"],
  ["/admin/ops/staff", "Staff"],
  ["/admin/ops/assignments", "Assignments"],
  ["/admin/ops/clients", "Clients"],
  ["/admin/ops/reports", "Reports"],
  ["/admin/ops/activity", "Activity"],
  ["/admin/ops/setup", "Setup"],
  ["/admin/calendar", "Calendar"],
  ["/admin/announcements", "Announcements"],
  ["/admin/people", "People"],
  ["/admin/notifications", "Notifications"],
  ["/admin/settings", "Settings"],
  ["/admin/search", "Search"],
];
function pageTitle(pathname: string) {
  const hit = PAGE_TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit?.[1] ?? activeNavItem(pathname)?.label ?? "Admin";
}

/** Phone top bar: logo + the page's name (the page's own title is hidden on phones) + Admin menu + bell. */
function MobileTopbar({ unread, pathname, session }: { unread: number; pathname: string; session: AdminSession | null }) {
  const router = useRouter();
  const provider = useAdminSearchProvider(useSignOut());
  const tab = (MOBILE_PRIMARY_HREFS as readonly string[]).includes(pathname);
  const home = pathname === "/admin";
  const full = session ? `${session.user.firstName} ${session.user.lastName}` : "Admin";
  const bell = (
    <TopbarLink href={ADMIN_NOTIFICATIONS_HREF} label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread}>
      <Bell className={`size-[22px] ${unread > 0 ? "ap-ring" : ""}`} aria-hidden="true" />
    </TopbarLink>
  );
  const avatar = (
    <TopbarAvatarLink href="/admin/settings" label={`Your account, ${full}`}>
      <AdminAvatar name={full} photoUrl={session?.user.avatarUrl} size={38} />
    </TopbarAvatarLink>
  );
  return (
    <TopbarFrame home={home} title={home ? undefined : pageTitle(pathname)} style={{ viewTransitionName: "ap-mtopbar" }}>
        {home ? (
          <>
            {avatar}
            <TopbarGreeting name={session?.user.firstName ?? ""} />
          </>
        ) : (
          <>
            {tab ? (
              avatar
            ) : (
              <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin"))} aria-label="Back" className={topbarCircle}>
                <ChevronLeft className="size-[22px]" strokeWidth={2} aria-hidden="true" />
              </button>
            )}
            <TopbarSpacer />
          </>
        )}
        <GlobalSearchButton provider={provider} themeClass={THEME} className={topbarCircle} />
        {bell}
    </TopbarFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Phone bottom nav + More sheet                                       */
/* ------------------------------------------------------------------ */

const QUICK_ROW = "flex h-13 w-full items-center gap-3 rounded-[9px] px-2 text-left text-[16px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)";

/** Bottom bar: Home, Inbox, [Quick add], Jobs, More. People and the Administration menu live in the More sheet. */
function MobileBottomNav({ pathname, counts, onAdd, onMore, moreActive }: { pathname: string; counts: NavCounts; onAdd: () => void; onMore: () => void; moreActive: boolean }) {
  const [home, inbox, jobs] = PRIMARY_ITEMS;
  const link = (item: AdminNavItem) => (
    <BottomNavLink key={item.href} href={item.href} icon={item.icon} label={item.short ?? item.label} active={isNavActive(pathname, item.href)} count={item.countKey ? counts[item.countKey] : 0} pillId="admin-bnav-pill" />
  );
  return (
    <BottomNavBar label="Admin navigation">
      {link(home)}
      {link(inbox)}
      <button type="button" onClick={onAdd} aria-haspopup="dialog" className="ap-bnav-item static flex min-w-0 flex-col items-center justify-end gap-[2px] text-[clamp(9.5px,3vw,11px)] leading-none font-medium text-(--bnav-fg)">
        <span className="ap-bnav-center absolute top-0 left-1/2 flex size-[48px] -translate-x-1/2 items-center justify-center rounded-full text-(--bnav-center-fg)">
          <Plus className="size-[22px]" aria-hidden="true" />
        </span>
        <span className="relative max-w-full truncate px-px">Add</span>
        <span className="h-[2px] w-4" aria-hidden="true" />
      </button>
      {link(jobs)}
      <BottomNavButton onClick={onMore} icon={Menu} label="More" active={moreActive} pillId="admin-bnav-pill" />
    </BottomNavBar>
  );
}

/** Phone sheets: Administration menu and Quick add. */
function MobileSheets({ sheet, onClose, counts, session, adminItems, opsItems }: { sheet: "admin" | "add" | null; onClose: () => void; counts: NavCounts; session: AdminSession | null; adminItems: AdminNavItem[]; opsItems: AdminNavItem[] }) {
  const signOut = useSignOut();
  const [invite, setInvite] = useState<InvitationKind | null>(null);
  return (
    <>
      <MoreSheet open={sheet === "admin"} onClose={onClose} title="More">
        <div className="flex flex-col">
          {session ? (
            <div className="flex items-center gap-3 px-1 pb-1 leading-tight">
              <AdminAvatar name={`${session.user.firstName} ${session.user.lastName}`} photoUrl={session.user.avatarUrl} />
              <span className="min-w-0">
                <b className="block truncate">{`${session.user.firstName} ${session.user.lastName}`}</b>
                <span className="text-[13px] text-(--ap-muted)">{session.hrLevel}</span>
              </span>
            </div>
          ) : null}
          <SheetGroup heading="Schedule">
            <Link href="/admin/calendar" onClick={onClose} className={GROUP_ROW}>
              <CalendarCheck className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Calendar</span>
              <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
            </Link>
          </SheetGroup>
          <SheetGroup heading="People">
            <Link href="/admin/people" onClick={onClose} className={GROUP_ROW}>
              <UserRound className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">People</span>
              <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
            </Link>
          </SheetGroup>
          {opsItems.length > 0 ? (
            <SheetGroup heading="Operations">
              {opsItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={GROUP_ROW}>
                  <item.icon className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              ))}
            </SheetGroup>
          ) : null}
          {moreGroups(adminItems).map((g) => (
            <SheetGroup key={g.heading} heading={g.heading}>
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={GROUP_ROW}>
                  <item.icon className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.countKey && counts[item.countKey] > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--ap-tint) px-1.5 text-[13px] font-bold text-(--ap-violet)">{counts[item.countKey]}</span> : null}
                  <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                </Link>
              ))}
            </SheetGroup>
          ))}
          <SheetGroup heading="Account">
            <Link href="/admin/settings" onClick={onClose} className={GROUP_ROW}>
              <Settings className="size-[19px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0 flex-1">Account &amp; settings</span>
              <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
            </Link>
            <DarkModeRow />
          </SheetGroup>
          <div className="mt-5 overflow-hidden rounded-2xl border border-(--ap-line-2)">
            <button type="button" onClick={() => { onClose(); void signOut(); }} className="flex min-h-12 w-full items-center gap-3 px-3.5 text-left text-[15px] font-semibold text-(--ap-muted) hover:bg-(--ap-line-2)">
              <LogOut className="size-[19px] shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </div>
          {SHOW_PROTOTYPE_CONTROLS && (
            <div className="mt-1 border-t border-(--ap-line-2) pt-3">
              <ModeSwitcher compact />
            </div>
          )}
        </div>
      </MoreSheet>

      <MoreSheet open={sheet === "add"} onClose={onClose} title="Add">
        <div className="flex flex-col">
          <Can cap="invitations.manage">
            <button type="button" className={QUICK_ROW} onClick={() => { onClose(); setInvite("client"); }}>
              <Plus className="size-[19px]" aria-hidden="true" /> Invite client
            </button>
            <button type="button" className={QUICK_ROW} onClick={() => { onClose(); setInvite("staff"); }}>
              <Plus className="size-[19px]" aria-hidden="true" /> Invite staff
            </button>
          </Can>
          <Can cap="vacancy.create">
            <Link href="/admin/recruitment/vacancies/new" onClick={onClose} className={QUICK_ROW}>
              <Plus className="size-[19px]" aria-hidden="true" /> New vacancy
            </Link>
          </Can>
          <Link href="/admin/recruitment/interviews" onClick={onClose} className={QUICK_ROW}>
            <CalendarCheck className="size-[19px]" aria-hidden="true" /> Schedule interview
          </Link>
        </div>
      </MoreSheet>
      {invite ? <InviteSheet kind={invite} onClose={() => setInvite(null)} /> : null}
    </>
  );
}

/** Phone "More" menu as a swipe-to-close bottom sheet (same behaviour as the Applicant / Staff / Client shells). */
function MoreSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const isClient = useIsClient();
  const titleId = useId();
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const r = requestAnimationFrame(() => body.current?.querySelector<HTMLElement>("a,button")?.focus());
    return () => {
      cancelAnimationFrame(r);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key={`sheet-${title}`}
          className={`${THEME} fixed inset-0 z-[110] flex items-end min-[768px]:hidden`}
          style={{ background: "rgba(25,12,20,.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <SwipeSheet
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClose={onClose}
            className="max-h-[92dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
            header={
              <div className="mt-2.5 mb-3 flex items-center justify-between gap-3">
                <b id={titleId} className="ap-serif text-[22px]">
                  {title}
                </b>
                <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-ink-2)">
                  <X className="size-[18px]" aria-hidden="true" />
                </button>
              </div>
            }
          >
            <div ref={body}>{children}</div>
          </SwipeSheet>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * The app shell, except on this app's own sign-in / invitation / reset pages
 * (/admin/login, /admin/invite/..., etc.), which render bare: no sidebar, top
 * bar, bell, bottom bar or prototype controls. All hooks live in the inner
 * component, so nothing here is conditional.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAppAuthPath(pathname, "admin")) return <>{children}</>;
  return <AdminReaccept><AdminShellInner>{children}</AdminShellInner></AdminReaccept>;
}

/** Re-acceptance gate: replaces the whole shell (no business hooks run) while a required agreement is pending. */
function AdminReaccept({ children }: { children: React.ReactNode }) {
  const role = useAdminRole();
  return (
    <ReacceptGate app="admin" isOps={role === "ops"} themeClass={ADMIN_THEME}>
      {children}
    </ReacceptGate>
  );
}

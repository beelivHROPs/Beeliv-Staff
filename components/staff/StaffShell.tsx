"use client";

/**
 * Staff shell. Mirrors components/applicant/AppShell.tsx (same breakpoints,
 * sidebar + sliding nav pill, top bars, bottom nav + swipeable More sheet,
 * confirm + preloader hosts) with the Staff navigation, promo and data
 * boundary (lib/staff/hooks). Colours come from the `.staff-theme` tokens.
 *
 * Entitlements: /staff shows a friendly "not on your account yet" state when
 * the staff entitlement is false. That is a UI convenience only - real
 * protection is server-side (RLS / route guards) and arrives with the backend.
 */
import { isAppAuthPath } from "@/lib/auth/portals";
import { usePortalSignOut } from "@/lib/ui/use-portal-sign-out";
import { ReacceptGate } from "@/components/shared/agreements/ReacceptGate";
import { getDemo } from "@/lib/dev-demo";
import { StaffSetupOnly } from "./StaffSetupOnly";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Bell, ChevronLeft, Moon, Sun, BriefcaseBusiness, ChevronDown, LogOut, MapPin, Menu, Settings, UserRound, X } from "@/components/applicant/icons";
import { applyDisplaySettings } from "@/lib/applicant/settings";
import { ConfirmHost } from "@/components/applicant/ConfirmDialog";
import { StaffConfirmHost, confirmAction } from "./kit";
import { newsreader } from "@/components/applicant/fonts";
import { MotionRoot, SPRING, SwipeSheet, useIsClient } from "@/components/applicant/motion";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PROTOTYPE_MODES, setPrototypeMode, usePrototypeMode } from "@/lib/staff/dev-controls";
import { STAFF_ART } from "@/lib/staff/assets";
import { setStaffDark, useStaffDark } from "@/lib/staff/theme";
import { displayName } from "@/lib/staff/format";
import { fromStaff } from "@/lib/notifications/adapters";
import { NotificationPopoverBody } from "@/components/shared/notifications/NotificationRow";
import { markNotificationRead } from "@/lib/staff/service";
import { useTodayAttendance, useCurrentAssignment, useEntitlements, useNavCounts, useNotifications, useStaffProfile } from "@/lib/staff/hooks";
import type { AccountStatus, Notification, StaffProfile } from "@/lib/staff/types";
import { HomeGate } from "./home/HomeStates";
import { BottomNavBar, BottomNavButton, BottomNavLink } from "@/components/applicant/BottomNav";
import { GlobalSearch, GlobalSearchButton } from "@/components/shared/search/GlobalSearch";
import { useStaffSearchProvider } from "./search/staffSearchProvider";
import { StaffAvatar } from "./StaffAvatar";
import { TopbarLink, topbarCircle } from "@/components/shared/mobile/TopbarButton";
import { TopbarAvatarLink, TopbarFrame, TopbarGreeting, TopbarSpacer } from "@/components/shared/mobile/TopbarFrame";
import { StatusGate } from "./StatusGate";
import { StaffPreloaderHost } from "./StaffPreloader";
import { StaffThemeFlag } from "./StaffThemeFlag";
import { History } from "./icons";
import { isNavActive, MORE_ROUTES, STAFF_NAV, STAFF_NOTIFICATIONS_HREF, STAFF_SETTINGS } from "./nav";
import { PilotNotice } from "@/components/shared/PilotNotice";
import { usePilotMenu } from "@/lib/pilot/context";
import { PILOT_MOBILE_PRIMARY, pilotFilter } from "@/lib/pilot/menu";


const THEME = `applicant-shell staff-theme ${newsreader.variable}`;

const PILL_ROW = "flex h-10.5 items-center gap-2.5 rounded-[9px] px-2.5 text-sm font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)";

function StaffShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: profile } = useStaffProfile();
  const { data: notes } = useNotifications();
  const { data: counts } = useNavCounts();
  const { data: ent } = useEntitlements();
  const unread = (notes ?? []).filter((n) => !n.read).length;
  const moreActive = MORE_ROUTES.some((href) => isNavActive(pathname, href));
  const title = STAFF_NAV.find((i) => i.href !== "/staff" && isNavActive(pathname, i.href))?.label ?? "";
  const noStaff = ent !== null && !ent.staff;
  useEffect(() => applyDisplaySettings(), []);
  // Gate states (suspended, invitation needed/expired, inactive, no staff access): no navigation at all.
  const status = profile?.accountStatus;
  const gated = noStaff || (!!status && status !== "active" && status !== "onboarding");
  if (gated) return <GateShell pathname={pathname} status={noStaff ? null : (status ?? null)}>{children}</GateShell>;

  return (
    <MotionRoot>
      <StaffThemeFlag />
      <div className="mx-auto grid min-h-[calc(100vh/var(--ps-zoom,1))] w-full grid-cols-1 min-[768px]:grid-cols-[84px_minmax(0,1fr)] min-[1101px]:grid-cols-[232px_minmax(0,1fr)] min-[1361px]:grid-cols-[248px_minmax(0,1fr)]">
        <Sidebar pathname={pathname} counts={counts ?? {}} profile={profile} />

        <div className="relative min-w-0">
          <DesktopTopbar unread={unread} notes={notes ?? []} profile={profile} />
          <MobileTopbar unread={unread} title={title} profile={profile} pathname={pathname} />

          <main id="applicant-view" tabIndex={-1} className="relative mx-auto max-w-[1176px] px-[18px] pt-1.5 pb-[116px] max-[380px]:px-3.5 min-[641px]:px-7 min-[768px]:pt-2.5 min-[768px]:pb-[72px] min-[1361px]:pb-20">
            {noStaff ? <NoStaffAccess /> : (<><PilotNotice />{children}</>)}
          </main>
        </div>

        {/* DEV-ONLY prototype state, hidden on phones (there it lives in the More sheet). */}
        {SHOW_PROTOTYPE_CONTROLS && (
<div className="fixed right-4 bottom-4 z-[80] hidden items-center rounded-xl bg-(--ap-ink) py-[5px] pr-[5px] pl-3 shadow-[0_10px_30px_rgba(15,11,24,.25)] min-[768px]:flex">
            <ModeSwitcher />
          </div>
        )}

        {/* Taking a form is a focused flow: its own sticky Previous/Next bar sits at the bottom, so the bottom bar steps aside. */}
        {/^\/staff\/forms\/[^/]+$/.test(pathname) ? null : <MobileBottomNav pathname={pathname} moreActive={moreActive} unread={unread} counts={counts ?? {}} profile={profile} />}
        <ConfirmHost />
        <StaffConfirmHost />
        <StaffPreloaderHost />
      </div>
    </MotionRoot>
  );
}

/**
 * Bare frame for gate states: the logo, a Help link and Log out, and nothing else
 * (no sidebar, bottom bar, search or bell). Help itself stays reachable.
 */
function GateShell({ pathname, status, children }: { pathname: string; status: AccountStatus | null; children: React.ReactNode }) {
  const signOut = useSignOut();
  const onHelp = pathname.startsWith("/staff/help");
  const linkCls = "inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none";
  return (
    <MotionRoot>
      <StaffThemeFlag />
      <div className="min-h-[calc(100vh/var(--ps-zoom,1))]">
        <header className="border-b border-(--ap-line) bg-(--ap-surface,#fff)">
          <div className="mx-auto flex h-16 w-full max-w-[1176px] items-center justify-between gap-3 px-[18px] min-[641px]:px-7">
            <Image src="/images/beeliv-logo-full-colour.png" alt="Beeliv Hospitality" width={197} height={207} priority className="staff-logo-light h-10 w-auto" />
            <Image src="/images/beeliv-logo-white.png" alt="" width={517} height={540} className="staff-logo-dark hidden h-10 w-auto" />
            <nav aria-label="Account" className="flex items-center gap-1">
              {onHelp ? null : (
                <Link href="/staff/help" className={linkCls}>
                  Help
                </Link>
              )}
              <button type="button" onClick={() => void signOut()} className={linkCls}>
                Log out
              </button>
            </nav>
          </div>
        </header>
        <main id="applicant-view" tabIndex={-1} className="mx-auto max-w-[1176px] px-[18px] pt-4 pb-16 min-[641px]:px-7">
          {onHelp ? children : status ? <HomeGate status={status} /> : <NoStaffAccess />}
        </main>
        {SHOW_PROTOTYPE_CONTROLS && (
          <div className="fixed right-4 bottom-4 z-[80] flex items-center rounded-xl bg-(--ap-ink) py-[5px] pr-[5px] pl-3 shadow-[0_10px_30px_rgba(15,11,24,.25)]">
            <ModeSwitcher />
          </div>
        )}
        <ConfirmHost />
        <StaffConfirmHost />
        <StaffPreloaderHost />
      </div>
    </MotionRoot>
  );
}

function NoStaffAccess() {
  return (
    <StatusGate
      tone="neutral"
      image={STAFF_ART.gateNoAccess}
      icon={BriefcaseBusiness}
      chip="Not active yet"
      title="Staff access isn't on your account yet"
      lead="Your applicant account and history are unchanged."
      next="Staff Hub opens once Beeliv confirms your placement. We'll notify you when it's ready."
      primary={{ label: "Go to applicant area", href: "/applicant" }}
      secondary={{ label: "Contact Beeliv", href: "/staff/help" }}
    />
  );
}

/** DEV ONLY: which fixture scenario to preview. Not a product setting. */
function ModeSwitcher({ compact }: { compact?: boolean }) {
  const mode = usePrototypeMode();
  return (
    <div className={`flex items-center gap-2 text-[13px] font-semibold ${compact ? "text-(--ap-ink-2)" : "text-white/70"}`}>
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

function Sidebar({ pathname, counts, profile }: { pathname: string; counts: Record<string, number>; profile: StaffProfile | null }) {
  const pilot = usePilotMenu();
  const main = pilotFilter(STAFF_NAV, pilot).filter((i) => !i.secondary);
  const secondary = pilotFilter(STAFF_NAV, pilot).filter((i) => i.secondary);
  const renderItem = (item: (typeof STAFF_NAV)[number]) => {
    const active = isNavActive(pathname, item.href);
    const Icon = item.icon;
    const count = counts[item.href] ?? 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className="ap-navitem relative flex min-h-[44px] items-center gap-3 rounded-xl border border-transparent px-3 py-2 [@media(max-height:760px)_and_(min-width:1101px)]:min-h-[40px] min-[768px]:max-[1100px]:min-h-[52px] min-[768px]:max-[1100px]:justify-center min-[768px]:max-[1100px]:p-0"
      >
        {active ? <motion.span layoutId="staff-nav-pill" transition={SPRING} className="ap-nav-pill absolute -inset-px rounded-xl" aria-hidden="true" /> : null}
        <Icon className="relative size-[21px] shrink-0" aria-hidden="true" />
        <span className="relative flex-1 min-[768px]:max-[1100px]:sr-only">{item.label}</span>
        {count > 0 ? (
          <span className="bv-badge relative min-[768px]:max-[1100px]:absolute min-[768px]:max-[1100px]:top-1.5 min-[768px]:max-[1100px]:right-2" style={{ ["--bv-badge-ring" as string]: "transparent" }}>
            <span className="sr-only">{count} pending: </span>
            <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      style={{ viewTransitionName: "ap-sidebar" }}
      className="ap-sidebar sticky top-0 hidden h-[calc(100vh/var(--ps-zoom,1))] flex-col overflow-x-hidden overflow-y-auto [scrollbar-color:rgba(255,255,255,.2)_transparent] [scrollbar-width:thin] *:shrink-0 px-3.5 pt-5 pb-3 text-white min-[768px]:flex min-[768px]:max-[1100px]:px-3"
      aria-label="Staff navigation"
    >
      <Link href="/staff" aria-label="Beeliv Staff home" className="flex items-center justify-between gap-2 px-3 pb-4 min-[768px]:max-[1100px]:justify-center min-[768px]:max-[1100px]:px-0">
        <Image src="/images/beeliv-logo-white.png" alt="Beeliv Hospitality" width={517} height={540} priority className="h-[54px] w-auto [@media(max-height:760px)_and_(min-width:1101px)]:h-[46px] min-[768px]:max-[1100px]:h-auto min-[768px]:max-[1100px]:w-[58px]" />
      </Link>

      <nav className="flex flex-col gap-0.5" aria-label="Staff sections">
        {main.map(renderItem)}
        {secondary.map((item) => (
          <Fragment key={item.href}>
            <hr className="mx-2 my-2.5 border-0 border-t border-white/12 min-[768px]:max-[1100px]:mx-1" />
            {renderItem(item)}
          </Fragment>
        ))}
        <SidebarDarkToggle />
      </nav>

      {/* Promo card with an image room (STAFF_ART.promoCutout: concierge bell). */}
      <div className="ap-promo mt-4 min-[768px]:max-[1100px]:hidden">
        <div className="relative z-10 p-4 pb-0">
          <b className="ap-serif block text-[19px] leading-[1.15] text-white">Grow your hospitality career with Beeliv</b>
          <p className="mt-1.5 text-[13px] leading-[1.45] text-white/72 [@media(max-height:900px)_and_(min-width:1101px)]:hidden">Access training, resources and new opportunities across our partner outlets.</p>
        </div>
        <div className="relative h-[124px] [@media(max-height:900px)_and_(min-width:1101px)]:h-[104px]" aria-hidden="true">
          <span className="absolute bottom-[-56px] left-1/2 z-[1] size-[190px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(201,164,92,.5),rgba(201,164,92,.16)_45%,rgba(105,84,200,0)_70%)]" />
          <Image src={STAFF_ART.promoCutout} alt="" width={1100} height={733} sizes="200px" className="ap-rise absolute bottom-2 left-1/2 z-[2] h-auto w-[90%] max-w-none -translate-x-1/2 drop-shadow-[0_14px_16px_rgba(0,0,0,.38)] [@media(max-height:900px)_and_(min-width:1101px)]:w-[80%]" />
        </div>
      </div>

      {/* User block */}
      {profile ? (
        <Link href="/staff/profile" className="mt-3 flex items-center gap-2.5 rounded-xl px-2 py-2 text-white hover:bg-white/7 min-[768px]:max-[1100px]:hidden">
          <StaffAvatar name={`${profile.firstName} ${profile.lastName}`} photoUrl={profile.avatarUrl} size={36} />
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block truncate text-[14px]">{profile.firstName} {profile.lastName}</b>
            <span className="block truncate text-[12px] text-white/62">{profile.roleLabel}</span>
          </span>
          <span className="text-white/62" aria-hidden="true">···</span>
        </Link>
      ) : null}
    </aside>
  );
}

/** "Go to" box: jumps to a Staff section. It searches navigation only - there is no data search yet. */
function SearchBox() {
  const provider = useStaffSearchProvider(useSignOut());
  return <GlobalSearch provider={provider} />;
}

/** `size` lets the phone top bar match the bottom-nav icons (24px). */
function BellDot({ unread, size = "size-[19px]" }: { unread: number; size?: string }) {
  return (
    <>
      <Bell className={`${size} ${unread > 0 ? "ap-ring" : ""}`} aria-hidden="true" />
      {unread > 0 ? (
        <span className="bv-badge ap-dot-pop absolute top-0.5 right-0">
          <span className="sr-only">{unread} unread</span>
          <span aria-hidden="true">{unread > 9 ? "9+" : unread}</span>
        </span>
      ) : null}
    </>
  );
}

function NotificationsPopover({ unread, notes }: { unread: number; notes: Notification[] }) {
  const [open, setOpen] = useState(false);
  const items = notes.map(fromStaff);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative inline-flex size-11 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2)" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
        <BellDot unread={unread} />
      </PopoverTrigger>
      <PopoverContent align="end" className={`${THEME} w-95 bg-white! p-3`}>
        <NotificationPopoverBody
          tiles
          items={items}
          viewAllHref={STAFF_NOTIFICATIONS_HREF}
          onNavigate={() => setOpen(false)}
          onOpen={(n) => {
            if (n.readAt === null) void markNotificationRead(n.id);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function OutletChip() {
  const { data: a } = useCurrentAssignment();
  if (!a) {
    return <span className="hidden h-11 items-center gap-2 rounded-xl border border-dashed border-(--ap-line) px-3 text-sm text-(--ap-muted) min-[1101px]:inline-flex">No assignment</span>;
  }
  return (
    <Popover>
      <PopoverTrigger className="hidden h-11 items-center gap-2 rounded-xl border border-(--ap-line) bg-white px-3 text-sm font-semibold text-(--ap-ink) hover:bg-(--ap-line-2) min-[1101px]:inline-flex" aria-label={`Outlet: ${a.client.name}`}>
        <MapPin className="size-4 text-(--ap-violet)" aria-hidden="true" />
        {a.client.name}
        <ChevronDown className="size-4 text-(--ap-muted)" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className={`${THEME} w-72 bg-white! p-4`}>
        <b className="block">{a.outlet.name}</b>
        <span className="text-[13px] text-(--ap-muted)">{a.outlet.location} - {a.role}</span>
        <Link href="/staff/assignment" className="mt-3 inline-flex text-[13px] font-bold text-(--ap-violet)">
          View assignment
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/** Sign out, after confirming. Live auth: ends the real session, then goes to /staff/login. Preview: returns to the public site. */
function useSignOut() {
  return usePortalSignOut("staff", {
    tone: "neutral",
    icon: LogOut,
    title: "Sign out of Beeliv?",
    description: "You'll be signed out of your Beeliv account on this device. Sign back in any time.",
    confirmLabel: "Sign out",
    cancelLabel: "Stay signed in",
  }, confirmAction);
}

function ProfileMenu({ profile }: { profile: StaffProfile | null }) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const full = profile ? `${profile.firstName} ${profile.lastName}` : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-12 items-center gap-2.5 rounded-xl py-0 pr-2.5 pl-1 hover:bg-(--ap-line-2)" aria-label="Account menu">
        <StaffAvatar name={full || "Staff"} photoUrl={profile?.avatarUrl} />
        <span className="hidden flex-col text-left leading-tight min-[1101px]:flex">
          <b className="text-sm">{profile ? displayName(profile) + " " + profile.lastName : "Staff"}</b>
          <span className="text-[13px] text-(--ap-muted)">Staff</span>
        </span>
        <ChevronDown className="size-4 text-(--ap-muted)" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className={`${THEME} w-64 bg-white! p-2`}>
        <div className="p-2.5 leading-tight">
          <b className="block">{full}</b>
          <span className="text-[13px] text-(--ap-muted)">{profile?.staffId}</span>
        </div>
        <hr className="my-1.5 border-(--ap-line-2)" />
        <Link href="/staff" onClick={() => setOpen(false)} aria-current="page" className="flex h-10.5 items-center gap-2.5 rounded-[9px] bg-(--ap-tint) px-2.5 text-sm font-bold text-(--ap-violet)">
          <BriefcaseBusiness className="size-4" aria-hidden="true" />
          Staff Hub
        </Link>
        <hr className="my-1.5 border-(--ap-line-2)" />
        <Link href="/staff/application-history" onClick={() => setOpen(false)} className={PILL_ROW}>
          <History className="size-4" aria-hidden="true" />
          Application history
        </Link>
        <Link href="/staff/profile" onClick={() => setOpen(false)} className={PILL_ROW}>
          <UserRound className="size-4" aria-hidden="true" />
          Account
        </Link>
        <Link href="/staff/settings" onClick={() => setOpen(false)} className={PILL_ROW}>
          <Settings className="size-4" aria-hidden="true" />
          Settings
        </Link>
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

/** Sidebar dark-mode switch (desktop); icon-only button on the collapsed tablet rail. */
function SidebarDarkToggle() {
  const dark = useStaffDark();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => setStaffDark(!dark)}
      className="ap-navitem relative flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left [@media(max-height:760px)_and_(min-width:1101px)]:min-h-[40px] min-[768px]:max-[1100px]:min-h-[52px] min-[768px]:max-[1100px]:justify-center min-[768px]:max-[1100px]:p-0"
    >
      {dark ? <Sun className="relative size-[21px] shrink-0" aria-hidden="true" /> : <Moon className="relative size-[21px] shrink-0" aria-hidden="true" />}
      <span className="relative flex-1 min-[768px]:max-[1100px]:sr-only">Dark mode</span>
      <span aria-hidden="true" data-on={dark ? "" : undefined} className="ap-switch ap-switch-sm pointer-events-none min-[768px]:max-[1100px]:hidden" />
    </button>
  );
}

/** Phone "More" sheet row with a switch. */
function DarkModeRow() {
  const dark = useStaffDark();
  return (
    <div className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-semibold text-(--ap-ink-2)">
      <Moon className="size-[19px]" aria-hidden="true" />
      <span className="flex-1">Dark mode</span>
      <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={() => setStaffDark(!dark)} className="ap-switch shrink-0" />
    </div>
  );
}

function DesktopTopbar({ unread, notes, profile }: { unread: number; notes: Notification[]; profile: StaffProfile | null }) {
  return (
    <header style={{ viewTransitionName: "ap-topbar" }} className="sticky top-0 z-20 hidden h-[72px] items-center gap-4 border-b border-(--ap-line) bg-white/92 px-7 backdrop-blur-md min-[768px]:flex">
      <div className="mx-auto flex w-full max-w-[1120px] items-center gap-4">
        <SearchBox />
        <div className="ml-auto flex items-center gap-2">
          <NotificationsPopover unread={unread} notes={notes} />
          <OutletChip />
          <ProfileMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}

/**
 * Phone top bar, same pattern as the Applicant app. Home: your avatar on the left (opens your account sheet, where
 * the logo lives), then search and the bell with its unread number. Every other page: back arrow, page title,
 * search, bell. The logo stays on the desktop sidebar, the sign-in pages and the account sheet.
 */
function MobileTopbar({ unread, title, profile, pathname }: { unread: number; title: string; profile: StaffProfile | null; pathname: string }) {
  const provider = useStaffSearchProvider(useSignOut());
  const home = pathname === "/staff";
  const segments = pathname.split("/").filter(Boolean);
  const backHref = segments.length > 2 ? `/${segments.slice(0, -1).join("/")}` : "/staff";
  const full = profile ? `${profile.firstName} ${profile.lastName}` : "Staff";
  const search = <GlobalSearchButton provider={provider} themeClass={THEME} className={topbarCircle} />;
  const bell = (
    <TopbarLink href={STAFF_NOTIFICATIONS_HREF} label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread}>
      <Bell className={`size-[22px] ${unread > 0 ? "ap-ring" : ""}`} aria-hidden="true" />
    </TopbarLink>
  );
  if (home) {
    return (
      <TopbarFrame home style={{ viewTransitionName: "ap-mtopbar" }}>
        <TopbarAvatarLink href="/staff/profile">
          <StaffAvatar name={full} photoUrl={profile?.avatarUrl} size={38} />
        </TopbarAvatarLink>
        <TopbarGreeting name={profile ? displayName(profile) : "Staff"} />
        {search}
        {bell}
      </TopbarFrame>
    );
  }
  return (
    <TopbarFrame title={title} style={{ viewTransitionName: "ap-mtopbar" }}>
      <TopbarLink href={backHref} label="Back">
        <ChevronLeft className="size-[22px]" strokeWidth={2} aria-hidden="true" />
      </TopbarLink>
      <TopbarSpacer />
      {search}
      {bell}
    </TopbarFrame>
  );
}

function MobileBottomNav({ pathname, moreActive, unread, counts, profile }: { pathname: string; moreActive: boolean; unread: number; counts: Record<string, number>; profile: StaffProfile | null }) {
  // Sheet open state is tied to the page it was opened on: any navigation closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = useCallback((v: boolean) => setOpenAt(v ? pathname : null), [pathname]);
  const closeMore = useCallback(() => setOpenAt(null), []);
  const signOut = useSignOut();
  // Pilot menu: the usual bar is Home, Schedule, Attendance, Leave; during the pilot it is Home, My Assignment, Documents (no raised centre).
  const pilot = usePilotMenu();
  const primary = pilot ? PILOT_MOBILE_PRIMARY.staff.map((h) => STAFF_NAV.find((i) => i.href === h)).filter((i): i is (typeof STAFF_NAV)[number] => !!i) : STAFF_NAV.filter((i) => i.mobilePrimary);
  const visible = pilotFilter(STAFF_NAV, pilot);
  const moreItems = [...visible.filter((i) => !primary.includes(i) && !i.secondary), STAFF_SETTINGS, ...visible.filter((i) => i.secondary)];
  const moreCount = moreItems.reduce((n, i) => n + (counts[i.href] ?? 0), 0);
  // Attendance (centre) glows only when there's something to do right now.
  const today = useTodayAttendance().data;
  const attendanceActionable = today?.state === "ready" || today?.state === "checked-in" || today?.state === "attention";

  return (
    <>
      <BottomNavBar label="Staff navigation">
        {primary.map((item, i) => (
          <BottomNavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.short ?? item.label}
            active={isNavActive(pathname, item.href)}
            center={!pilot && i === 2}
            quiet={!pilot && i === 2 && !attendanceActionable}
            pillId="staff-bnav-pill"
          />
        ))}
        <BottomNavButton onClick={() => setOpen(true)} icon={Menu} label="More" active={moreActive} {...{ count: moreCount + unread }} pillId="staff-bnav-pill" />
      </BottomNavBar>

      <MoreSheet open={open} onClose={closeMore}>
        <div className="relative mb-3.5 grid grid-cols-[minmax(0,1fr)_120px] items-end gap-1.5 overflow-hidden rounded-[18px] bg-[image:var(--ap-gradient)] pt-4 pl-4 text-white">
          <div className="pb-4">
            <b className="ap-serif block text-xl leading-tight">Grow your hospitality career with Beeliv</b>
            <p className="mt-1.5 text-[13px] leading-normal text-white/72">Training, resources and new opportunities.</p>
          </div>
          <div className="relative h-[140px]" aria-hidden="true">
            <span className="absolute bottom-[-50px] left-1/2 size-[160px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(201,164,92,.5),rgba(201,164,92,.15)_45%,transparent_70%)]" />
            <Image src={STAFF_ART.promoCutout} alt="" width={1100} height={733} sizes="130px" className="absolute bottom-3 left-1/2 h-auto w-[124px] max-w-none -translate-x-1/2 drop-shadow-[0_12px_14px_rgba(0,0,0,.35)]" />
          </div>
        </div>
        <div className="flex flex-col">
          {profile ? (
            <div className="px-2 pb-2 leading-tight">
              <b className="block">{profile.firstName} {profile.lastName}</b>
              <span className="text-[13px] text-(--ap-muted)">{profile.staffId}</span>
            </div>
          ) : null}
          {/* Dark mode, easy to find on phones (also in Settings > Display). */}
          <DarkModeRow />
          {moreItems.map((item) => {
            const n = counts[item.href] ?? 0;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-semibold text-(--ap-ink-2)">
                <item.icon className="size-[19px]" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {n > 0 ? (
                  <span className="bv-badge" style={{ ["--bv-badge-ring" as string]: "transparent" }}>
                    <span className="sr-only">{n} pending: </span>
                    <span aria-hidden="true">{n > 9 ? "9+" : n}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
          <hr className="my-1.5 border-(--ap-line-2)" />
          <Link href="/staff/application-history" onClick={() => setOpen(false)} className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-semibold text-(--ap-ink-2)">
            <History className="size-[19px]" aria-hidden="true" />
            Application history
          </Link>
          <button type="button" onClick={() => { setOpen(false); void signOut(); }} className="flex h-13 w-full items-center gap-3 rounded-[9px] px-2 text-left text-[16px] font-semibold text-(--ap-ink-2)">
            <LogOut className="size-[19px]" aria-hidden="true" />
            Sign out
          </button>
          {SHOW_PROTOTYPE_CONTROLS && (
<div className="mt-1 border-t border-(--ap-line-2) pt-3">
              <ModeSwitcher compact />
            </div>
          )}
        </div>
      </MoreSheet>
    </>
  );
}

/** Phone "More" menu as a swipe-to-close bottom sheet (same behaviour as the Applicant shell). */
function MoreSheet({ open, onClose, children, title = "More" }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
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
          key="more-sheet"
          className={`${THEME} fixed inset-0 z-[110] flex items-end min-[768px]:hidden`}
          style={{ background: "rgba(15,11,24,.45)" }}
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
                <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-ink-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
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
 * (/staff/login, /staff/invite/..., etc.), which render bare: no sidebar, top
 * bar, bell, bottom bar or prototype controls. All hooks live in the inner
 * component, so nothing here is conditional.
 */
export function StaffShell({ children, setupOnly = false }: { children: React.ReactNode; setupOnly?: boolean }) {
  const pathname = usePathname();
  // Setup-only outer branch (AUTH-014): while the Staff entitlement is pending
  // the Staff area renders no business navigation and calls no Staff business
  // hook (those live in StaffShellInner and the pages). The Applicant area is
  // untouched: it has its own layout and shell. `setupOnly` is meant to come
  // from the SERVER layout once the entitlement read exists; until then the
  // dev-only demo (?demo=pending-approval, server-gated) drives it.
  const demoPending = useStaffPendingDemo();
  if (isAppAuthPath(pathname, "staff")) return <>{children}</>;
  if (setupOnly || demoPending) {
    if (setupOnly && pathname === "/staff/documents") return <main className="mx-auto max-w-[1120px] px-4 py-6"><a href="/staff" className="mb-5 inline-block text-sm underline">Back to account setup</a>{children}</main>;
    return <StaffSetupOnly />;
  }
  return (
    <ReacceptGate app="staff" themeClass="applicant-shell staff-theme">
      <StaffShellInner>{children}</StaffShellInner>
    </ReacceptGate>
  );
}

/** Client-only read of the dev demo; the server snapshot is always false, so hydration is stable. */
function useStaffPendingDemo(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => getDemo() === "pending-approval",
    () => false,
  );
}

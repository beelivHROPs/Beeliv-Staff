"use client";

import { useEffect, useState } from "react";
import { ChevronRight, CircleHelp, Eye, LogOut, Moon, FileText, LockKeyhole, MapPin, Bell, Settings, UserRound, type LucideIcon } from "@/components/applicant/icons";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { scrollToSection } from "@/lib/applicant/settings";
import { useSearchParams } from "next/navigation";
import { useIsPhone } from "@/components/applicant/motion";
import { useClientSession, useOnboarding } from "@/lib/client/hooks";
import { setClientDark, useClientDark } from "@/lib/client/theme";
import { displayName } from "@/lib/client/format";
import { ClientAvatar } from "./ClientAvatar";
import { useSignOut } from "./ClientShell";
import { AccessSection, AppearanceSection, HelpSection, NotificationsSection, PrivacySection, ProfileSection, SecuritySection, WorkspaceSection } from "./settings/sections";

/**
 * Client account settings (project lead, 2026-09-30, locked spec). Same pattern
 * as Applicant / Staff Settings: sticky section nav from 768px, a "Jump to"
 * dropdown on phones, then stacked SectionCards. Settings is reached from the
 * profile menu / phone More sheet, not the main sidebar.
 *
 * Profile and Notifications read/write the SAME onboarding store as
 * /client/setup, so both screens agree. There is no Client sign-in yet, so
 * Security actions are clearly-marked previews (they never fake success).
 */

const SECTIONS: [string, string, LucideIcon][] = [
  ["s-profile", "Account & profile", UserRound],
  ["s-security", "Security", LockKeyhole],
  ["s-notif", "Notifications", Bell],
  ["s-workspace", "Workspace", Settings],
  ["s-appearance", "Appearance", Eye],
  ["s-access", "Access & organisation", MapPin],
  ["s-privacy", "Privacy & agreements", FileText],
  ["s-help", "Help & support", CircleHelp],
];

export function SettingsBody() {
  const ob = useOnboarding();
  const session = useClientSession();
  const signOut = useSignOut();
  const [active, setActive] = useState(SECTIONS[0][0]);
  const ready = Boolean(ob.data && session.data);
  const phone = useIsPhone();
  const dark = useClientDark();
  // Phones show a grouped menu, then ONE section per screen (?section=s-profile). Pushed to history so Back returns to the menu.
  const sp = useSearchParams();
  const rawSection = sp.get("section");
  const phoneSection = SECTIONS.find(([id]) => id === rawSection)?.[0] ?? null;
  const openSection = (id: string) => {
    window.history.pushState(null, "", `/client/settings?section=${id}`);
    window.scrollTo({ top: 0 });
  };

  // Highlight the section currently in view.
  useEffect(() => {
    if (!ready || phone) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-90px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ready, phone]);

  const subtitle = "Manage your account, preferences and Client workspace.";
  if (ob.status === "loading" || session.status === "loading") return <SettingsSkeleton />;
  if (!ob.data || !session.data) {
    return (
      <div>
        <PageHeading title="Settings" subtitle={subtitle} />
        <ErrorPanel
          title="We couldn't load your settings"
          retry={() => {
            ob.retry();
            session.retry();
          }}
        />
      </div>
    );
  }
  const s = session.data;
  const o = ob.data;

  const jump = (id: string) => {
    setActive(id);
    scrollToSection(id);
  };
  const glyph = (Icon: LucideIcon) => <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />;
  const cur = SECTIONS.find(([id]) => id === active) ?? SECTIONS[0];

  const sections: Record<string, React.ReactNode> = {
    "s-profile": <ProfileSection details={o.details} session={s} />,
    "s-security": <SecuritySection onSignOut={() => void signOut()} />,
    "s-notif": <NotificationsSection prefs={o.notifications} />,
    "s-workspace": <WorkspaceSection outlets={s.outlets} sessionDefault={s.defaultScope} />,
    "s-appearance": <AppearanceSection />,
    "s-access": <AccessSection session={s} />,
    "s-privacy": <PrivacySection agreements={o.agreements} />,
    "s-help": <HelpSection team={s.team} />,
  };

  if (phone) {
    if (phoneSection) {
      const label = SECTIONS.find(([id]) => id === phoneSection)?.[1] ?? "Settings";
      return (
        <div>
          <h1 className="mb-3 text-[22px] font-bold text-(--ap-ink)">{label}</h1>
          {sections[phoneSection]}
        </div>
      );
    }
    const GROUPS: { title: string; ids: string[] }[] = [
      { title: "Account", ids: ["s-profile", "s-security", "s-notif"] },
      { title: "Workspace", ids: ["s-workspace", "s-access"] },
      { title: "Help and legal", ids: ["s-privacy", "s-help"] },
    ];
    const rowCls = "flex min-h-14 w-full items-center gap-3 border-t border-(--ap-line-2) px-3.5 text-left text-[15px] font-semibold text-(--ap-ink) first:border-t-0";
    return (
      <div className="flex flex-col gap-5">
        <h1 className="sr-only">Settings</h1>
        <div className="flex items-center gap-3">
          <ClientAvatar name={`${s.user.firstName} ${s.user.lastName}`} photoUrl={s.user.avatarUrl} size={48} />
          <span className="min-w-0 leading-tight">
            <b className="block text-[17px] text-(--ap-ink)">{displayName(s.user)}</b>
            <span className="block text-[13px] text-(--ap-muted)">{s.clientName}</span>
          </span>
        </div>
        {GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h2 className="mb-1.5 px-1 text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">{g.title}</h2>
            <div className="cc-group">
              {g.ids.map((id) => {
                const [, label, Icon] = SECTIONS.find(([x]) => x === id)!;
                return (
                  <button key={id} type="button" onClick={() => openSection(id)} className={rowCls}>
                    <Icon className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <section aria-label="Appearance">
          <h2 className="mb-1.5 px-1 text-[12px] font-bold tracking-[.08em] text-(--ap-muted) uppercase">Appearance</h2>
          <div className="cc-group">
            <div className={rowCls}>
              <Moon className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
              <span className="flex-1">Dark mode</span>
              <button type="button" role="switch" aria-checked={dark} aria-label="Dark mode" onClick={() => setClientDark(!dark)} className="ap-switch shrink-0" />
            </div>
            <button type="button" onClick={() => openSection("s-appearance")} className={rowCls}>
              <Eye className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
              <span className="flex-1">Display settings</span>
              <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
            </button>
          </div>
        </section>
        <div className="cc-group">
          <button type="button" onClick={() => void signOut()} className={`${rowCls} text-(--ap-muted)`}>
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">Sign out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="Settings" subtitle={subtitle} />

      <div className="sticky top-[72px] z-30 mb-4 min-[768px]:hidden">
        <FilterDropdown
          label="Settings sections"
          prefix="Jump to"
          options={SECTIONS.map(([id, label, Icon]) => ({ key: id, label, icon: glyph(Icon) }))}
          current={{ key: cur[0], label: cur[1], icon: glyph(cur[2]) }}
          onChange={jump}
        />
      </div>

      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <nav aria-label="Settings sections" className="ap-card ap-scrollbar-none sticky top-[88px] rounded-[20px] p-2.5 max-[1040px]:static max-[1040px]:flex max-[1040px]:gap-1 max-[1040px]:overflow-x-auto max-[767px]:hidden">
          {SECTIONS.map(([id, label, Icon]) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  jump(id);
                }}
                className={`flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-1 text-sm leading-[1.5] ${on ? "bg-(--ap-tint) font-bold text-(--ap-violet)!" : "font-semibold text-(--ap-ink-2)! hover:bg-(--ap-line-2)"} max-[1040px]:whitespace-nowrap`}
              >
                <Icon className="ap-duo size-5 shrink-0" aria-hidden="true" />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          {SECTIONS.map(([id]) => (
            <div key={id} className="contents">
              {sections[id]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading settings">
      <h1 className="sr-only">Settings</h1>
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <div className="ap-sk-box h-[300px] rounded-[20px] max-[767px]:hidden" />
        <div className="flex flex-col gap-5">
          <div className="ap-sk-box h-[300px] rounded-[20px]" />
          <div className="ap-sk-box h-[260px] rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}

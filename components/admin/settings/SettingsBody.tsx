"use client";

import { usePortalSignOut } from "@/lib/ui/use-portal-sign-out";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, FileText, Image, LockKeyhole, LogOut, MapPin, Bell, Settings, UserRound, type LucideIcon } from "@/components/applicant/icons";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { scrollToSection } from "@/lib/applicant/settings";
import { useAdminAccount } from "@/lib/admin/settings/hooks";
import type { AdminAccountSettings } from "@/lib/admin/settings/types";
import { canSeeSettingsSection, useAccessRole } from "@/lib/admin/role-access";
import { AccessSection, AppearanceSection, BrandingSection, NotificationsSection, PrivacySection, ProfileSection, SecuritySection, WorkspaceSection } from "./sections";

/**
 * Admin account settings: the same page as Client Settings. Sticky section nav
 * from 768px, a "Jump to" dropdown on phones, then stacked SectionCards.
 * Reached from the sidebar footer card / account menu. There is no Admin
 * sign-in yet, so Security actions are clearly-marked previews.
 */

const ALL_SECTIONS: [string, string, LucideIcon][] = [
  ["s-profile", "Account & profile", UserRound],
  ["s-security", "Security", LockKeyhole],
  ["s-notif", "Notifications", Bell],
  ["s-workspace", "Workspace", Settings],
  ["s-appearance", "Appearance", Eye],
  ["s-branding", "Branding", Image],
  ["s-access", "Access & organisation", MapPin],
  ["s-privacy", "Privacy & agreements", FileText],
];

export function SettingsBody() {
  const role = useAccessRole() ?? "hr_officer";
  // The officer sees personal settings only: Branding and Access & organisation are manager / Operations (proposal, needs Beeliv confirmation).
  const SECTIONS = useMemo(() => ALL_SECTIONS.filter(([id]) => canSeeSettingsSection(role, id)), [role]);
  const live = useAdminAccount();
  const signOut = usePortalSignOut("admin", {
    tone: "neutral",
    icon: LogOut,
    title: "Sign out of Beeliv Admin?",
    description: "You'll be signed out on this device. Sign back in any time.",
    confirmLabel: "Sign out",
    cancelLabel: "Stay signed in",
  });
  const [active, setActive] = useState(SECTIONS[0][0]);
  const [openId, setOpenId] = useState<string | null>(null);
  // Local edits layered over the loaded data so saved values stay on screen.
  const [edits, setEdits] = useState<Partial<AdminAccountSettings>>({});
  const ready = Boolean(live.data);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready, SECTIONS]);

  const subtitle = "Manage your account, preferences and Admin workspace.";
  if (live.status === "loading") return <SettingsSkeleton />;
  if (!live.data) {
    return (
      <div>
        <PageHeading title="Settings" subtitle={subtitle} />
        <ErrorPanel title={live.status === "restricted" ? "Settings aren't available for this account" : "We couldn't load your settings"} retry={live.retry} />
      </div>
    );
  }
  const d: AdminAccountSettings = { ...live.data, ...edits };

  const jump = (id: string) => {
    setActive(id);
    scrollToSection(id);
  };
  const glyph = (Icon: LucideIcon) => <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />;
  const cur = SECTIONS.find(([id]) => id === active) ?? SECTIONS[0];

  return (
    <div>
      <PageHeading title="Settings" subtitle={subtitle} />

      <div className="sticky top-[72px] z-30 mb-4 hidden">
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

        <div className="flex min-w-0 flex-col gap-5 max-[767px]:gap-7">
          {/* Phones: grouped rows with chevrons; a tap opens ONE section with a back link. */}
          {openId ? (
            <button type="button" onClick={() => setOpenId(null)} className="-mb-3 inline-flex min-h-11 items-center gap-1 self-start text-[15px] font-semibold text-(--ap-violet) min-[768px]:hidden">
              <ChevronLeft className="size-5" aria-hidden="true" /> Settings
            </button>
          ) : (
            <div className="flex flex-col gap-6 min-[768px]:hidden">
              {PHONE_GROUPS.map(([heading, ids]) => {
                const rows = SECTIONS.filter(([id]) => ids.includes(id));
                return rows.length === 0 ? null : (
                  <section key={heading} aria-label={heading}>
                    <h2 className="mb-2 px-1.5 text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">{heading}</h2>
                    <ul className="m-0 list-none overflow-hidden rounded-[22px] border border-(--ap-line) bg-(--ap-surface) p-0">
                      {rows.map(([id, label, Icon]) => (
                        <li key={id} className="border-t border-(--ap-line-2) first:border-t-0">
                          <button type="button" onClick={() => setOpenId(id)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-(--ap-tint-soft)">
                            <Icon className="size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
                            <span className="min-w-0 flex-1 text-[16px] font-semibold text-(--ap-ink)">{label}</span>
                            <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
          <div className={openId ? "flex min-w-0 flex-col gap-5" : "flex min-w-0 flex-col gap-5 max-[767px]:hidden"}>
          <SettingsGroup heading="Account" openId={openId} ids={PHONE_GROUPS[0][1]}>
            <Only id="s-profile" open={openId}>
              <ProfileSection profile={d.profile} onSaved={(p) => setEdits((e) => ({ ...e, profile: { ...d.profile, ...p } }))} />
            </Only>
            <Only id="s-security" open={openId}>
              <SecuritySection
                sessions={d.sessions}
                onChanged={(ids) => setEdits((e) => ({ ...e, sessions: d.sessions.filter((s) => !ids.includes(s.id)) }))}
                onSignOut={() => void signOut()}
              />
            </Only>
          </SettingsGroup>
          <SettingsGroup heading="Preferences" openId={openId} ids={PHONE_GROUPS[1][1]}>
            <Only id="s-notif" open={openId}>
              <NotificationsSection prefs={d.notifications} onSaved={(n) => setEdits((e) => ({ ...e, notifications: n }))} />
            </Only>
            <Only id="s-workspace" open={openId}>
              <WorkspaceSection profile={d.profile} options={d.options} />
            </Only>
            <Only id="s-appearance" open={openId}>
              <AppearanceSection />
            </Only>
            {canSeeSettingsSection(role, "s-branding") ? (
              <Only id="s-branding" open={openId}>
                <BrandingSection />
              </Only>
            ) : null}
          </SettingsGroup>
          <SettingsGroup heading="Organisation & legal" openId={openId} ids={PHONE_GROUPS[2][1]}>
            {canSeeSettingsSection(role, "s-access") ? (
              <Only id="s-access" open={openId}>
                <AccessSection profile={d.profile} capabilities={d.capabilities} />
              </Only>
            ) : null}
            <Only id="s-privacy" open={openId}>
              <PrivacySection agreements={d.agreements} />
            </Only>
          </SettingsGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop: a plain stack of section cards (the heading is hidden). Phones:
 * a muted heading, then ONE rounded container holding the group's sections,
 * with a hairline between them (each section's own card chrome is removed).
 */
function SettingsGroup({ heading, openId, ids, children }: { heading: string; openId: string | null; ids: string[]; children: ReactNode }) {
  void heading;
  // Phones: a group only shows when its one open section lives in it; no group heading while a section is open (the back link is the heading).
  return (
    <div className={`contents ${openId && !ids.includes(openId) ? "max-[767px]:hidden" : ""}`}>
      <div className="flex flex-col gap-5 max-[767px]:gap-0">{children}</div>
    </div>
  );
}

/** Phones: show only the opened section. Wide screens: always show. */
function Only({ id, open, children }: { id: string; open: string | null; children: ReactNode }) {
  return <div className={open && open !== id ? "contents max-[767px]:hidden" : "contents"}>{children}</div>;
}

const PHONE_GROUPS: [string, string[]][] = [
  ["Account", ["s-profile", "s-security"]],
  ["Preferences", ["s-notif", "s-workspace", "s-appearance", "s-branding"]],
  ["Organisation & legal", ["s-access", "s-privacy"]],
];

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

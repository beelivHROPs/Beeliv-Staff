"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, Download, Eye, LockKeyhole, LogOut, Mail, MessageSquareText, Pause, ShieldCheck, Sparkles, Trash2, UserRound, type LucideIcon } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { personaNames, useAvatarState } from "@/lib/applicant/avatar";
import { AlwaysSent } from "@/components/shared/AlwaysSent";
import { setJobAlert, useJobAlert } from "./jobs/alert-store";
import { scrollToSection, toggleSetting, useApplicantSettings, type SettingKey } from "@/lib/applicant/settings";
import { confirmAction } from "./ConfirmDialog";
import { FilterDropdown } from "./FilterTabs";
import { PageHeading } from "./primitives";
import { SectionCard } from "./SectionCard";

/** Wireframe settingsPage() S[] - id, label, LU glyph. */
const SECTIONS: [string, string, LucideIcon][] = [
  ["s-acct", "Account & security", LockKeyhole],
  ["s-notif", "Notifications", Bell],
  ["s-privacy", "Privacy & consent", ShieldCheck],
  ["s-comms", "Communication", MessageSquareText],
  ["s-access", "Accessibility & display", Eye],
  ["s-manage", "Account management", UserRound],
];

/**
 * Account actions aren't wired to Supabase Auth yet, so these confirm
 * honestly rather than claiming an email was sent or a session ended.
 */
function preview(action: string) {
  toast.add({ title: `${action} isn't connected yet`, description: "This is a preview. No account changes were made." });
}

/** Required messages (lib/notifications/catalog.ts, required: true). Shown as "Always sent", never as a switch. */
const ALWAYS_SENT: [string, string][] = [
  ["Security and sign-in", "Alerts about your account, such as a password change"],
  ["Invitations and account setup", "Links to join or to finish setting up"],
  ["Agreements that need your acceptance", "When a new version needs you to accept it again"],
  ["Document requests", "When Beeliv needs a new or updated document"],
  ["Interviews", "The time, any change or cancellation, and reminders 24 hours and 2 hours before"],
  ["Offers and decisions", "Updates on your applications, offers and results"],
];

export function SettingsBody() {
  const { gender } = useAvatarState();
  const settings = useApplicantSettings();
  const jobAlert = useJobAlert();
  const email = personaNames(gender).email;
  const [active, setActive] = useState(SECTIONS[0][0]);

  // Highlight the section currently in view (wireframe only did this on click).
  useEffect(() => {
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
  }, []);

  const sw = (key: SettingKey, label: string, disabled = false) => (
    <button
      type="button"
      role="switch"
      aria-checked={settings[key]}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        toggleSetting(key);
        toast.add({ title: "Saved" });
      }}
      className="ap-switch shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
    />
  );

  return (
    <div>
      <PageHeading title="Settings" subtitle="Manage your account, privacy and how Beeliv contacts you." />

      {/* Phones: one "Jump to" dropdown instead of a sideways-scrolling strip. */}
      <div className="sticky top-[calc(72px+env(safe-area-inset-top,0px))] z-30 mb-4 min-[768px]:hidden">
        <FilterDropdown
          label="Settings sections"
          prefix="Jump to"
          options={SECTIONS.map(([id, label, Icon]) => ({ key: id, label, icon: <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" /> }))}
          current={(() => {
            const s = SECTIONS.find(([id]) => id === active) ?? SECTIONS[0];
            const Icon = s[2];
            return { key: s[0], label: s[1], icon: <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" /> };
          })()}
          onChange={(id) => {
            setActive(id);
            scrollToSection(id);
          }}
        />
      </div>

      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <nav
          aria-label="Settings sections"
          className="ap-card ap-scrollbar-none sticky top-[88px] rounded-[20px] p-2.5 max-[1040px]:static max-[1040px]:flex max-[1040px]:gap-1 max-[1040px]:overflow-x-auto max-[767px]:hidden"
        >
          {SECTIONS.map(([id, label, Icon]) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={on ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(id);
                  scrollToSection(id);
                }}
                className={`flex min-h-[42px] shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-1 text-sm leading-[1.5] ${
                  on ? "bg-(--ap-tint) font-bold text-(--ap-violet)!" : "font-semibold text-(--ap-ink-2)! hover:bg-(--ap-line-2)"
                } max-[1040px]:whitespace-nowrap`}
              >
                <Icon className="ap-duo size-5 shrink-0" aria-hidden="true" />
                {label}
              </a>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <SectionCard id="s-acct" title="Account & security">
            <Row title="Email" detail={`${email} · verified`}>
              <button type="button" onClick={() => preview("Changing your email")} className="ap-btn ap-btn-o ap-btn-sm">
                Change
              </button>
            </Row>
            <Row title="Password" detail="Last changed 3 months ago">
              <button type="button" onClick={() => preview("Password reset")} className="ap-btn ap-btn-o ap-btn-sm">
                Change
              </button>
            </Row>
            <Row title="Two-step verification" detail="Ask for a code when you sign in on a new device">
              {sw("twofa", "Two-step verification")}
            </Row>
            <Row title="Active sessions" detail="Chrome on Windows · Abuja · this device">
              <button type="button" onClick={async () => {
                  if (
                    await confirmAction({
                      tone: "caution",
                      icon: LogOut,
                      title: "Sign out of other devices?",
                      description: "You'll stay signed in on this device.",
                      points: ["Every other phone, tablet or browser signed in to your account is signed out.", "You'll need your password to sign in on them again."],
                      confirmLabel: "Sign out others",
                    })
                  )
                    preview("Signing out other sessions");
                }} className="ap-hit shrink-0 text-sm font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum) max-[1100px]:min-h-9">
                Sign out others
              </button>
            </Row>
          </SectionCard>

          <SectionCard id="s-notif" title="Notifications">
            <p className="ap-sm mb-1">Beeliv contacts you by email, and in the app. We do not use SMS or WhatsApp.</p>
            <h3 className="ap-label mt-3 mb-0.5 font-bold text-(--ap-muted) uppercase">Always sent</h3>
            {ALWAYS_SENT.map(([title, detail]) => (
              <Row key={title} title={title} detail={detail}>
                <AlwaysSent label={title} />
              </Row>
            ))}
            <p className="ap-sm mt-2">These are needed to use your account or to avoid missing something important, so they can&apos;t be switched off.</p>
            <h3 className="ap-label mt-5 mb-0.5 font-bold text-(--ap-muted) uppercase">Optional</h3>
            <Row title="Job alerts" detail="New roles that match your saved search, by email. Off until you turn it on. You can stop these at any time.">
              <button
                type="button"
                role="switch"
                aria-checked={jobAlert.on}
                aria-label="Job alerts"
                onClick={() => {
                  setJobAlert({ ...jobAlert, on: !jobAlert.on });
                  toast.add({ title: jobAlert.on ? "Job alerts turned off" : "Job alerts turned on", description: jobAlert.on ? undefined : "You can stop these at any time." });
                }}
                className="ap-switch shrink-0"
              />
            </Row>
            <Row title="Beeliv news and events" detail="Training days, job fairs and tips, by email. About twice a month. Off until you turn it on. You can stop these at any time.">
              {sw("marketing", "Beeliv news and events")}
            </Row>
          </SectionCard>

          <SectionCard id="s-privacy" title="Privacy & consent">
            <Row title="Show me in the talent pool" detail="Beeliv can suggest you for roles you haven't applied to">
              {sw("visible", "Show me in the talent pool")}
            </Row>
            <Row title="Share verified documents with employers" detail="Only for roles you apply to">
              {sw("share", "Share verified documents with employers")}
            </Row>
            <Row title="Download your data" detail="A copy of your profile, applications and documents">
              <button type="button" onClick={() => preview("Data export")} className="ap-btn ap-btn-o ap-btn-sm">
                Request
              </button>
            </Row>
          </SectionCard>

          <SectionCard id="s-comms" title="Communication">
            <Row title="Email" detail={`${email}. Beeliv's messages to you come here.`}>
              <span className="ap-sm shrink-0">Email only</span>
            </Row>
          </SectionCard>

          <SectionCard id="s-access" title="Accessibility & display">
            <Row title="Larger text" detail="Increase text size across the dashboard">
              {sw("large", "Larger text")}
            </Row>
            <Row title="Reduce motion" detail="Turn off animations and transitions">
              {sw("motion", "Reduce motion")}
            </Row>
          </SectionCard>

          <SectionCard id="s-manage" title="Account management" className="border-[#FCA5A5]!">
            <Row title="Pause my account" detail="Hide your profile and stop job alerts. Your applications stay open.">
              <button type="button" onClick={async () => {
                  if (
                    await confirmAction({
                      tone: "caution",
                      icon: Pause,
                      title: "Pause your account?",
                      description: "You can unpause at any time from Settings.",
                      points: [
                        "Your profile is hidden.",
                        "Job alerts stop.",
                        "Your applications stay open.",
                      ],
                      confirmLabel: "Pause account",
                    })
                  )
                    preview("Pausing your account");
                }} className="ap-btn ap-btn-o ap-btn-sm">
                Pause
              </button>
            </Row>
            <Row title="Delete account" detail="Permanently removes your profile and documents. Active applications are withdrawn.">
              <button
                type="button"
                onClick={async () => {
                  if (
                    await confirmAction({
                      tone: "danger",
                      title: "Delete your account?",
                      description: "This can't be undone. If you might come back, pause your account instead.",
                      points: [
                        "Your profile, saved jobs and uploaded documents are removed.",
                        "Any active applications are withdrawn.",
                        "Beeliv may keep records of past applications where it's required to.",
                      ],
                      typeToConfirm: "DELETE",
                      confirmLabel: "Delete account",
                      cancelLabel: "Keep my account",
                    })
                  )
                    preview("Account deletion");
                }}
                className="ap-btn ap-btn-sm border-[#FCA5A5] bg-white text-[#DC2626] hover:bg-[#FEE2E2]"
              >
                Delete
              </button>
            </Row>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

const ROW_ICON: Record<string, LucideIcon> = {
  Email: Mail,
  Password: LockKeyhole,
  "Two-step verification": ShieldCheck,
  "Active sessions": Eye,
  "Show me in the talent pool": Sparkles,
  "Share verified documents with employers": ShieldCheck,
  "Download your data": Download,
  "Larger text": Eye,
  "Reduce motion": Sparkles,
  "Pause my account": Pause,
  "Delete account": Trash2,
};

/** Desktop: each row leads with a soft icon disc (phones keep the plain rows). */
function Row({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  const Icon = ROW_ICON[title] ?? Bell;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--ap-line-2) py-3.5 max-[767px]:items-start">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet) min-[768px]:flex" aria-hidden="true">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-[200px] flex-1">
        <b className="block text-base">{title}</b>
        <span className="ap-sm wrap-anywhere">{detail}</span>
      </div>
      {children}
    </div>
  );
}

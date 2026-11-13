"use client";

import { useAuthLive } from "@/lib/ui/auth-live";
import { AccountSecurityActions } from "@/components/shared/AccountSecurityActions";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Check, LockKeyhole, LogOut, Moon, Settings, ShieldCheck, Sun } from "@/components/applicant/icons";
import { Field, FormGrid, INPUT_CLS, Note } from "@/components/applicant/apply/parts";
import { useFlagInvalid } from "@/components/applicant/form-feedback";
import { PhoneInput } from "@/components/applicant/form-fields";
import { SectionCard } from "@/components/applicant/SectionCard";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { AlwaysSent } from "@/components/shared/AlwaysSent";
import { toast } from "@/components/ui/toast";
import { isRequired, type EventCode } from "@/lib/notifications/catalog";
import { toggleSetting, useApplicantSettings } from "@/lib/applicant/settings";
import { DEV_ACTIVE_SESSIONS } from "@/lib/client/dev-sessions";
import { fullDate } from "@/lib/client/format";
import { ALL_SCOPE } from "@/lib/client/outlet";
import { setWorkspacePrefs, useWorkspacePrefs, type DefaultRange } from "@/lib/client/preferences";
import { saveOnboarding } from "@/lib/client/service";
import { setClientThemeMode, useClientThemeMode } from "@/lib/client/theme";
import type { AgreementAck, BeelivTeam, ClientContactDetails, ClientSession, NotificationPrefKey, NotificationPrefs, Outlet } from "@/lib/client/types";
import type { ThemeMode } from "@/lib/shared/theme";
import { SoundSettingsRows } from "@/components/admin/settings/SoundSettings";
import { ClientAvatar } from "../ClientAvatar";
import { AccessSummary, detailsErrors } from "../setup/SetupSteps";

/** Settings sections (project lead, 2026-09-30, locked spec). Each is a SectionCard so the page reads the same as Applicant / Staff Settings. */

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";
const BTN_LINK = `ap-btn ap-btn-s ap-btn-sm ${FOCUS}`;
const SUPPORT = "/client/support";
export const supportHref = (reason: string) => `${SUPPORT}?reason=${encodeURIComponent(reason)}`;

export function Row({ title, detail, children }: { title: string; detail?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-(--ap-line-2) py-3.5 first:border-t-0 max-[767px]:items-start">
      <div className="min-w-0">
        <b className="block text-base">{title}</b>
        {detail ? <span className="ap-sm block wrap-anywhere">{detail}</span> : null}
      </div>
      {children}
    </div>
  );
}

const Managed = ({ text = "Managed by Beeliv" }: { text?: string }) => <span className="ap-label max-w-[45%] shrink-0 text-right font-bold text-(--ap-muted)">{text}</span>;

function Switch({ on, label, onClick, disabled }: { on: boolean; label: string; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick} className={`ap-switch shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`} />;
}

function preview(action: string) {
  toast.add({ title: `${action} is unavailable`, description: "No account changes were made." });
}

/* ------------------------------------------------------------- 1 Profile */

export function ProfileSection({ details, session }: { details: ClientContactDetails; session: ClientSession }) {
  const [draft, setDraft] = useState(details);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const err = tried ? detailsErrors(draft) : {};
  const dirty = draft.fullName !== details.fullName || draft.jobTitle !== details.jobTitle || draft.phone !== details.phone;
  const set = <K extends keyof ClientContactDetails>(k: K, v: ClientContactDetails[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const level = session.accessLevel ?? "Client";
  const line = level.startsWith("Client ") ? `Client • ${level.slice(7)}` : level;

  async function save() {
    // A wrong-but-partly-typed phone number marks itself invalid; flag that too.
    if (Object.values(detailsErrors(draft)).some(Boolean) || ref.current?.querySelector('[aria-invalid="true"]')) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    try {
      await saveOnboarding({ details: { ...details, fullName: draft.fullName.trim(), jobTitle: draft.jobTitle.trim(), phone: draft.phone } });
      toast.add({ title: "Profile saved" });
      setTried(false);
    } catch {
      toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard id="s-profile" title="Account & profile">
      <div className="mb-5 flex items-center gap-3.5">
        <ClientAvatar name={details.fullName || "Client"} photoUrl={session.user.avatarUrl} size={64} />
        <div className="min-w-0 leading-tight">
          <b className="block truncate text-[18px] text-(--ap-ink)">{details.fullName || "Your name"}</b>
          <span className="ap-sm block">{line}</span>
        </div>
      </div>
      <form
        ref={ref}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormGrid>
          <Field label="Full name" htmlFor="set-name" error={err.fullName}>
            <input id="set-name" className={INPUT_CLS} autoComplete="name" value={draft.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={err.fullName ? true : undefined} aria-describedby={err.fullName ? "set-name-err" : undefined} />
          </Field>
          <Field label="Job title" htmlFor="set-title" error={err.jobTitle}>
            <input id="set-title" className={INPUT_CLS} autoComplete="organization-title" placeholder="e.g. General Manager" value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} aria-invalid={err.jobTitle ? true : undefined} aria-describedby={err.jobTitle ? "set-title-err" : undefined} />
          </Field>
          <Field label="Phone number" htmlFor="set-phone" error={err.phone}>
            <PhoneInput quiet id="set-phone" value={draft.phone} onChange={(v) => set("phone", v)} invalid={Boolean(err.phone)} />
          </Field>
          <Field label="Email" htmlFor="set-email" hint="Managed by your Beeliv sign-in.">
            <input id="set-email" className={INPUT_CLS} readOnly value={session.user.email ?? "Not available yet"} />
          </Field>
        </FormGrid>
        <div className="mt-5 flex justify-end max-[640px]:[&>button]:w-full">
          <button type="submit" disabled={busy || !dirty} className={`ap-btn ap-btn-p disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}>
            {busy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
      <div className="mt-3 border-t border-(--ap-line-2)">
        <Row title="Company" detail={session.clientName}>
          <Managed />
        </Row>
        <Row title="Client ID" detail={session.clientId ?? "Not available yet"}>
          <Managed />
        </Row>
        <Row title="Client role" detail={level}>
          <Managed />
        </Row>
        <Row title="Outlet permissions" detail="Set by your Beeliv team. See Access & organisation.">
          <Managed />
        </Row>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------ 2 Security */

export function SecuritySection({ onSignOut }: { onSignOut: () => void }) {
  const liveAuth = useAuthLive();
  if (liveAuth || process.env.NODE_ENV === "production") return <AccountSecurityActions onSignOut={onSignOut} />;
  return (
    <SectionCard id="s-security" title="Security">
      <p className="ap-sm mb-1">Security controls are unavailable here. Your sign-in settings have not changed.</p>
      <Row title="Password" detail="Change the password you use to sign in.">
        <button type="button" onClick={() => preview("Changing your password")} className={`${BTN_LINK} shrink-0`}>
          Change password
        </button>
      </Row>
      <Row title="Two-factor authentication" detail="Not enabled">
        <button type="button" onClick={() => preview("Two-factor setup")} className={`${BTN_LINK} shrink-0`}>
          Set up
        </button>
      </Row>
      <div className="border-t border-(--ap-line-2) py-3.5">
        <div className="flex items-center justify-between gap-3">
          <b className="text-base">Active sessions</b>
          <button type="button" onClick={() => preview("Signing out other sessions")} className={`shrink-0 text-sm font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum) max-[1100px]:min-h-9 ${FOCUS}`}>
            Sign out other sessions
          </button>
        </div>
        <ul className="mt-2.5 flex flex-col gap-2">
          {DEV_ACTIVE_SESSIONS.map((s) => (
            <li key={s.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-(--ap-line-2) px-3.5 py-3">
              <ShieldCheck className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0">
                <b className="block text-[15px] wrap-anywhere">{s.device}</b>
                <span className="ap-sm block">{s.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--ap-line-2) pt-4">
        <p className="ap-sm flex min-w-0 flex-1 items-start gap-2">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Sign out of Beeliv on this device. Your information stays saved.
        </p>
        <button type="button" onClick={onSignOut} className={`ap-btn ap-btn-s max-[640px]:w-full ${FOCUS}`}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------- 3 Notifications */

type PrefRow = { key: NotificationPrefKey; label: string; detail: string; /** Catalogue event: a required one shows "Always sent" instead of a switch. */ event?: EventCode };
const GROUPS: { title: string; rows: PrefRow[] }[] = [
  {
    title: "Recruitment & candidates",
    rows: [
      { key: "candidates", label: "Candidate awaiting my feedback", detail: "When Beeliv sends you candidates to review." },
      { key: "interviews", label: "Interview updates", detail: "When an interview is scheduled, changed or cancelled.", event: "interview.changed" },
      { key: "recruitmentProgress", label: "Recruitment progress", detail: "When a role moves to its next stage." },
    ],
  },
  {
    title: "Workforce",
    rows: [
      { key: "requests", label: "Workforce request updated", detail: "When a staff request you made changes status." },
      { key: "staffAssignments", label: "Staff assignment updates", detail: "When staff are assigned to or leave your outlets." },
      { key: "scheduleChanges", label: "Schedule changes", detail: "When shifts or coverage change." },
    ],
  },
  { title: "Attendance", rows: [{ key: "attendance", label: "Attendance requiring attention", detail: "Late arrivals and absences at your outlets." }] },
  {
    title: "Documents & compliance",
    rows: [
      { key: "compliance", label: "Document requires attention", detail: "Documents that are outstanding." },
      { key: "complianceExpiring", label: "Documents or compliance expiring", detail: "Advance notice before something expires." },
    ],
  },
  { title: "Payroll", rows: [{ key: "payroll", label: "Payroll schedule available", detail: "Upcoming payroll schedule dates." }] },
  { title: "Beeliv", rows: [{ key: "announcements", label: "Service announcements", detail: "News and changes to Beeliv services." }] },
];
const DELIVERY: PrefRow[] = [
  { key: "channelInApp", label: "In-app", detail: "Shown in your Beeliv Client notifications." },
  { key: "channelEmail", label: "Email", detail: "Sent to your sign-in email. Email is Beeliv's only outside channel: no SMS or WhatsApp." },
];

export function NotificationsSection({ prefs }: { prefs: NotificationPrefs }) {
  function set(key: NotificationPrefKey) {
    saveOnboarding({ notifications: { ...prefs, [key]: !prefs[key] } }).then(
      () => toast.add({ title: "Saved" }),
      () => toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" }),
    );
  }
  const rows = (list: PrefRow[]) => list.map((r) => (
    <Row key={r.key} title={r.label} detail={r.detail}>
      {r.event && isRequired(r.event) ? <AlwaysSent label={r.label} /> : <Switch on={prefs[r.key]} label={r.label} onClick={() => set(r.key)} />}
    </Row>
  ));
  return (
    <SectionCard id="s-notif" title="Notifications">
      <p className="ap-sm mb-2">Choose what you hear about. Your account setup choices are included here.</p>
      {GROUPS.map((g) => (
        <div key={g.title} className="mb-3 last:mb-0">
          <h3 className="ap-label mt-3 mb-0.5 font-bold text-(--ap-muted) uppercase">{g.title}</h3>
          {rows(g.rows)}
        </div>
      ))}
      <h3 className="ap-label mt-5 mb-0.5 font-bold text-(--ap-muted) uppercase">Delivery</h3>
      {rows(DELIVERY)}
      <Row title="Security, invitations and agreements" detail="Account security, invitations and setup, and agreements that need your acceptance. These can't be turned off.">
        <AlwaysSent label="Security, invitations and agreements" />
      </Row>
    </SectionCard>
  );
}

/* ------------------------------------------------------------ 4 Workspace */

const RANGE_OPTIONS: { value: DefaultRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export function WorkspaceSection({ outlets, sessionDefault }: { outlets: Outlet[]; sessionDefault: string }) {
  const prefs = useWorkspacePrefs();
  const options = [...(outlets.length > 1 ? [{ value: ALL_SCOPE as string, label: "All outlets" }] : []), ...outlets.map((o) => ({ value: o.id, label: o.name }))];
  const shown = options.some((o) => o.value === prefs.defaultOutlet) ? (prefs.defaultOutlet as string) : options.some((o) => o.value === sessionDefault) ? sessionDefault : (options[0]?.value ?? "");
  return (
    <SectionCard id="s-workspace" title="Workspace">
      <p className="ap-sm mb-3">Saved on this device.</p>
      <FormGrid>
        <Field label="Default outlet" htmlFor="set-outlet" hint="The outlet Beeliv Client opens on when you sign in.">
          <SelectMenu
            id="set-outlet"
            value={shown}
            options={options}
            onChange={(v) => {
              setWorkspacePrefs({ defaultOutlet: v });
              toast.add({ title: "Saved" });
            }}
          />
        </Field>
        <Field label="Default reporting period" htmlFor="set-range" hint="The range Analytics opens with.">
          <SelectMenu
            id="set-range"
            value={prefs.defaultRange}
            options={RANGE_OPTIONS}
            onChange={(v) => {
              setWorkspacePrefs({ defaultRange: v as DefaultRange });
              toast.add({ title: "Saved" });
            }}
          />
        </Field>
      </FormGrid>
    </SectionCard>
  );
}

/* ---------------------------------------------------------- 5 Appearance */

const THEMES: { mode: ThemeMode; label: string; detail: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", detail: "Always light", icon: Sun },
  { mode: "dark", label: "Dark", detail: "Always dark", icon: Moon },
  { mode: "system", label: "System", detail: "Match your device", icon: Settings },
];

export function AppearanceSection() {
  const mode = useClientThemeMode();
  const settings = useApplicantSettings();
  return (
    <SectionCard id="s-appearance" title="Appearance">
      <b className="mb-2.5 block text-base" id="theme-label">
        Theme
      </b>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-2.5 max-[420px]:gap-2">
        {THEMES.map(({ mode: m, label, detail, icon: Icon }) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setClientThemeMode(m)}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border-[1.5px] px-2 py-3.5 text-center transition-colors ${FOCUS} ${on ? "border-(--ap-violet) bg-(--ap-tint) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}
            >
              <Icon className="size-[22px]" aria-hidden="true" />
              <b className="text-[15px]">{label}</b>
              <span className="ap-sm max-[420px]:hidden">{detail}</span>
            </button>
          );
        })}
      </div>
      <p className="ap-sm mt-2.5">Saved on this device. The dark mode switch in the menu is a shortcut to this setting.</p>
      <div className="mt-3">
        <Row title="Reduce motion" detail="Turn off animations and transitions. Saved on this device.">
          <Switch on={settings.motion} label="Reduce motion" onClick={() => toggleSetting("motion")} />
        </Row>
        <SoundSettingsRows />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------- 6 Access & organisation (RO) */

export function AccessSection({ session }: { session: ClientSession }) {
  const primary = session.outlets.find((o) => o.id === session.primaryOutletId);
  return (
    <SectionCard id="s-access" title="Access & organisation">
      <Row title="Company" detail={session.clientName}>
        <Managed />
      </Row>
      <Row title="Client ID" detail={session.clientId ?? "Not available yet"}>
        <Managed />
      </Row>
      <Row title="Access level" detail={session.accessLevel ?? "Client"}>
        <Managed />
      </Row>
      {primary ? (
        <Row title="Primary outlet" detail={primary.name}>
          <Managed />
        </Row>
      ) : null}
      <div className="mt-3">{session.outlets.length ? <AccessSummary outlets={session.outlets} /> : <p className="ap-bd text-(--ap-muted)">Your Beeliv team hasn&apos;t assigned outlets yet.</p>}</div>
      <Note icon={ShieldCheck} className="mt-5">
        Your access is managed by Beeliv. Need another outlet or more visibility? Ask your Beeliv team.
      </Note>
      <div className="mt-4">
        <Link href={supportHref("Access change request")} className={`ap-btn ap-btn-s max-[640px]:w-full ${FOCUS}`}>
          <Check className="size-4" aria-hidden="true" /> Request access change
        </Link>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------ 7 Privacy & agreements */

export function PrivacySection({ agreements }: { agreements: AgreementAck[] }) {
  return (
    <SectionCard id="s-privacy" title="Privacy & agreements">
      {/* TBD: the public Privacy Policy / Terms of Service pages do not exist yet - no dead links. */}
      <Row title="Privacy Policy" detail="Beeliv will publish this on its website.">
        <Managed text="Coming soon" />
      </Row>
      <Row title="Terms of Service" detail="Beeliv will publish this on its website.">
        <Managed text="Coming soon" />
      </Row>
      <h3 className="ap-label mt-4 mb-0.5 font-bold text-(--ap-muted) uppercase">Accepted agreements</h3>
      {agreements.length === 0 ? (
        <p className="ap-bd py-2 text-(--ap-muted)">No agreements on your account.</p>
      ) : (
        agreements.map((a) => (
          <Row key={a.id} title={a.title} detail={a.acknowledged ? `${a.version ? `Version ${a.version} · ` : ""}${a.acknowledgedAt ? `Accepted ${fullDate(a.acknowledgedAt.slice(0, 10))}` : "Accepted"}` : "Not accepted yet"}>
            {a.acknowledged ? (
              <span className="ap-label shrink-0 font-bold text-(--ap-ok)">Accepted</span>
            ) : (
              <Link href="/client/setup?step=4" className={`ap-hit shrink-0 text-sm font-bold whitespace-nowrap text-(--ap-violet) ${FOCUS}`}>
                Review
              </Link>
            )}
          </Row>
        ))
      )}
      {/* TBD: Beeliv supplies the agreement text; titles only until then. */}
      <p className="ap-sm mt-2">Beeliv will provide the full text of each agreement.</p>
    </SectionCard>
  );
}

/* --------------------------------------------------- 8 Help & support */

export function HelpSection({ team }: { team: BeelivTeam }) {
  return (
    <SectionCard id="s-help" title="Help & support">
      <div className="flex items-center gap-3.5">
        <ClientAvatar name={team.name} size={48} />
        <div className="min-w-0 leading-tight">
          <span className="ap-sm block">Your Beeliv contact</span>
          <b className="block truncate text-[16px] text-(--ap-ink)">{team.name}</b>
          <span className="ap-sm block">{team.role}, Beeliv Hospitality</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5 max-[640px]:flex-col">
        <Link href={SUPPORT} className={`ap-btn ap-btn-p text-white! ${FOCUS}`}>
          Contact Beeliv
        </Link>
        <Link href={`${SUPPORT}#faq`} className={`ap-btn ap-btn-s ${FOCUS}`}>
          Help Centre
        </Link>
        <Link href={supportHref("Report a problem")} className={`ap-btn ap-btn-s ${FOCUS}`}>
          Report a problem
        </Link>
      </div>
    </SectionCard>
  );
}

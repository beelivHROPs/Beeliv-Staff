"use client";

import { useAuthLive } from "@/lib/ui/auth-live";
import { AccountSecurityActions } from "@/components/shared/AccountSecurityActions";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { Check, LockKeyhole, LogOut, Moon, Settings, ShieldCheck, Sun, X } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Field, FormGrid, INPUT_CLS, Note } from "@/components/applicant/apply/parts";
import { useFlagInvalid } from "@/components/applicant/form-feedback";
import { PhoneInput } from "@/components/applicant/form-fields";
import { phoneError } from "@/lib/phone/phone";
import { SectionCard } from "@/components/applicant/SectionCard";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { Row } from "@/components/client/settings/sections";
import { AlwaysSent } from "@/components/shared/AlwaysSent";
import { toast } from "@/components/ui/toast";
import { toggleSetting, useApplicantSettings } from "@/lib/applicant/settings";
import { fullDate } from "@/lib/client/format";
import { saveNotifications, saveProfile, revokeOtherSessions, revokeSession, setAdminPrefs, useAdminPrefs } from "@/lib/admin/settings/hooks";
import type { AdminAccountSettings, AdminAgreement, AdminNotificationPrefKey, AdminNotificationPrefs, AdminPrefs, AdminProfile } from "@/lib/admin/settings/types";
import { clearAdminBanner, setAdminBannerFromFile, useAdminBanner } from "@/lib/admin/banner";
import { setAdminDark, useAdminDark } from "@/lib/admin/theme";
import { SoundSettingsRows } from "./SoundSettings";
import { PasswordSheet } from "./PasswordSheet";

/**
 * Admin Settings sections: the same structure and look as Client Settings
 * (components/client/settings/sections.tsx). Row is imported from there; Switch
 * and Managed are tiny and not exported, so they are copied. Sections are
 * SectionCards with ids that the section nav scrolls to.
 */

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";
const BTN_LINK = `ap-btn ap-btn-s ap-btn-sm ${FOCUS}`;

const Managed = ({ text = "Set by your Beeliv team" }: { text?: string }) => <span className="ap-label max-w-[45%] shrink-0 text-right font-bold text-(--ap-muted)">{text}</span>;

function Switch({ on, label, onClick, disabled }: { on: boolean; label: string; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick} className={`ap-switch shrink-0 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`} />;
}

const saved = () => toast.add({ title: "Saved" });
const failed = () => toast.add({ title: "We couldn't save that", description: "Please try again.", type: "error" });

const Chips = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {items.map((t) => (
        <li key={t} className="ap-chip ap-chip-violet">
          {t}
        </li>
      ))}
    </ul>
  ) : (
    <p className="ap-bd text-(--ap-muted)">{empty}</p>
  );

/* ------------------------------------------------------------- 1 Profile */

function profileErrors(d: { fullName: string; jobTitle: string; phone: string }) {
  return {
    fullName: d.fullName.trim() ? undefined : "Enter your full name.",
    jobTitle: d.jobTitle.trim() ? undefined : "Enter your job title.",
    phone: phoneError(d.phone) ?? undefined,
  };
}

export function ProfileSection({ profile, onSaved }: { profile: AdminProfile; onSaved: (p: { fullName: string; jobTitle: string; phone: string }) => void }) {
  const [draft, setDraft] = useState({ fullName: profile.fullName, jobTitle: profile.jobTitle, phone: profile.phone });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(ref);
  const err: Partial<ReturnType<typeof profileErrors>> = tried ? profileErrors(draft) : {};
  const dirty = draft.fullName !== profile.fullName || draft.jobTitle !== profile.jobTitle || draft.phone !== profile.phone;
  const set = (k: keyof typeof draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const scopeText = profile.scope.clients.length ? `${profile.scope.clients.length} ${profile.scope.clients.length === 1 ? "client" : "clients"}, ${profile.scope.outlets.length} ${profile.scope.outlets.length === 1 ? "outlet" : "outlets"}. See Access & organisation.` : "None assigned yet. See Access & organisation.";

  async function save() {
    if (Object.values(profileErrors(draft)).some(Boolean) || ref.current?.querySelector('[aria-invalid="true"]')) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    try {
      const next = { fullName: draft.fullName.trim(), jobTitle: draft.jobTitle.trim(), phone: draft.phone };
      await saveProfile(next);
      onSaved(next);
      toast.add({ title: "Profile saved" });
      setTried(false);
    } catch {
      failed();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard id="s-profile" title="Account & profile">
      <div className="mb-5 flex items-center gap-3.5">
        <AdminAvatar name={profile.fullName || "Admin"} photoUrl={profile.avatarUrl} size={64} />
        <div className="min-w-0 leading-tight">
          <b className="block truncate text-[18px] text-(--ap-ink)">{profile.fullName || "Your name"}</b>
          <span className="ap-sm block">{`${profile.roleLabel} • ${profile.hrLevel}`}</span>
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
            <input id="set-title" className={INPUT_CLS} autoComplete="organization-title" placeholder="e.g. HR Officer" value={draft.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} aria-invalid={err.jobTitle ? true : undefined} aria-describedby={err.jobTitle ? "set-title-err" : undefined} />
          </Field>
          <Field label="Phone number" htmlFor="set-phone" error={err.phone}>
            <PhoneInput quiet id="set-phone" value={draft.phone} onChange={(v) => set("phone", v)} invalid={Boolean(err.phone)} />
          </Field>
          <Field label="Email" htmlFor="set-email" hint="Managed by your Beeliv sign-in.">
            <input id="set-email" className={INPUT_CLS} readOnly value={profile.email ?? "Not available yet"} />
          </Field>
        </FormGrid>
        <div className="mt-5 flex justify-end gap-2.5 max-[640px]:flex-col-reverse max-[640px]:[&>button]:w-full">
          {dirty ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft({ fullName: profile.fullName, jobTitle: profile.jobTitle, phone: profile.phone });
                setTried(false);
              }}
              className={`ap-btn ap-btn-s ${FOCUS}`}
            >
              Discard changes
            </button>
          ) : null}
          <button type="submit" disabled={busy || !dirty} className={`ap-btn ap-btn-p disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}>
            {busy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
      <div className="mt-3 border-t border-(--ap-line-2)">
        <Row title="Staff ID" detail={profile.employeeId ?? "Not available yet"}>
          <Managed />
        </Row>
        <Row title="HR level" detail={profile.hrLevel}>
          <Managed />
        </Row>
        <Row title="Assigned clients and outlets" detail={scopeText}>
          <Managed />
        </Row>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------ 2 Security */

export function SecuritySection({ sessions, onChanged, onSignOut }: { sessions: AdminAccountSettings["sessions"]; onChanged: (ids: string[]) => void; onSignOut: () => void }) {
  const liveAuth = useAuthLive();
  const [pw, setPw] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const others = sessions.filter((s) => !s.current);

  if (liveAuth || process.env.NODE_ENV === "production") return <AccountSecurityActions onSignOut={onSignOut} />;

  async function revoke(id: string | null) {
    const ok = await confirmAction({
      tone: "neutral",
      icon: LogOut,
      title: id ? "Sign out this session?" : "Sign out all other sessions?",
      description: "Those devices will need to sign in again. This device stays signed in.",
      confirmLabel: "Sign out",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    setBusyId(id ?? "all");
    try {
      if (id) await revokeSession(id);
      else await revokeOtherSessions();
      onChanged(id ? [id] : others.map((s) => s.id));
      toast.add({ title: "Device preview updated", description: "Your real sign-in sessions have not changed." });
    } catch {
      failed();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SectionCard id="s-security" title="Security">
      <p className="ap-sm mb-1">Security controls are unavailable here. Your sign-in settings have not changed.</p>
      <Row title="Password" detail="Change the password you use to sign in.">
        <button type="button" onClick={() => setPw(true)} className={`${BTN_LINK} shrink-0`}>
          Change password
        </button>
      </Row>
      <Row title="Two-factor authentication" detail="Not enabled. Two-factor setup is connected later.">
        <button type="button" disabled className={`${BTN_LINK} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}>
          Set up
        </button>
      </Row>
      <div className="border-t border-(--ap-line-2) py-3.5">
        <div className="flex items-center justify-between gap-3">
          <b className="text-base">Active sessions</b>
          {others.length ? (
            <button type="button" disabled={busyId !== null} onClick={() => void revoke(null)} className={`shrink-0 text-sm font-bold whitespace-nowrap text-(--ap-violet) hover:text-(--ap-plum) disabled:opacity-50 max-[1100px]:min-h-9 ${FOCUS}`}>
              Sign out other sessions
            </button>
          ) : null}
        </div>
        <ul className="mt-2.5 flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-(--ap-line-2) px-3.5 py-3">
              <ShieldCheck className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] wrap-anywhere">{s.device}</b>
                <span className="ap-sm block">{s.detail}</span>
              </span>
              {s.current ? null : (
                <button type="button" disabled={busyId !== null} onClick={() => void revoke(s.id)} className={`shrink-0 text-sm font-bold text-(--ap-violet) hover:text-(--ap-plum) disabled:opacity-50 max-[1100px]:min-h-9 ${FOCUS}`}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--ap-line-2) pt-4">
        <p className="ap-sm flex min-w-0 flex-1 items-start gap-2">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Sign out of Beeliv Admin on this device. Your information stays saved.
        </p>
        <button type="button" onClick={onSignOut} className={`ap-btn ap-btn-s max-[640px]:w-full ${FOCUS}`}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
      {pw ? <PasswordSheet onClose={() => setPw(false)} /> : null}
    </SectionCard>
  );
}

/* ------------------------------------------------------- 3 Notifications */

type PrefRow = { key: AdminNotificationPrefKey; label: string; detail: string };
const EVENTS: PrefRow[] = [
  { key: "newApplication", label: "New application", detail: "When an applicant applies to one of your vacancies." },
  { key: "documentResubmitted", label: "Document resubmitted", detail: "When someone uploads a new version for review." },
  { key: "interviewToday", label: "Interview today", detail: "A reminder on the day an interview is scheduled. Interviewers also see a reminder 1 hour before." },
  { key: "clientFeedback", label: "Client feedback received", detail: "When a client responds to candidates you sent." },
  { key: "clientRequest", label: "Client request", detail: "When a client sends a new workforce request." },
  { key: "leaveRequest", label: "Leave request", detail: "When staff in your scope request leave." },
  { key: "inboxAssignment", label: "Inbox assignment", detail: "When an inbox item is assigned to you." },
  { key: "announcement", label: "Announcement", detail: "When Beeliv publishes an announcement." },
];
const DELIVERY: PrefRow[] = [
  { key: "channelInApp", label: "In-app", detail: "Shown in your Admin notifications." },
  { key: "channelEmail", label: "Email", detail: "Email delivery is connected later. Your choice is saved for when it is." },
];

export function NotificationsSection({ prefs, onSaved }: { prefs: AdminNotificationPrefs; onSaved: (p: AdminNotificationPrefs) => void }) {
  function set(key: AdminNotificationPrefKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    onSaved(next);
    saveNotifications(next).then(saved, () => {
      onSaved(prefs);
      failed();
    });
  }
  const rows = (list: PrefRow[]) =>
    list.map((r) => (
      <Row key={r.key} title={r.label} detail={r.detail}>
        <Switch on={prefs[r.key]} label={r.label} onClick={() => set(r.key)} />
      </Row>
    ));
  return (
    <SectionCard id="s-notif" title="Notifications">
      <p className="ap-sm mb-2">Choose what you hear about as a member of the HR team.</p>
      <h3 className="ap-label mt-3 mb-0.5 font-bold text-(--ap-muted) uppercase">What you are told about</h3>
      {rows(EVENTS)}
      <h3 className="ap-label mt-5 mb-0.5 font-bold text-(--ap-muted) uppercase">Delivery</h3>
      {rows(DELIVERY)}
      <Row title="Security, invitations and agreements" detail="Account security, invitations and setup, and agreements that need your acceptance. These can't be turned off.">
        <AlwaysSent label="Security, invitations and agreements" />
      </Row>
    </SectionCard>
  );
}

/* ------------------------------------------------------------ 4 Workspace */

export function WorkspaceSection({ profile, options }: { profile: AdminProfile; options: AdminAccountSettings["options"] }) {
  const prefs = useAdminPrefs();
  const pick = (patch: Partial<AdminPrefs>) => {
    setAdminPrefs(patch);
    saved();
  };
  const filterOptions = [
    { value: "all", label: "All clients and outlets" },
    ...profile.scope.clients.map((c) => ({ value: c.id, label: c.name })),
    ...profile.scope.outlets.map((o) => ({ value: o.id, label: `${profile.scope.clients.find((c) => c.id === o.clientId)?.name ?? "Outlet"}: ${o.name}` })),
  ];
  const filterValue = filterOptions.some((o) => o.value === prefs.clientFilter) ? prefs.clientFilter : "all";
  return (
    <SectionCard id="s-workspace" title="Workspace">
      <p className="ap-sm mb-3">Saved on this device.</p>
      <FormGrid>
        <Field label="Default landing page" htmlFor="set-landing" hint="Where Beeliv Admin opens after you sign in.">
          <SelectMenu id="set-landing" value={prefs.landing} options={options.landing} onChange={(v) => pick({ landing: v })} />
        </Field>
        <Field label="Default list sort" htmlFor="set-sort" hint="How lists are ordered until you change it.">
          <SelectMenu id="set-sort" value={prefs.sort} options={options.sort} onChange={(v) => pick({ sort: v })} />
        </Field>
        <Field label="Rows per batch" htmlFor="set-batch" hint="How many more rows Show more adds.">
          <SelectMenu id="set-batch" value={String(prefs.batch)} options={options.batch} onChange={(v) => pick({ batch: Number(v) })} />
        </Field>
        <Field label="Default client or outlet" htmlFor="set-filter" hint="Lists start filtered to this. Limited to your assigned scope.">
          <SelectMenu id="set-filter" value={filterValue} options={filterOptions} onChange={(v) => pick({ clientFilter: v })} />
        </Field>
        <Field label="Week starts on" htmlFor="set-week">
          <SelectMenu id="set-week" value={prefs.weekStart} options={options.weekStart} onChange={(v) => pick({ weekStart: v as AdminPrefs["weekStart"] })} />
        </Field>
        <Field label="Time format" htmlFor="set-time">
          <SelectMenu id="set-time" value={prefs.timeFormat} options={options.timeFormat} onChange={(v) => pick({ timeFormat: v as AdminPrefs["timeFormat"] })} />
        </Field>
        <Field label="Time zone" htmlFor="set-tz" hint="All times in Beeliv Admin use this zone.">
          <input id="set-tz" className={INPUT_CLS} readOnly value={options.timezoneLabel} />
        </Field>
      </FormGrid>
    </SectionCard>
  );
}

/* ---------------------------------------------------------- 5 Appearance */

type Mode = AdminPrefs["theme"];
const THEMES: { mode: Mode; label: string; detail: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", detail: "Always light", icon: Sun },
  { mode: "dark", label: "Dark", detail: "Always dark", icon: Moon },
  { mode: "system", label: "System", detail: "Match your device", icon: Settings },
];

const systemDark = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function AppearanceSection() {
  const prefs = useAdminPrefs();
  const dark = useAdminDark();
  const settings = useApplicantSettings();

  // While "System" is chosen on this screen, follow the device live.
  useEffect(() => {
    if (prefs.theme !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setAdminDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [prefs.theme]);

  // The sidebar switch only sets light/dark, so show what is actually applied.
  const shown: Mode = prefs.theme === "system" && dark === systemDark() ? "system" : dark ? "dark" : "light";

  function choose(m: Mode) {
    setAdminPrefs({ theme: m });
    setAdminDark(m === "system" ? systemDark() : m === "dark");
  }

  return (
    <SectionCard id="s-appearance" title="Appearance">
      <b className="mb-2.5 block text-base" id="theme-label">
        Theme
      </b>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-2.5 max-[420px]:gap-2">
        {THEMES.map(({ mode: m, label, detail, icon: Icon }) => {
          const on = shown === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(m)}
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

export function AccessSection({ profile, capabilities }: { profile: AdminProfile; capabilities: AdminAccountSettings["capabilities"] }) {
  const clients = profile.scope.clients.map((c) => c.name);
  const outlets = profile.scope.outlets.map((o) => `${profile.scope.clients.find((c) => c.id === o.clientId)?.name ?? "Outlet"}: ${o.name}`);
  return (
    <SectionCard id="s-access" title="Access & organisation">
      <Row title="Role" detail={profile.roleLabel}>
        <Managed text="Set by Operations" />
      </Row>
      <Row title="HR level" detail={profile.hrLevel}>
        <Managed text="Set by Operations" />
      </Row>
      <div className="border-t border-(--ap-line-2) py-3.5">
        <b className="mb-2 block text-base">What you can do</b>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {capabilities.map((c) => (
            <li key={c.key} title={c.detail} className={`ap-chip ${c.allowed ? "ap-chip-ok" : ""}`}>
              {c.allowed ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
              {c.label}
              <span className="sr-only">{c.allowed ? " (allowed)" : " (not granted)"}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-(--ap-line-2) py-3.5">
        <b className="mb-2 block text-base">Assigned clients</b>
        <Chips items={clients} empty="No clients assigned yet." />
      </div>
      <div className="border-t border-(--ap-line-2) py-3.5">
        <b className="mb-2 block text-base">Assigned outlets</b>
        <Chips items={outlets} empty="No outlets assigned yet." />
      </div>
      <Note icon={ShieldCheck} className="mt-2">
        Role and scope changes are made by Operations.
      </Note>
    </SectionCard>
  );
}

/* ------------------------------------------------ 7 Privacy & agreements */

export function PrivacySection({ agreements }: { agreements: AdminAgreement[] }) {
  return (
    <SectionCard id="s-privacy" title="Privacy & agreements">
      {/* TBD: the public Privacy Policy / Terms pages do not exist yet - no dead links. */}
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
            <span className={`ap-label shrink-0 font-bold ${a.acknowledged ? "text-(--ap-ok)" : "text-(--ap-muted)"}`}>{a.acknowledged ? "Accepted" : "Pending"}</span>
          </Row>
        ))
      )}
      {/* TBD: Beeliv supplies the agreement text; titles only until then. */}
      <p className="ap-sm mt-2">Beeliv will provide the full text of each agreement.</p>
    </SectionCard>
  );
}


/* ------------------------------------------------------------ 8 Branding */

export function BrandingSection() {
  const banner = useAdminBanner();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const err = await setAdminBannerFromFile(file);
    setBusy(false);
    setMsg(err);
    if (!err) toast.add({ title: "Banner saved" });
    if (input.current) input.current.value = "";
  }

  return (
    <SectionCard id="s-branding" title="Branding">
      <p className="ap-sm mb-3">The banner picture shown at the top of your Overview. Saved on this device for now.</p>
      <div className="relative aspect-[16/5] w-full overflow-hidden rounded-2xl border border-(--ap-line-2) bg-(--ap-tint-soft)">
        {banner ? (
          <Image src={banner} alt="Banner preview" fill unoptimized sizes="(max-width: 1040px) 100vw, 760px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center">
            <span className="ap-sm">No banner chosen. The Overview uses the default design.</span>
          </div>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Choose banner picture" onChange={(e) => void pick(e.target.files?.[0])} />
      {msg ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-(--ap-danger,#C8102E)">
          {msg}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2.5 max-[640px]:flex-col">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`ap-btn ap-btn-p text-white! disabled:opacity-50 ${FOCUS}`}>
          {busy ? "Saving..." : banner ? "Replace banner" : "Upload banner"}
        </button>
        {banner ? (
          <button
            type="button"
            onClick={() => {
              clearAdminBanner();
              setMsg(null);
              toast.add({ title: "Banner removed" });
            }}
            className={`ap-btn ap-btn-s ${FOCUS}`}
          >
            Remove
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { LockKeyhole, LogOut } from "@/components/applicant/icons";
import { toast } from "@/components/ui/toast";
import { useStaffProfile } from "@/lib/staff/hooks";
import { ActionPill, Panel, confirmAction } from "../kit";
import { setStaffDark, useStaffDark } from "@/lib/staff/theme";
import { AlwaysSent } from "@/components/shared/AlwaysSent";
import { isRequired } from "@/lib/notifications/catalog";
import { STAFF_KIND } from "@/lib/notifications/adapters";
import type { NotificationEvent } from "@/lib/staff/types";

/**
 * Staff Settings. One Talent app, one login: the sign-in email/password
 * belong to the SAME account as the Applicant side, so there is no separate
 * staff credential here. Auth is not wired yet, so account actions confirm
 * honestly instead of pretending to change anything.
 *
 * Notification preferences are DEVICE-LOCAL for now (localStorage) - there is
 * no preferences contract in the data layer yet (TBD); a backend adapter
 * would persist them per person.
 */

const PREF_KEY = "bv-staff-notification-prefs";

/** One switch per event kind from the notification model (brief section 17). */
const PREFS: { key: NotificationEvent; title: string; detail: string }[] = [
  { key: "shift-updated", title: "Shift changes", detail: "When a shift you're on is added, moved or cancelled" },
  { key: "assignment-changed", title: "Assignment changes", detail: "When your outlet, role or supervisor changes" },
  { key: "leave-updated", title: "Leave updates", detail: "When a leave request is approved, declined or changed" },
  { key: "document-requested", title: "Document requests", detail: "When Beeliv asks for a new or updated document" },
  { key: "sop-assigned", title: "New SOPs", detail: "When an SOP is assigned to you" },
  { key: "training-assigned", title: "New training", detail: "When training is assigned to you" },
  { key: "announcement", title: "Announcements", detail: "News from Beeliv, your outlet or the workforce" },
];

type Prefs = Partial<Record<NotificationEvent, boolean>>;

// Tiny external store so SSR (all on) and the browser agree without an effect.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const readRaw = () => {
  try {
    return localStorage.getItem(PREF_KEY) ?? "{}";
  } catch {
    return "{}";
  }
};
function usePrefs(): Prefs {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "{}");
  return JSON.parse(raw) as Prefs;
}
function setPref(key: NotificationEvent, on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...(JSON.parse(readRaw()) as Prefs), [key]: on }));
  } catch {
    /* storage unavailable: the switch simply doesn't persist */
  }
  listeners.forEach((l) => l());
}

function preview(action: string) {
  toast.add({ title: `${action} isn't connected yet`, description: "This is a preview. No account changes were made." });
}

function Row({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-(--ap-line-2) py-3.5 first:border-t-0 max-[767px]:items-start">
      <div className="min-w-0">
        <b className="block text-base">{title}</b>
        <span className="ap-sm wrap-anywhere">{detail}</span>
      </div>
      {children}
    </div>
  );
}

export function SettingsBody() {
  const dark = useStaffDark();
  const prefs = usePrefs();
  const router = useRouter();
  const { data: profile } = useStaffProfile();

  async function signOut() {
    const ok = await confirmAction({
      tone: "neutral",
      icon: LogOut,
      title: "Sign out of Beeliv?",
      description: "You'll be signed out of your Beeliv account on this device. Sign back in any time.",
      confirmLabel: "Sign out",
      cancelLabel: "Stay signed in",
    });
    // Auth isn't wired yet, so (like the shell's menu) this returns to the public site.
    if (ok) router.push("/");
  }

  return (
    <div className="w-full pt-1 pb-2">
      <h1 className="text-[28px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[32px]">Settings</h1>
      <p className="mt-1 mb-5 text-[16px] text-(--ap-muted)">Manage how Beeliv notifies you and your account.</p>

      <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-2 min-[1000px]:grid-rows-[auto_auto_auto_1fr] min-[1000px]:items-start min-[1000px]:gap-x-6">
        <Panel id="s-notif" title="Notifications" className="min-[1000px]:row-span-4">
          <p className="ap-sm mb-1">Choose which updates appear in your notifications. Your choices are kept on this device only for now.</p>
          {PREFS.map((p) => (
            <Row key={p.key} title={p.title} detail={p.detail}>
              {isRequired(STAFF_KIND[p.key]) ? (
                <AlwaysSent label={p.title} />
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[p.key] !== false}
                  aria-label={p.title}
                  onClick={() => setPref(p.key, prefs[p.key] === false)}
                  className="ap-switch shrink-0"
                />
              )}
            </Row>
          ))}
          <Row title="Security and agreements" detail="Account security alerts and agreements that need your acceptance">
            <AlwaysSent label="Security and agreements" />
          </Row>
          <p className="ap-sm mt-2">Messages marked Always sent are needed to do your job or to avoid missing something important, so they can&apos;t be switched off.</p>
        </Panel>

        <Panel id="s-display" title="Display">
          <Row title="Dark mode" detail="Easier on the eyes at night and in dim rooms. Saved on this device.">
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Dark mode"
              onClick={() => setStaffDark(!dark)}
              className="ap-switch shrink-0"
            />
          </Row>
        </Panel>

        <Panel id="s-acct" title="Account & security">
          <Row title="Sign-in email" detail={profile ? `${profile.email} · shared with your whole Beeliv account` : "Shared with your whole Beeliv account"}>
            <ActionPill variant="outline" compact arrow={false} onClick={() => preview("Changing your email")} ariaLabel="Change sign-in email">
              Change
            </ActionPill>
          </Row>
          <Row title="Password" detail="One password for everything you do with Beeliv">
            <ActionPill variant="outline" compact arrow={false} onClick={() => preview("Password reset")} ariaLabel="Change password">
              Change
            </ActionPill>
          </Row>
        </Panel>

        <Panel id="s-out" title="Sign out">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ap-sm flex min-w-0 flex-1 items-start gap-2">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Sign out of Beeliv on this device. Your information stays saved.
            </p>
            <ActionPill variant="outline" compact icon={LogOut} arrow={false} onClick={signOut} className="max-[640px]:w-full">
              Sign out
            </ActionPill>
          </div>
        </Panel>
      </div>
    </div>
  );
}


"use client";

import Link from "next/link";
import { LogOut } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import type { Portal } from "@/lib/auth/types";
import { usePortalSignOut } from "@/lib/ui/use-portal-sign-out";

/**
 * Account setup help for an account that has no workspace access yet. It offers useful actions, not a passive
 * waiting page:
 *  - "finish-setup": the person still has setup to do (link to the setup step).
 *  - "confirming": setup is in; the person can check their status or get help.
 * It never claims the account is active and never grants access or loads business data.
 *
 * `applicantHref` is shown ONLY when the caller knows (from the server access
 * context) that this person has the applicant entitlement. Callers that don't
 * know pass nothing and the link stays hidden.
 */
export function AccountSetupNotice({
  what,
  portal,
  kind,
  setupHref,
  checkHref,
  applicantHref,
  contactHref = "/contact",
}: {
  what: string;
  portal: Portal;
  kind: "finish-setup" | "confirming";
  setupHref?: string;
  checkHref: string;
  applicantHref?: string;
  contactHref?: string;
}) {
  const signOut = usePortalSignOut(portal, {
    tone: "neutral",
    icon: LogOut,
    title: "Sign out of Beeliv?",
    description: "You'll be signed out of your Beeliv account on this device. Sign back in any time.",
    confirmLabel: "Sign out",
    cancelLabel: "Stay signed in",
  }, confirmAction);
  const finishing = kind === "finish-setup";
  return (
    <section aria-label="Account setup" className="ap-card mx-auto max-w-[680px] rounded-[20px] p-5 min-[640px]:p-7">
      <h1 className="text-[24px] font-bold leading-tight text-(--ap-ink)">{finishing ? "Finish your account setup" : "Your account is almost ready"}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-(--ap-ink-2)">
        {finishing ? "Add your details to get started." : `${what} isn't open yet. Check your account status, or get help and we'll sort it out with you.`}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {finishing && setupHref ? (
          <Link href={setupHref} className="ap-btn ap-btn-p text-white!">Finish setup</Link>
        ) : (
          <a href={checkHref} className="ap-btn ap-btn-p text-white!">Check account status</a>
        )}
        <Link href={contactHref} className="ap-btn border border-(--ap-line-2) text-(--ap-ink)">Get setup help</Link>
        <button type="button" onClick={() => void signOut()} className="ap-btn border border-(--ap-line-2) text-(--ap-ink)">Sign out</button>
      </div>
      {applicantHref ? (
        <p className="mt-4 text-[15px]">
          <Link href={applicantHref} className="font-semibold underline">Go to applicant area</Link>
        </p>
      ) : null}
    </section>
  );
}

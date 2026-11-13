"use client";

import { useMemo } from "react";
import { AccountSetupNotice } from "@/components/shared/AccountSetupNotice";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useSetup } from "@/lib/admin/setup/hooks";
import { useAuthLive } from "@/lib/ui/auth-live";
import { createStaffSetupService } from "@/lib/staff/setup-service";

/**
 * Staff area while the Staff entitlement is pending (setup-only). No sidebar,
 * bottom bar, bell, search or Staff data: this component and its parent branch
 * call no Staff business hook. It reads ONLY the account-setup request (the same
 * one /staff/setup uses) to tell the two waits apart:
 *  - pending-setup: "finish setup" with a link to /staff/setup.
 *  - pending-approval: "Beeliv is confirming your access".
 *
 * `hasApplicantAccess`: the "Go to applicant area" link shows only when the SERVER access
 * context says this person has the applicant entitlement. staffSetupOnly() currently returns
 * just a boolean, so StaffShell does not pass this yet and the link stays hidden.
 * Do not assume this person also has Applicant access.
 */
export function StaffSetupOnly({ hasApplicantAccess = false }: { hasApplicantAccess?: boolean }) {
  const live = useAuthLive();
  const service = useMemo(() => createStaffSetupService(live ? "live" : "preview"), [live]);
  const setup = useSetup(service);
  const applicantHref = hasApplicantAccess ? "/applicant" : undefined;
  return (
    <main id="main-content" className="mx-auto w-full max-w-[960px] px-4 pb-20">
      {setup.status === "loading" ? (
        <div role="status" aria-busy="true" aria-label="Loading" className="ap-sk-box mx-auto h-[220px] max-w-[680px] rounded-[20px]" />
      ) : !setup.data ? (
        <ErrorPanel title="We couldn't check your account" retry={setup.retry} />
      ) : (
        <AccountSetupNotice
          what="Your Staff Hub"
          portal="staff"
          kind={setup.data.state === "pending-setup" ? "finish-setup" : "confirming"}
          setupHref="/staff/setup"
          checkHref="/staff"
          applicantHref={applicantHref}
        />
      )}
    </main>
  );
}

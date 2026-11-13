import { Clock3, ShieldCheck } from "@/components/applicant/icons";
import { StatusGate } from "@/components/staff/StatusGate";
import { AccountSetupNotice } from "./AccountSetupNotice";
import type { AdminSetup } from "@/lib/admin/setup/types";
import type { Portal } from "@/lib/auth/types";

/**
 * What a setup screen shows for a non-form server state. The server decides:
 * pending-approval (setup help), active (already complete: a link, never an
 * automatic redirect), suspended (no form, no business data). Wording is
 * generic; nothing here implies access beyond what the state says.
 */
export function SetupStateGate({ state, what, portal, home, checkHref, signInHref, supportHref }: { state: Exclude<AdminSetup["state"], "pending-setup">; what: string; portal: Portal; home: string; checkHref: string; signInHref: string; supportHref?: string }) {
  if (state === "pending-approval") return <AccountSetupNotice what={what} portal={portal} kind="confirming" checkHref={checkHref} />;
  if (state === "active")
    return <StatusGate tone="action" image={null} icon={ShieldCheck} chip="Setup complete" title="Your account is active" lead="Beeliv has confirmed your setup." next={`You can open ${what} now.`} primary={{ label: "Open workspace", href: home }} />;
  return (
    <StatusGate
      tone="critical"
      image={null}
      icon={Clock3}
      chip="Access paused"
      title="This account is suspended"
      lead="Setup is not available while access is paused."
      next="Contact Beeliv if you think this is a mistake. Nothing here can change it."
      primary={{ label: supportHref ? "Contact support" : "Back to sign in", href: supportHref ?? signInHref }}
    />
  );
}

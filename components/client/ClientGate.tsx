import { CircleAlert, Clock3, LockKeyhole, Mail, ShieldCheck, UserRound } from "@/components/applicant/icons";
import { Store } from "./icons";
import { StatusGate, type GateTone } from "@/components/staff/StatusGate";
import type { ClientAccountState } from "@/lib/client/types";

type Gate = { tone: GateTone; icon: typeof Mail; chip: string; title: string; lead: string; next: string; primary: { label: string; href: string }; secondary?: { label: string; href: string } };

/**
 * Full-page account states (brief section 31). Client accounts are
 * invitation-only - there is no public Client sign-up, so no state offers one.
 * Colour follows severity (action = plum, warn = amber, critical = rose,
 * neutral = grey), exactly like the Staff gates. Illustrations are TBD
 * (image = null shows the branded empty room).
 */
const GATES: Record<Exclude<ClientAccountState, "active">, Gate> = {
  "invitation-required": {
    tone: "action",
    icon: Mail,
    chip: "Invitation needed",
    title: "Beeliv Client is by invitation",
    lead: "Client accounts are created by Beeliv. There is no public sign-up.",
    next: "Open the invitation email your Beeliv contact sent you. Once you accept it, a short account setup will guide you through your details, outlets and notifications. If you can't find the email, ask your Beeliv team to send it again.",
    primary: { label: "Sign in", href: "/login" },
    secondary: { label: "Back to beeliv.co", href: "/" },
  },
  "invitation-expired": {
    tone: "warn",
    icon: Clock3,
    chip: "Invitation expired",
    title: "This invitation has expired",
    lead: "For your security, invitation links only work for a limited time.",
    next: "Ask your Beeliv contact to send you a new invitation. When you accept it, you'll be taken through account setup. Your business details are unchanged.",
    primary: { label: "Sign in", href: "/login" },
    secondary: { label: "Back to beeliv.co", href: "/" },
  },
  "invitation-invalid": {
    tone: "critical",
    icon: CircleAlert,
    chip: "Invitation not valid",
    title: "We can't use this invitation",
    lead: "The link is invalid, or Beeliv has withdrawn it.",
    next: "Contact your Beeliv team to confirm your access and request a fresh invitation. Account setup starts once you accept it.",
    primary: { label: "Back to beeliv.co", href: "/" },
    secondary: { label: "Sign in", href: "/login" },
  },
  "invitation-used": {
    tone: "neutral",
    icon: UserRound,
    chip: "Already used",
    title: "This invitation has already been used",
    lead: "Your Client account was already created with it, so account setup has been done.",
    next: "Sign in with the email and password you chose. Use \"Forgot password\" on the sign-in page if you need to reset it.",
    primary: { label: "Sign in", href: "/login" },
  },
  suspended: {
    tone: "critical",
    icon: ShieldCheck,
    chip: "Account suspended",
    title: "Your Client account is suspended",
    lead: "You can't open your workspace while the suspension is in place.",
    next: "Contact your Beeliv team to find out why and how access can be restored.",
    primary: { label: "Back to beeliv.co", href: "/" },
  },
  "no-client-access": {
    tone: "neutral",
    icon: LockKeyhole,
    chip: "No Client access",
    title: "This account has no Client access",
    lead: "It isn't linked to a client business at Beeliv.",
    next: "If you expected access, ask your Beeliv contact to check the invitation was sent to this email address.",
    primary: { label: "Sign in with another account", href: "/login" },
    secondary: { label: "Back to beeliv.co", href: "/" },
  },
  "wrong-portal": {
    tone: "neutral",
    icon: LockKeyhole,
    chip: "Wrong portal",
    title: "This is the Client portal",
    lead: "Your account belongs to a different Beeliv workspace.",
    next: "Sign in from the workspace you were invited to. Nothing on your account has changed.",
    primary: { label: "Go to sign in", href: "/login" },
    secondary: { label: "Back to beeliv.co", href: "/" },
  },
  "no-outlets": {
    tone: "action",
    icon: Store,
    chip: "No outlets yet",
    title: "No outlets are assigned to you yet",
    lead: "Your Client account is active, but Beeliv hasn't given it any outlets to show.",
    next: "Your Beeliv team assigns outlets. Get in touch and they'll set this up.",
    primary: { label: "Contact Beeliv", href: "/client/support" },
  },
};

export function ClientGate({ state }: { state: Exclude<ClientAccountState, "active"> }) {
  const g = GATES[state];
  return <StatusGate tone={g.tone} image={null} icon={g.icon} chip={g.chip} title={g.title} lead={g.lead} next={g.next} primary={g.primary} secondary={g.secondary} />;
}

/**
 * Auth screens copy (COPY.md "## 7. Log in & Sign up", LOCKED wording wins over
 * the wireframe where they differ) and the open items that COPY.md still lists
 * under "Open items before locking, 8. Auth".
 *
 * Nothing here is business logic: strings and constants only.
 */
import { ROUTES } from "./content";
import type { ImageSlotKey } from "./assets";

export type IllustrationKey = Extract<
  ImageSlotKey,
  `auth${string}Illustration`
>;

export const AUTH_ROUTES = {
  home: ROUTES.home,
  login: ROUTES.login,
  signup: ROUTES.signup,
  forgot: "/forgot-password",
  sent: "/forgot-password/sent",
  /** Applicant signup success: "check your email to verify". DRAFT (no wireframe board). */
  verifyEmail: "/verify-email",
  verified: "/verify-email/success",
  /** Where the emailed reset link lands (create a new password). DRAFT (no wireframe board). */
  resetPassword: "/reset-password",
  resetSuccess: "/reset-password/success",
  request: ROUTES.request,
  /** "Hire talent" on /signup sends businesses here (the "what do you need" form). */
  requestFromSignup: `${ROUTES.request}?from=signup`,
  privacy: ROUTES.privacy,
  terms: ROUTES.terms,
} as const;

/* ------------------------------------------------------------------ */
/* Auth constants. Still open (COPY.md item 8): password rule + phone  */
/* placeholder. Reset-link expiry is decided (10 minutes).             */
/* Kept as named constants so each is changed in exactly one place.    */
/* ------------------------------------------------------------------ */

/**
 * Reset-link expiry, in seconds: 10 minutes (project-lead decision, 26 Sep
 * 2026; no longer an open item on the frontend). It drives the live countdown
 * on the Check-your-email screen. That countdown is ONLY A DISPLAY of the real
 * expiry: the server-side value must be configured to match (Supabase Auth
 * email OTP / link expiry = 600 seconds). Change both together.
 */
export const RESET_LINK_EXPIRY_SECONDS = 600;

/** OPEN ITEM: password rule ("At least 8 characters, with a number."). */
export const PASSWORD_RULE = {
  minLength: 8,
  requiresNumber: true,
  hint: "At least 8 characters, with a number.",
} as const;

/** OPEN ITEM: phone placeholder format (COPY.md: +234 800 000 0000). */
export const PHONE_PLACEHOLDER = "+234 800 000 0000";

/**
 * NOT in COPY.md (my choice, flagged in the handoff): how long the "resend the
 * link" action stays disabled after a send.
 */
export const RESEND_COOLDOWN_SECONDS = 30;

/* ------------------------------------------------------------------ */
/* Desktop brand panel + mobile frame, per screen                       */
/* ------------------------------------------------------------------ */

export type AuthScreen =
  | "login"
  | "signup"
  | "forgot"
  | "sent"
  // The four below have NO wireframe board yet: derived from the Auth frame,
  // panel wording is DRAFT (see the report / open items).
  | "verify"
  | "verified"
  | "reset"
  | "resetExpired"
  | "resetDone";

type ScreenFrame = {
  /** Panel headline: plain lead + gold accent (gold = #C9A45C, detail only). */
  lead: string;
  accent: string;
  /** Panel paragraph (none on Sign up: the role card sits there instead). */
  body: string | null;
  illustration: IllustrationKey;
  /** Mobile top-left back arrow. */
  back: { href: string; label: string };
  /** Mobile top curve height (Sign up is 150, the rest 180). */
  curve: 150 | 180;
};

export const AUTH_FRAMES: Record<AuthScreen, ScreenFrame> = {
  login: {
    lead: "People build ",
    accent: "experiences.",
    body: "Log in to follow your applications, manage your roles and keep your training on track.",
    illustration: "authLoginIllustration",
    back: { href: AUTH_ROUTES.home, label: "Back to home" },
    curve: 180,
  },
  signup: {
    lead: "Create your account in minutes and ",
    accent: "start your application today.",
    body: null,
    illustration: "authSignupIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 150,
  },
  forgot: {
    lead: "Let's get you ",
    accent: "back in.",
    body: "Reset your password in a couple of minutes.",
    illustration: "authForgotIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 180,
  },
  sent: {
    lead: "Let's get you ",
    accent: "back in.",
    body: "Reset your password in a couple of minutes.",
    illustration: "authSentIllustration",
    back: { href: AUTH_ROUTES.forgot, label: "Back" },
    curve: 180,
  },
  // ---- DRAFT frames (no wireframe board): same structure as Sent/Forgot ----
  verify: {
    lead: "Almost ",
    accent: "there.",
    body: "Verify your email to activate your account.",
    illustration: "authVerifyIllustration",
    back: { href: AUTH_ROUTES.signup, label: "Back to sign up" },
    curve: 180,
  },
  verified: {
    lead: "Welcome to ",
    accent: "Beeliv.",
    body: "Your email is verified. Log in to continue.",
    illustration: "authVerifiedIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 180,
  },
  reset: {
    lead: "Let's get you ",
    accent: "back in.",
    body: "Choose a new password and you're done.",
    illustration: "authResetIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 180,
  },
  // Same frame as "reset", for an expired / invalid / already-used link.
  resetExpired: {
    lead: "Let's get you ",
    accent: "back in.",
    body: "That link can't be used any more. Request a fresh one and you'll be back in a minute.",
    illustration: "authLinkExpiredIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 180,
  },
  resetDone: {
    lead: "You're all ",
    accent: "set.",
    body: "Log in with your new password to continue.",
    illustration: "authResetSuccessIllustration",
    back: { href: AUTH_ROUTES.login, label: "Back to log in" },
    curve: 180,
  },
};

export const AUTH_SHARED = {
  backToWebsite: "← Back to website",
  legalLeft: "© 2026 Beeliv Hospitality",
  privacy: "Privacy",
  terms: "Terms",
} as const;

/* ------------------------------------------------------------------ */
/* Screen copy                                                          */
/* ------------------------------------------------------------------ */

export const LOGIN_COPY = {
  headLead: "Welcome ",
  headAccent: "back.",
  sub: "Log in to continue to your dashboard.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  passwordPlaceholder: "Your password",
  remember: "Remember me",
  forgot: "Forgot password?",
  submit: "Log in →",
  submitting: "Logging in…",
  newPrompt: "New to Beeliv? ",
  newLink: "Create an account",
} as const;

export const SIGNUP_COPY = {
  general: {
    headLead: "Create your ",
    headAccent: "account.",
    sub: "Join Beeliv to find hospitality work or hire hospitality talent.",
    submit: "Create account →",
  },
  job: {
    /** Followed by the accent: "[Role]." */
    headLead: "Apply for ",
    sub: "Create your account and start your application. You can add more details as you move through the recruitment process.",
    submit: "Create account →",
  },
  submitting: "Creating your account…",
  switchLabel: "Account type",
  switchFindWork: "Find work",
  switchHireTalent: "Hire talent",
  nameLabel: "Full name",
  namePlaceholder: "Your full name",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  phoneLabel: "Phone number",
  passwordLabel: "Password",
  passwordPlaceholder: "Create a password",
  consentLead: "I agree to Beeliv's ",
  consentTerms: "Terms",
  consentAnd: " and ",
  consentPrivacy: "Privacy Policy",
  /**
   * DRAFT wording (not in COPY.md; needs approval). Shown instead of the form
   * while "Hire talent" is selected (and if the redirect to /request does not
   * happen): businesses are never created through public signup, they are set
   * up by the Beeliv team.
   */
  hireNote:
    "Businesses are set up by the Beeliv team. Tell us what you need and we'll get you started.",
  hireAction: "Request talent →",
  hiringPrompt: "Hiring for your business? ",
  hiringLink: "Request talent →",
  loginPrompt: "Already have an account? ",
  loginLink: "Log in",
} as const;

export const ROLE_CARD = {
  eyebrow: "Applying for",
  step: (n: number) => `Step ${n} of 3`,
  steps: ["Create account", "Your experience", "Review & submit"],
  progressLabel: "Application progress",
} as const;

export const FORGOT_COPY = {
  headLead: "Forgot your ",
  headAccent: "password?",
  sub: "Enter the email you signed up with and we'll send you a link to reset it.",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  submit: "Send reset link →",
  submitting: "Sending link…",
  rememberedPrompt: "Remembered it? ",
  rememberedLink: "Back to log in",
} as const;

export const SENT_COPY = {
  headLead: "Check your ",
  headAccent: "email.",
  bodyLead: "We've sent a reset link to ",
  /** Shown when the screen is opened without an address in the URL. */
  emailFallback: "your email address",
  /** Followed by the live m:ss countdown (screen-reader text: expiresSr). */
  bodyExpiresLead: ". It expires in ",
  bodyEnd: ".",
  expiresSr: (seconds: number) => {
    const m = Math.max(1, Math.round(seconds / 60));
    return `about ${m} minute${m === 1 ? "" : "s"}`;
  },
  /** DRAFT wording (not in COPY.md; needs approval). Replaces the countdown at 0:00. */
  bodyExpired: ". This link has expired.",
  back: "Back to log in",
  spamLead: "Didn't get it? Check your spam folder, or ",
  resend: "resend the link",
  wrongPrompt: "Wrong email? ",
  wrongLink: "Try another address",
} as const;

/* ------------------------------------------------------------------ */
/* DRAFT screens: no wireframe board exists for Verify email, Reset    */
/* password or Password reset success. Structure = the Auth frame;     */
/* every string below is draft copy awaiting the project lead's       */
/* illustrations / approval.                                            */
/* ------------------------------------------------------------------ */

/** /verify-email (after applicant signup). */
export const VERIFY_COPY = {
  headLead: "Verify your ",
  headAccent: "email.",
  bodyLead: "We've sent a verification link to ",
  emailFallback: "your email address",
  bodyEnd: ". Check your email to verify your account.",
  back: "Back to log in",
  spamLead: "Didn't get it? Check your spam folder, or ",
  resend: "resend the link",
  /** Opened without an address in the URL: nothing to resend to. */
  noEmailAction: "sign up again",
  wrongPrompt: "Wrong email? ",
  wrongLink: "Use a different address",
  flowNote:
    "Backend not connected yet. No account was created and no email was sent. This is a flow test only.",
} as const;

/** /verify-email/success (the emailed confirmation link lands here). */
export const VERIFIED_COPY = {
  headLead: "Email ",
  headAccent: "verified.",
  sub: "Your email address is confirmed. Log in to continue.",
  checkingLead: "Verifying your ",
  checkingAccent: "email…",
  checkingSub: "One moment.",
  submit: "Continue →",
  flowNote:
    "Backend not connected yet. No email was actually verified. This is a flow test only.",
  /** Failure states (only reachable once a backend can reject a link). */
  expired: {
    headLead: "This link has ",
    headAccent: "expired.",
    sub: "Verification links stop working after a short time. Sign up again and we'll send a new one.",
  },
  invalid: {
    headLead: "This link ",
    headAccent: "isn't valid.",
    sub: "It may have already been used. If your email is already verified, you can log in.",
  },
  failSubmit: "Back to sign up →",
  failFootPrompt: "Already verified? ",
  failFootLink: "Log in",
} as const;

/** /reset-password (create a new password) and its expired / invalid states. */
export const RESET_COPY = {
  headLead: "Create a new ",
  headAccent: "password.",
  sub: "Choose a new password to get back into your account.",
  newLabel: "New password",
  newPlaceholder: "Create a new password",
  confirmLabel: "Confirm password",
  confirmPlaceholder: "Re-enter your new password",
  submit: "Reset password →",
  submitting: "Resetting password…",
  rememberedPrompt: "Remembered it? ",
  rememberedLink: "Back to log in",
  /** Backend failure that is not a link problem. Generic on purpose. */
  failed: "We couldn't reset your password. Try again in a moment.",
  expired: {
    headLead: "This link has ",
    headAccent: "expired.",
    /** The number comes from RESET_LINK_EXPIRY_SECONDS so text and setting can't drift. */
    sub: (seconds: number) => {
      const m = Math.max(1, Math.round(seconds / 60));
      return `Reset links last ${m} minute${m === 1 ? "" : "s"}. Request a new link to choose a new password.`;
    },
  },
  invalid: {
    headLead: "This link ",
    headAccent: "isn't valid.",
    sub: "It may have already been used, or it wasn't copied in full. Request a new link to continue.",
  },
  requestNew: "Request a new link →",
} as const;

/** /reset-password/success. */
export const RESET_DONE_COPY = {
  headLead: "Password ",
  headAccent: "reset.",
  sub: "Your password has been changed. Log in with your new password to continue.",
  submit: "Log in →",
  flowNote:
    "Backend not connected yet. No password was changed. This is a flow test only.",
} as const;

/* ------------------------------------------------------------------ */
/* Validation + status messages (not in COPY.md: functional microcopy).  */
/* ------------------------------------------------------------------ */

export const AUTH_MESSAGES = {
  nameRequired: "Enter your full name.",
  emailRequired: "Enter your email address.",
  emailInvalid: "Enter a valid email address, like you@example.com.",
  phoneRequired: "Enter your phone number.",
  phoneInvalid: `Enter a valid phone number, like ${PHONE_PLACEHOLDER}.`,
  phoneCountryCode: `Start with your country code, like ${PHONE_PLACEHOLDER}.`,
  passwordRequired: "Enter your password.",
  passwordCreateRequired: "Create a password.",
  passwordRule: "Use at least 8 characters, with a number.",
  passwordConfirmRequired: "Confirm your new password.",
  passwordMismatch: "The two passwords don't match.",
  consentRequired: "Agree to the Terms and Privacy Policy to continue.",
  strength: { 0: "", 1: "Weak", 2: "Good", 3: "Strong" } as Record<0 | 1 | 2 | 3, string>,
  showPassword: "Show password",
  hidePassword: "Hide password",
  resendSent: "We've sent the link again.",
  linkExpired: "This link has expired. You can resend it now.",
  resendWait: (s: number) => `resend the link in ${s}s`,
  resendFailed: "We couldn't resend the link. Try again in a moment.",
} as const;

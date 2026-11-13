/**
 * Admin first-run setup (HR / Operations invitees). PRESENTATION shapes only,
 * written to line up with docs/contracts/auth-setup-wire.md (revision, verified
 * email, fullName, phone, agreements with response, mfaRequired / mfaVerified).
 * No NIN or bank values, ever. Role and scope are decided by Beeliv; the
 * browser never sends them (AUTH-014: the old read-only Staff ID / role /
 * assignment block is not in the wire DTO and was dropped).
 * The same shapes serve the Client setup (app "client"); Admin adds MFA.
 */
export interface SetupAgreement {
  id: string;
  title: string;
  version: string | null;
  /**
   * Approved wording, plain text. `null` = Beeliv has not supplied it yet:
   * the screen says so and the item cannot be accepted (contentReady = false).
   */
  body: string | null;
  /** SHA-256 of the exact body; the server needs it back on accept. null in the preview (not in the wire DTO view yet). */
  bodyHash: string | null;
  required: boolean;
  /** true accepted, false refused, null no response yet. */
  response: boolean | null;
}

export interface AdminSetup {
  /** Per setup request; sent back as expectedRevision on every write. */
  revision: number;
  /** Which app's setup request this is (setup-wire `app`). */
  app: "client" | "admin" | "staff";
  /**
   * Server state. pending-approval = Beeliv is confirming (wait). active =
   * the SERVER confirmed completion (only then may the UI navigate).
   * suspended = access removed; show the gate, never the form.
   */
  state: "pending-setup" | "pending-approval" | "active" | "suspended";
  /** false = approved wording is not published; bodies are null and nothing can be accepted. */
  contentReady: boolean;
  /** Verified sign-in email, read-only. */
  email: string;
  fullName: string;
  phone: string;
  agreements: SetupAgreement[];
  /** Admin MFA is mandatory (L5); Client has none. The preview never fakes a verified factor. */
  mfa: { required: boolean; verified: boolean };
  /** Preview save marker: "saved on this device", never "saved to Beeliv". */
  savedOnDeviceAt: string | null;
}

export interface ProfileInput {
  fullName: string;
  phone: string;
}

/**
 * Result of setup-finish. Only `setup.state === "active"` means complete
 * ("only active means complete"): the UI navigates only then. A response that
 * is not active (pending-approval, suspended, still pending-setup) is shown
 * as that state, never remapped. The mock never returns ok:true by default.
 */
export type FinishResult = { ok: true; setup: AdminSetup } | { ok: false; reasons: string[]; setup?: AdminSetup };

/** auth-setup-wire.md mfa-status factor. Only a verified factor can be challenged. */
export interface MfaFactor {
  id: string;
  type: "totp";
  status: "verified" | "unverified";
  name: string | null;
}

/**
 * mfa-enroll response, NEW enrollments only. Keep it in component memory:
 * never persist, log or send it to analytics. qrCode may be raw SVG: render it
 * as an image, never inject it. Null fields = the preview has no real secret.
 */
export interface MfaEnrollment {
  factorId: string;
  qrCode: string | null;
  secret: string | null;
  uri: string | null;
}

export type SetupErrorCode =
  | "conflict"
  | "outcome_unknown"
  | "mfa_invalid"
  | "preview_unverifiable"
  | "unavailable"
  | "no_access"
  | "suspended"
  | "unauthenticated"
  | "mfa_required"
  | "rate_limited";

/** Safe, typed failure (shared-states.md envelope). `message` is the only text shown. */
export class SetupActionError extends Error {
  constructor(
    public code: SetupErrorCode,
    message: string,
    public supportRef?: string,
    /** rate_limited (429) retry timing from the server, in seconds. */
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "SetupActionError";
  }
}

/** Inline errors show safe text and retry timing; diagnostics stay out of the UI. */
export function setupErrorText(e: unknown, fallback = "We couldn't do that. Please try again."): string {
  if (!(e instanceof SetupActionError)) return fallback;
  const wait = e.retryAfterSeconds ? ` You can try again in ${e.retryAfterSeconds} second${e.retryAfterSeconds === 1 ? "" : "s"}.` : "";
  return `${e.message}${wait}`;
}

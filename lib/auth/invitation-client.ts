/**
 * Frontend adapter between the invitation screens and the typed rev-2 boundary
 * (docs/contracts/auth-invitation-wire.md). Client-side only.
 *
 * mode "live"    -> ONLY the real browser service. Failures stay failures; there is
 *                   no fixture fallback and no mock success in this mode.
 * mode "preview" -> the development fixtures in ./mock.ts, translated into the
 *                   SAME typed result shapes the live service returns, so the
 *                   screens are written once. Fixture tokens: valid-new,
 *                   valid-staff, valid-admin, valid-existing, expired, revoked,
 *                   used, bad. `?demo=fail` fails the first acceptance (outcome
 *                   unknown) and `?state=` previews the load failures (below).
 *
 * `?demo=unknown[-stays|-signedout|-limited|-unavailable]` (preview only) makes acceptance
 * end uncertain; "Check completion" then resolves per checkInvitationCompletion below.
 *
 * `?state=` (preview mode only, ignored when live):
 *   outage        every load fails with a temporary failure + support reference
 *   outage-once   first load fails, Retry works
 *   limited       load is rate limited (retry delay 15 s)
 *   malformed     unrecognised reply (also a temporary failure)
 */
import { acceptInvitation as acceptLive, getInvitationByToken as previewLive, reconcileInvitation as reconcileLive } from "./service";
import { acceptInvitation as acceptFixture, getInvitationByToken as previewFixture } from "./mock";
import type { InvitationAcceptResult, InvitationKind, InvitationPreviewResult } from "./invitation-wire";
import type { AuthMode } from "./mode";
import type { Portal } from "./types";
import { authFailure } from "./wire";

export type InviteInput = {
  portal: Portal;
  token: string;
  password: string;
  email?: string;
  profile?: { fullName: string; phone: string };
};

const ref = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000000");
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function loadInvitation(
  token: string,
  portal: Portal,
  mode: AuthMode,
  opts: { previewState?: string | null; attempt?: number } = {},
): Promise<InvitationPreviewResult> {
  if (mode === "live") return previewLive(token, portal);

  // ---- development fixtures ----
  const { previewState, attempt = 0 } = opts;
  await pause(250);
  if (previewState === "outage" || (previewState === "outage-once" && attempt === 0) || previewState === "malformed") {
    return authFailure({ reason: "unavailable", error: { supportRef: ref() } });
  }
  if (previewState === "limited") {
    return authFailure({ reason: "rate_limited", error: { retryAfterSeconds: 15, supportRef: ref() } });
  }
  const view = await previewFixture(token);
  if (view.state !== "valid-new-account" && view.state !== "valid-existing-account") {
    return { ok: true, preview: { state: "unavailable" } };
  }
  const kind: InvitationKind = view.kind === "admin" ? "internal" : view.kind;
  // Only what the live preview carries: no inviter, organisation or prefill.
  return { ok: true, preview: { state: view.state, kind, emailMasked: view.emailMasked } };
}

export async function submitInvitation(input: InviteInput, mode: AuthMode, demo?: string | null): Promise<InvitationAcceptResult> {
  if (mode === "live") return acceptLive(input);

  // ---- development fixtures ----
  const res = await acceptFixture(
    { token: input.token, password: input.password, email: input.email, profile: input.profile },
    demo,
  );
  // PREVIEW ONLY: `?demo=unknown*` makes acceptance end with an UNKNOWN outcome, every time
  // (the person must use "Check completion"; nothing is ever replayed for them).
  if (demo?.startsWith("unknown")) {
    return authFailure({ reason: "outcome_unknown", error: { supportRef: ref() } });
  }
  if (res.ok) {
    return { ok: true, status: "completed", kind: res.kind === "admin" ? "internal" : res.kind, destination: res.destination };
  }
  if (res.reason === "expired") return authFailure({ reason: "invitation_unavailable" });
  if (res.reason === "invalid_credentials") return authFailure({ reason: "invalid_credentials" });
  if (res.reason === "rate_limited") return authFailure({ reason: "rate_limited", error: { retryAfterSeconds: res.error.retryAfterSeconds } });
  // "failed" stands in for a timeout/5xx: the outcome is unknown, not "nothing changed".
  return authFailure({ reason: "outcome_unknown", error: { supportRef: ref() } });
}

/**
 * "Check completion": ask whether an uncertain acceptance actually went through.
 * It only OBSERVES: no password or profile is sent, nothing is replayed, no account
 * is created and no session is started. A used link alone proves nothing.
 *
 * mode "live"    -> ONLY the real reconcile action; there is no fixture success.
 * mode "preview" -> fixtures, chosen by the same `?demo=` that made acceptance uncertain:
 *   unknown            -> confirmed complete (success view)
 *   unknown-stays      -> still not observed
 *   unknown-signedout  -> signed out (guidance to sign in)
 *   unknown-limited    -> rate limited (15 s)
 *   unknown-unavailable-> temporary failure
 *   anything else      -> not observed (nothing was recorded in preview)
 */
export async function checkInvitationCompletion(
  input: { portal: Portal; token: string },
  mode: AuthMode,
  demo?: string | null,
): Promise<InvitationAcceptResult> {
  if (mode === "live") return reconcileLive(input);

  // ---- development fixtures ----
  await pause(700);
  switch (demo) {
    case "unknown": {
      // Derive the safe destination the same way a real acceptance would.
      const res = await acceptFixture({ token: input.token, password: "fixture" });
      if (!res.ok) return authFailure({ reason: "outcome_unknown", error: { supportRef: ref() } });
      return { ok: true, status: "completed", kind: res.kind === "admin" ? "internal" : res.kind, destination: res.destination };
    }
    case "unknown-signedout":
      return authFailure({ reason: "unauthenticated" });
    case "unknown-limited":
      return authFailure({ reason: "rate_limited", error: { retryAfterSeconds: 15, supportRef: ref() } });
    case "unknown-unavailable":
      return authFailure({ reason: "unavailable", error: { supportRef: ref() } });
    default:
      return authFailure({ reason: "outcome_unknown", error: { supportRef: ref() } });
  }
}

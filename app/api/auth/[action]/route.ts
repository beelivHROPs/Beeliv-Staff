import { randomUUID } from "node:crypto";
import { authFailure } from "@/lib/auth/wire";
import { readJson } from "@/lib/server/public-enquiries/handler";
import { acceptInvitation, AuthFailure, enforceOrigin, getSession, previewInvitation, reconcileInvitation, requestedApp, signIn, signOut } from "@/lib/server/auth/service";

import { getSetup, updateSetup, SetupFailure } from "@/lib/server/auth/setup";
import { adminMfa } from "@/lib/server/auth/mfa";
import { manageInvitation, listInvitations, type ManagementAction } from "@/lib/server/auth/invitation-management";
import { RateFailure } from "@/lib/server/auth/rate";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const supportRef = randomUUID();
  try {
    const { action } = await context.params;
    if (!["invite-create-draft","invite-edit-draft","invite-review","invite-send","invite-resend","invite-revoke","invite-replace","invite-status","invite-copy-link","invite-list","sign-in", "sign-out", "session", "invite-preview", "invite-accept", "invite-reconcile", "setup", "setup-profile", "setup-agreement", "setup-finish", "mfa-status", "mfa-enroll", "mfa-verify", "mfa-cancel-enrollment"].includes(action)) return Response.json({ ok: false }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    const input = await readJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthFailure("invalid_request");
    const app = requestedApp(input);
    enforceOrigin(request, app);
    let output: unknown;
    if (["invite-create-draft","invite-edit-draft","invite-review","invite-send","invite-resend","invite-revoke","invite-replace","invite-status","invite-copy-link"].includes(action)) output = await manageInvitation(action as ManagementAction,input);
    else if (action === "invite-list") output = await listInvitations(input);
    else if (action === "setup") output = await getSetup(app);
    else if (action === "setup-profile" || action === "setup-agreement" || action === "setup-finish") output = await updateSetup(app, action, input);
    else if (action === "mfa-status" || action === "mfa-enroll" || action === "mfa-verify" || action === "mfa-cancel-enrollment") output = await adminMfa(action, input);
    else output = action === "sign-in" ? await signIn(input) : action === "sign-out" ? await signOut(app) : action === "session" ? await getSession(app) : action === "invite-preview" ? await previewInvitation(app, input.token) : action === "invite-reconcile" ? await reconcileInvitation(input) : await acceptInvitation(input);
    return Response.json(output, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const inputError = error instanceof Error ? error.message : "";
    const failure = error instanceof AuthFailure || error instanceof SetupFailure ? error : error instanceof RateFailure ? new AuthFailure("rate_limited",429,error.retryAfterSeconds) : inputError === "too_large" ? new AuthFailure("invalid_request",413) : inputError === "unsupported_type" ? new AuthFailure("invalid_request",415) : inputError === "invalid_json" ? new AuthFailure("invalid_request",400) : new AuthFailure("unavailable", 503);
    const body = authFailure({ reason: failure.code, error: { supportRef, retryAfterSeconds: failure instanceof AuthFailure ? failure.retryAfterSeconds : undefined } });
    return Response.json(body, { status: failure.status, headers: { "Cache-Control": "private, no-store", ...(body.error.retryAfterSeconds ? { "Retry-After": String(body.error.retryAfterSeconds) } : {}) } });
  }
}



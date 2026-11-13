"use client";

import {
  answerSetupAgreement, cancelAdminMfaEnrollment, enrollAdminMfa,
  finishAccountSetup, getAccountSetup, getAdminMfaStatus, saveSetupProfile,
  verifyAdminMfa,
} from "@/lib/auth/service";
import type { AuthWireFailure } from "@/lib/auth/wire";
import type { SetupSummary } from "@/lib/auth/setup-wire";
import type { SetupAdapter } from "./adapter";
import { SetupActionError, type AdminSetup, type SetupErrorCode } from "./types";

type SetupPortal = "admin" | "client" | "staff";
type Transport = {
  getAccountSetup: typeof getAccountSetup;
  saveSetupProfile: typeof saveSetupProfile;
  answerSetupAgreement: typeof answerSetupAgreement;
  finishAccountSetup: typeof finishAccountSetup;
  getAdminMfaStatus: typeof getAdminMfaStatus;
  enrollAdminMfa: typeof enrollAdminMfa;
  verifyAdminMfa: typeof verifyAdminMfa;
  cancelAdminMfaEnrollment: typeof cancelAdminMfaEnrollment;
};
const browserTransport: Transport = {
  getAccountSetup, saveSetupProfile, answerSetupAgreement, finishAccountSetup,
  getAdminMfaStatus, enrollAdminMfa, verifyAdminMfa, cancelAdminMfaEnrollment,
};

/**
 * setup-finish refusals that only mean "not complete yet" (the server answers them before writing anything):
 * Staff stay setup_pending until an employment record and placement are checked by foreign key (docs/contracts/auth-setup-and-activation.md).
 */
const NOT_YET: ReadonlySet<string> = new Set(["setup_pending", "agreement_required", "setup_unavailable", "validation_failed"]);

function setupError(failure: AuthWireFailure): SetupActionError {
  const allowed: SetupErrorCode[] = [
    "conflict", "outcome_unknown", "mfa_invalid", "unavailable", "no_access",
    "suspended", "unauthenticated", "mfa_required", "rate_limited",
  ];
  const code: SetupErrorCode = allowed.includes(failure.reason as SetupErrorCode)
    ? failure.reason as SetupErrorCode : "unavailable";
  return new SetupActionError(code, failure.error.message, failure.error.supportRef, failure.error.retryAfterSeconds);
}

function toView(setup: SetupSummary, portal: SetupPortal): AdminSetup {
  // The transport parser validates the app; this second boundary protects an injected/stale result.
  if (setup.app !== (portal === "staff" ? "talent" : portal)) throw new SetupActionError("unavailable", "We couldn't check your account setup. Please reload.");
  return {
    revision: setup.revision, app: portal, state: setup.state,
    contentReady: setup.contentReady, email: setup.verifiedEmail,
    fullName: setup.fullName, phone: setup.phone,
    agreements: setup.agreements.map(a => ({
      id: a.id, title: a.title, version: a.version, body: a.body,
      bodyHash: a.bodyHash, required: a.required, response: a.response,
    })),
    mfa: { required: setup.mfaRequired, verified: setup.mfaVerified },
    savedOnDeviceAt: null,
  };
}

/** One instance per rendered setup screen. No local persistence or preview fallback. */
export function createLiveSetupAdapter(portal: SetupPortal, transport: Transport = browserTransport): SetupAdapter {
  let latest: SetupSummary | null = null;
  let writing = false;

  function remember(setup: SetupSummary): AdminSetup {
    const view = toView(setup, portal);
    latest = setup;
    return view;
  }
  function requireCurrent(): SetupSummary {
    if (!latest) throw new SetupActionError("unavailable", "Reload your account setup before trying again.");
    if (latest.state !== "pending-setup") throw new SetupActionError("no_access", "This account setup cannot be changed right now.");
    return latest;
  }
  async function write<T>(action: () => Promise<{ ok: true; setup: SetupSummary } | AuthWireFailure>, map: (setup: SetupSummary) => T): Promise<T> {
    if (writing) throw new SetupActionError("conflict", "Please wait for the current change to finish.");
    writing = true;
    try {
      const result = await action();
      if (!result.ok) throw setupError(result);
      return map(result.setup);
    } catch (error) {
      // A failed write may have committed. Require an explicit fresh read before another write.
      latest = null;
      throw error;
    } finally {
      writing = false;
    }
  }
  async function mfaWrite<T>(action: () => Promise<{ ok: true } | AuthWireFailure>, map: (result: { ok: true } & Record<string, unknown>) => T, invalidateSetup = false): Promise<T> {
    if (portal !== "admin") throw new SetupActionError("no_access", "This action is not available here.");
    if (writing) throw new SetupActionError("conflict", "Please wait for the current change to finish.");
    writing = true;
    try {
      const result = await action();
      if (!result.ok) throw setupError(result);
      // Verification changes current-session proof; the caller reloads setup before finishing.
      if (invalidateSetup) latest = null;
      return map(result as { ok: true } & Record<string, unknown>);
    } catch (error) {
      latest = null;
      throw error;
    } finally {
      writing = false;
    }
  }

  return {
    subscribe: () => () => {},
    async getSetup() {
      const result = await transport.getAccountSetup(portal);
      if (!result.ok) { latest = null; throw setupError(result); }
      return remember(result.setup);
    },
    saveProfile(input) {
      const current = requireCurrent();
      return write(
        () => transport.saveSetupProfile({ portal, expectedRevision: current.revision, fullName: input.fullName, phone: input.phone }),
        remember,
      );
    },
    respondAgreement(agreementId, accepted) {
      const current = requireCurrent();
      const agreement = current.agreements.find(a => a.id === agreementId);
      if (!agreement || !current.contentReady || !agreement.bodyHash)
        throw new SetupActionError("unavailable", "That agreement is not available. Reload your account setup.");
      return write(
        () => transport.answerSetupAgreement({ portal, expectedRevision: current.revision, agreementId, bodyHash: agreement.bodyHash, accepted }),
        remember,
      );
    },
    finish() {
      // Not async on purpose: a missing current read must fail at once (same as the other writes), before any request.
      const current = requireCurrent();
      return (async () => {
        if (writing) throw new SetupActionError("conflict", "Please wait for the current change to finish.");
        writing = true;
        try {
          const result = await transport.finishAccountSetup({ portal, expectedRevision: current.revision });
          if (!result.ok) {
            // "Not yet" answers are refusals made BEFORE any write (the SQL returns them ahead of its first update), so the
            // revision is unchanged and the person may check again. They are shown as reasons, never as a generic failure.
            if (NOT_YET.has(result.reason)) return { ok: false as const, reasons: [result.error.message] };
            throw setupError(result); // anything else may have committed: the catch below requires a fresh read
          }
          const view = remember(result.setup);
          return view.state === "active"
            ? { ok: true as const, setup: view }
            : { ok: false as const, reasons: [view.state === "pending-approval" ? "Your workspace is not active yet. Contact Beeliv for help with setup." : "Your account setup is not complete yet."], setup: view };
        } catch (error) {
          latest = null;
          throw error;
        } finally {
          writing = false;
        }
      })();
    },
    async mfaStatus() {
      if (portal !== "admin") throw new SetupActionError("no_access", "This action is not available here.");
      const result = await transport.getAdminMfaStatus();
      if (!result.ok) throw setupError(result);
      return result.factors.map(f => ({ id: f.id, type: f.type, status: f.status, name: f.name }));
    },
    mfaEnroll() {
      return mfaWrite(() => transport.enrollAdminMfa(), result => {
        const enrollment = result.enrollment as { factorId: string; qrCode: string; secret: string; uri: string };
        return enrollment;
      });
    },
    mfaVerify(factorId, code) {
      return mfaWrite(() => transport.verifyAdminMfa({ factorId, code }), () => undefined, true);
    },
    mfaCancel(factorId) {
      return mfaWrite(() => transport.cancelAdminMfaEnrollment(factorId), () => undefined);
    },
  };
}

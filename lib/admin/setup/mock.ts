/**
 * DEV FIXTURE for the setup request (Admin, Client and Staff share the same wire
 * shapes: setup / setup-profile / setup-agreement / setup-finish). LOCAL PREVIEW
 * ONLY, never used in production. Agreements mirror the versions published in the
 * real database (published-agreements.ts, verbatim from M12); Client has none, so
 * Client finish stays blocked exactly as it does for real. Values are kept on this
 * device (localStorage), never sent to Beeliv. Finish succeeds here only when every
 * check the real server makes is met; real activation is always server-decided.
 */
import { PUBLISHED_AGREEMENTS } from "./published-agreements";
import { type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { SetupAdapter } from "./adapter";
import { getDemo } from "../../dev-demo";
import { type AdminSetup, type FinishResult, type MfaFactor, SetupActionError, type SetupAgreement } from "./types";

type SetupApp = "admin" | "client" | "staff";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

async function gate(ms: number) {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  await sleep(ms);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
}

// The preview shows exactly the agreements PUBLISHED in the real database (M12), copied verbatim.
// Client has none: Beeliv has not supplied Client wording, so Client setup cannot finish (same as real).
const keyFor = (app: SetupApp) => `bv-${app}-setup-mock`;
type Stored = { fullName?: string; phone?: string; revision?: number; savedAt?: string; responses?: Record<string, boolean>; mfaVerified?: boolean; finished?: boolean };

/**
 * DEV demo switch (?demo=, server-decided, see lib/dev-demo.ts): conflict |
 * unknown | pending-approval | suspended | rate-limited | content-ready |
 * mfa-enrolled | mfa-pending. Demos only show blocked or waiting states; none
 * can succeed. Conflict / unknown / rate-limited fire once per page load.
 */
let oneShotUsed = false;
const cancelled = new Set<string>();
function failOnce(kind: "conflict" | "unknown" | "rate-limited") {
  if (getDemo() !== kind || oneShotUsed) return;
  oneShotUsed = true;
  if (kind === "conflict") throw new SetupActionError("conflict", "This was changed by someone else just now.");
  if (kind === "rate-limited") throw new SetupActionError("rate_limited", "Too many tries.", "SUP-PREVIEW-0002", 20);
  throw new SetupActionError("outcome_unknown", "We could not confirm completion.", "SUP-PREVIEW-0001");
}

export function createMockSetupAdapter(app: SetupApp): SetupAdapter {
  const KEY = keyFor(app);
  function read(): Stored {
    if (typeof window === "undefined") return {};
    try {
      return (JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Stored | null) ?? {};
    } catch {
      return {};
    }
  }
  function write(patch: Stored) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
    } catch {
      // Keep going; the preview just won't survive a reload.
    }
  }

  function build(): AdminSetup {
    const s = read();
    const demo = getDemo();
    const agreements: SetupAgreement[] = PUBLISHED_AGREEMENTS[app].map((a) => ({
      id: `preview-${app}-${a.code}`,
      title: a.title,
      version: "1.0",
      body: a.body,
      bodyHash: null,
      required: a.required,
      response: s.responses?.[`preview-${app}-${a.code}`] ?? null,
    }));
    return {
      revision: s.revision ?? 1,
      app,
      state: demo === "pending-approval" ? "pending-approval" : demo === "suspended" ? "suspended" : s.finished ? "active" : "pending-setup",
      contentReady: agreements.every((a) => a.body !== null),
      email: "invited-address@example.invalid",
      fullName: s.fullName ?? "",
      phone: s.phone ?? "",
      agreements,
      mfa: { required: app === "admin", verified: s.mfaVerified === true },
      savedOnDeviceAt: s.savedAt ?? null,
    };
  }

  return {
    subscribe(l) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    async getSetup() {
      await gate(300);
      return build();
    },
    async saveProfile(input) {
      await sleep(350);
      failOnce("conflict");
      failOnce("unknown");
      failOnce("rate-limited");
      write({ ...input, revision: (read().revision ?? 1) + 1, savedAt: new Date().toISOString() });
      return build();
    },
    async respondAgreement(id, accepted) {
      await sleep(250);
      failOnce("conflict");
      const a = build().agreements.find((x) => x.id === id);
      // Absent content is never submitted.
      if (!a || a.body === null) throw new SetupActionError("unavailable", "Beeliv has not published this wording yet, so it cannot be accepted.");
      write({ responses: { ...read().responses, [id]: accepted }, revision: (read().revision ?? 1) + 1 });
      return build();
    },
    async finish(): Promise<FinishResult> {
      await sleep(400);
      failOnce("conflict");
      failOnce("unknown");
      failOnce("rate-limited");
      const s = build();
      const reasons: string[] = [];
      if (!s.fullName.trim()) reasons.push("Add your full name.");
      if (!/^\+[1-9]\d{7,14}$/.test(s.phone)) reasons.push("Add your phone number with its country code.");
      for (const a of s.agreements.filter((x) => x.required)) {
        if (a.body === null) reasons.push(`${a.title} is not available yet.`);
        else if (a.response !== true) reasons.push(`Accept ${a.title}.`);
      }
      if (s.mfa.required && !s.mfa.verified) reasons.push("Set up and verify your authenticator app. It is required for Admin access.");
      if (s.agreements.length === 0) reasons.push("Beeliv has not published the agreements for this account yet, so setup can't be completed. Please contact Beeliv.");
      // LOCAL PREVIEW ONLY (this adapter never runs in production): when everything the real server checks is satisfied,
      // finish succeeds so the whole flow can be walked through. Real activation is always decided by the server.
      if (reasons.length === 0) { write({ finished: true }); return { ok: true, setup: build() }; }
      return { ok: false, reasons, setup: s };
    },
    async mfaStatus() {
      await sleep(250);
      const demo = getDemo();
      const factors: MfaFactor[] =
        demo === "mfa-enrolled" || read().mfaVerified
          ? [{ id: "preview-verified-1", type: "totp", status: "verified", name: "Authenticator app" }]
          : demo === "mfa-pending"
            ? [{ id: "preview-pending-1", type: "totp", status: "unverified", name: null }]
            : [];
      return factors.filter((f) => !cancelled.has(f.id));
    },
    async mfaEnroll() {
      await sleep(350);
      // No real secret exists in a preview: the screen shows labelled placeholders.
      return { factorId: "preview-enrollment", qrCode: null, secret: null, uri: null };
    },
    async mfaVerify(_factorId, code) {
      await sleep(400);
      if (!/^\d{6}$/.test(code)) throw new SetupActionError("mfa_invalid", "Enter the six-digit code from your authenticator app.");
      // LOCAL PREVIEW ONLY: no authenticator provider exists here, so any six digits complete the step. Live mode checks the real code.
      write({ mfaVerified: true });
    },
    async mfaCancel(factorId) {
      await sleep(250);
      cancelled.add(factorId);
    },
  };
}

export const mockSetupAdapter: SetupAdapter = createMockSetupAdapter("admin");
export const mockClientSetupAdapter: SetupAdapter = createMockSetupAdapter("client");
export const mockStaffSetupAdapter: SetupAdapter = createMockSetupAdapter("staff");

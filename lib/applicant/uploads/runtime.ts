/**
 * Browser wiring for the upload adapter: which transport is used, the prototype scenario switch,
 * the single shared controller, and the final-submit gate.
 *
 * Transport choice (UPLOADS-003):
 *   1. one injected with setUploadTransport() (the integrator's job once Codex names the routes);
 *   2. otherwise, in server-decided preview mode only (data-bv-demo="on"): the mock transport;
 *   3. otherwise: the "unavailable" transport, so the UI says uploads are not available. Never a fake success.
 *
 * Prototype switch (preview mode only): open any Applicant page with ?uploads=<scenario>, for example
 * /applicant/apply/...?uploads=put-network. One scenario for all three slots, or per slot:
 * ?uploads=cv:stall,passport-photo:ok,valid-id:scan-rejected. The choice is kept for the tab in
 * sessionStorage; ?uploads=ok resets it. Scenario names are in mock-transport.ts.
 */
import { demoFilesEnabled } from "@/lib/demo-files/store";
import { createUploadController, type UploadController } from "./controller";
import { createMockTransport, isMockScenario, type MockScenario, type MockTransport } from "./mock-transport";
import { createUnavailableTransport, type UploadTransport } from "./transport";
import { UPLOAD_SLOTS, type UploadSlot } from "./types";

const SCENARIO_KEY = "bv-upload-scenario-v1";

let injected: UploadTransport | null = null;
let mock: MockTransport | null = null;
let unavailable: UploadTransport | null = null;
let controller: UploadController | null = null;

/** Give the adapter its real transport. Pass null to go back to the defaults. */
export function setUploadTransport(t: UploadTransport | null) {
  injected = t;
}

/** Parses "ok" or "cv:stall,valid-id:ok". Unknown names are ignored. */
export function parseScenarioSwitch(raw: string | null): MockScenario | Partial<Record<UploadSlot, MockScenario>> | null {
  if (!raw) return null;
  const v = raw.trim();
  if (isMockScenario(v)) return v;
  const out: Partial<Record<UploadSlot, MockScenario>> = {};
  for (const part of v.split(",")) {
    const [slot, name] = part.split(":");
    if ((UPLOAD_SLOTS as readonly string[]).includes(slot) && isMockScenario(name)) out[slot as UploadSlot] = name;
  }
  return Object.keys(out).length ? out : null;
}

function readSwitch(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get("uploads");
    if (q) {
      window.sessionStorage.setItem(SCENARIO_KEY, q);
      return q;
    }
    return window.sessionStorage.getItem(SCENARIO_KEY);
  } catch {
    return null;
  }
}

function resolveTransport(): UploadTransport {
  if (injected) return injected;
  if (typeof window !== "undefined" && demoFilesEnabled()) {
    mock ??= createMockTransport();
    mock.setScenario(parseScenarioSwitch(readSwitch()) ?? "ok");
    return mock;
  }
  unavailable ??= createUnavailableTransport();
  return unavailable;
}

/** The one controller for the page. Uploads keep running while the person changes steps. */
export function getUploadController(): UploadController {
  controller ??= createUploadController({ getTransport: resolveTransport, pollMs: 3000 });
  return controller;
}

/**
 * Final application submit. Stays CLOSED until all of these exist on the server: required CV, passport
 * photo and valid ID that passed checks, real required-test evidence, and one atomic submission
 * (docs/contracts/application-submit-boundary.md). Flipping this needs the applications backend, not a UI change.
 */
export function applicationSubmitAvailable(): boolean {
  return false;
}

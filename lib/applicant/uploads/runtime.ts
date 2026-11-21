/** Preview scenario parser and the separately gated application submit decision. */
import { isMockScenario, type MockScenario } from "./mock-transport";
import { UPLOAD_SLOTS, type UploadSlot } from "./types";
import { liveApplicationsOn } from "../service";

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

/**
 * Submit is open only for real applicants whose deployment has the applications backend on
 * (lib/applicant/service.ts live mode). Preview/sample mode stays closed: it never fakes a sent application.
 * The server still checks the three scan-clean documents and every other rule at submit.
 */
export function applicationSubmitAvailable(): boolean {
  return liveApplicationsOn();
}

import { sendEnquiry } from "./enquiry-client";
export type NeedId = "recruitment" | "training" | "systems" | "audit" | "unsure";

/** The payload the backend receives: trimmed, typed, only for the selected needs. */
export type RequestInput = {
  business: {
    name: string;
    outlet: string | null;
    location: string;
  };
  needs: NeedId[];
  /** Present only when "Build my team" is selected. */
  recruitment: {
    roles: string;
    headcount: number;
    location: string;
    /** ISO date (yyyy-mm-dd), or null when left blank. */
    targetStartDate: string | null;
  } | null;
  /** Present only when "Train my team" is selected. */
  training: {
    teamSize: number;
    topics: string;
  } | null;
  /** Free text for the needs with no drawn field list (systems / audit / not sure). */
  details: string | null;
  contact: {
    name: string;
    jobTitle: string | null;
    email: string;
    phone: string;
    bestTimeToCall: string | null;
  };
};

export type RequestOk = {
  ok: true;
  /** True only when the server confirms persistence. */
  backendConnected: boolean;
  /** Human reference for the received screen (e.g. "BLV-0231"); null until real. */
  reference: string | null;
  /** Human-readable note for the flow-test banner. */
  notice: string;
};

export type RequestFailure = {
  ok: false;
  code: "network" | "rate-limited" | "unknown";
  message: string;
};

export type RequestResult = RequestOk | RequestFailure;

export const REQUEST_BACKEND_CONNECTED: boolean = true;
export const REQUEST_NOT_CONNECTED = "Enquiries are temporarily unavailable. Please try again later.";
export async function submitRequest(input: RequestInput): Promise<RequestResult> {
  const result = await sendEnquiry("service_request", input);
  if (result.ok) return { ok: true, backendConnected: true, reference: result.reference, notice: result.notice };
  return { ok: false, code: result.code === "rate_limited" ? "rate-limited" : result.code === "network" ? "network" : "unknown", message: result.message };
}

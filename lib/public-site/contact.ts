import { sendEnquiry } from "./enquiry-client";
export type ContactInput = { kind: "work" | "other"; name: string; email: string; phone: string; role: string | null; message: string; hasCv: boolean; consent: boolean };
export type ContactOk = { ok: true; backendConnected: boolean; notice: string; reference?: string };
export type ContactFailure = { ok: false; message: string };
export type ContactResult = ContactOk | ContactFailure;
/** HTTP transport is connected; persistence still requires approved schema and server configuration. */
export const CONTACT_BACKEND_CONNECTED: boolean = true;
export const CONTACT_NOT_CONNECTED = "Enquiries are temporarily unavailable. Please try again later.";
export async function submitContact(input: ContactInput): Promise<ContactResult> {
  const result = await sendEnquiry("contact", input);
  return result.ok ? { ok: true, backendConnected: true, notice: result.notice, reference: result.reference } : { ok: false, message: result.message };
}

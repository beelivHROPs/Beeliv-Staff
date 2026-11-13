/** Browser transport only; no database keys and no simulated success. */
export type EnquiryResponse = { ok: true; reference: string; notice: string } | { ok: false; code: string; message: string; fields?: Record<string, string>; retryAfterSeconds?: number; supportRef?: string };
const keys = new Map<string, string>();
export async function sendEnquiry(kind: "contact" | "service_request", data: unknown): Promise<EnquiryResponse> {
  try {
    const body = JSON.stringify({ kind, data });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    // Reuse the key across retries/refreshes without persisting the message or email.
    let key = keys.get(hash);
    try { key ??= sessionStorage.getItem(`beeliv-enquiry-${hash}`) ?? undefined; } catch { /* Memory still covers same-page retries. */ }
    key ??= crypto.randomUUID();
    keys.set(hash, key);
    try { sessionStorage.setItem(`beeliv-enquiry-${hash}`, key); } catch { /* Storage is optional. */ }
    const response = await fetch("/api/public/enquiries", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body, signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (response.ok && result.ok === true && typeof result.reference === "string") {
      // Keep the key across uncertain outcomes, but a confirmed save ends this submission cycle.
      keys.delete(hash);
      try { sessionStorage.removeItem(`beeliv-enquiry-${hash}`); } catch { /* Storage is optional. */ }
      return { ok: true, reference: result.reference, notice: result.notice ?? "Your enquiry has been saved." };
    }
    const error = result.error ?? {};
    const wait = typeof error.retryAfterSeconds === "number" ? ` Try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).` : "";
    return { ok: false, code: error.code ?? "unavailable", message: (error.fields?.cv ?? error.message ?? "We could not confirm completion. Please retry.") + wait, fields: error.fields, retryAfterSeconds: error.retryAfterSeconds, supportRef: error.supportRef };
  } catch {
    return { ok: false, code: "network", message: "We could not confirm that your enquiry was saved. Your details have been kept; please retry." };
  }
}

import type { AuthFailure, EmailLinkParams, SignupInput } from "../public-site/auth";

type SignupReply = { ok: true; destination?: "/login"; confirmed?: boolean } | AuthFailure;
type RequestInput = Pick<SignupInput, "fullName" | "email" | "phone" | "password" | "acceptedTerms">;
type Action = "request" | "resend" | "confirm";
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const INVALID: AuthFailure = { ok: false, code: "link-invalid", message: "This verification link is not valid. Request a new link or log in if your email is already confirmed." };
function failed(reason: unknown, status: number, retry: unknown): AuthFailure {
  const code: AuthFailure["code"] = status === 429 || reason === "rate_limited" ? "rate-limited"
    : reason === "weak_password" ? "weak-password" : reason === "link_expired" || reason === "otp_expired" ? "link-expired"
    : reason === "link_invalid" ? "link-invalid" : reason === "registration_incomplete" ? "registration-incomplete" : "unknown";
  const message = code === "rate-limited" ? "Too many attempts. Please wait before trying again."
    : code === "weak-password" ? "Use a password with at least 8 characters and a number."
    : code === "link-expired" ? "This verification link has expired. Request a new link."
    : code === "link-invalid" ? INVALID.message
    : code === "registration-incomplete" ? "Your email is confirmed. Return to signup and enter your details to finish creating your account." : "We could not complete this request. Check the details or try again in a moment.";
  const delay = typeof retry === "number" && Number.isFinite(retry) ? Math.max(1, Math.min(3600, Math.ceil(retry))) : undefined;
  return { ok: false, code, message, ...(delay ? { retryAfterSeconds: delay } : {}) };
}
async function post(action: Action, input: Record<string, unknown>, fetcher: typeof fetch): Promise<SignupReply> {
  try {
    const response = await fetcher("/api/auth/signup", {
      method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, action, portal: "talent" }), signal: AbortSignal.timeout(15000),
    });
    const value: unknown = await response.json();
    if (response.ok && plain(value) && value.ok === true) {
      // Confirmation never authorizes a browser-supplied redirect or starts a business session.
      if (action === "confirm") return value.destination === "/login" ? { ok: true, destination: "/login" } : failed("unavailable", 503, undefined);
      if (action === "request" && value.confirmed === true) return value.destination === "/login" ? { ok: true, confirmed: true, destination: "/login" } : failed("unavailable", 503, undefined);
      return { ok: true };
    }
    const body = plain(value) ? value : {};
    const error = plain(body.error) ? body.error : {};
    const retry = body.retryAfterSeconds ?? error.retryAfterSeconds ?? Number(response.headers.get("Retry-After") || NaN);
    return failed(body.reason ?? error.code, response.status, retry);
  } catch {
    return { ok: false, code: "network", message: "We could not confirm completion. Check your connection before trying again." };
  }
}
/** Only Applicant profile and consent fields are transmitted; role, job and destination hints are excluded. */
export function requestApplicantSignup(input: RequestInput, fetcher: typeof fetch = fetch): Promise<SignupReply> {
  return post("request", { fullName: input.fullName, email: input.email, phone: input.phone, password: input.password, acceptedTerms: input.acceptedTerms }, fetcher);
}
export function resendApplicantConfirmation(email: string, fetcher: typeof fetch = fetch): Promise<SignupReply> {
  return post("resend", { email }, fetcher);
}
export function confirmApplicantEmail(link: EmailLinkParams | null, fetcher: typeof fetch = fetch): Promise<SignupReply> {
  if (link?.errorCode) return Promise.resolve(failed(link.errorCode === "otp_expired" ? "link_expired" : "link_invalid", 400, undefined));
  if (!link || link.credentialFormat !== "fragment-token" || link.code || link.type !== "signup" || !link.tokenHash || !/^[A-Za-z0-9_-]{20,512}$/.test(link.tokenHash)) return Promise.resolve({ ...INVALID });
  return post("confirm", { tokenHash: link.tokenHash, type: "signup" }, fetcher);
}

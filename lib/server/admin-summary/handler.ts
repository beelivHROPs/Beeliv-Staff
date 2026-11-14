import { getAdminSummary, type SummaryDependencies, type SummaryCode } from "./service";
const HEADERS = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
const STATUS: Record<SummaryCode, number> = { unavailable: 503, unauthenticated: 401, forbidden: 403, rate_limited: 429 };
const MESSAGES: Record<SummaryCode, string> = { unavailable: "Summary is temporarily unavailable.", unauthenticated: "Sign in to continue.", forbidden: "You do not have access to this.", rate_limited: "Too many requests. Please wait before trying again." };
export function summaryFailure(code: SummaryCode): Response {
  return Response.json({ ok: false, error: { code, message: MESSAGES[code] } }, { status: STATUS[code], headers: { ...HEADERS, ...(code === "rate_limited" ? { "Retry-After": "300" } : {}) } });
}
export async function handleAdminSummary(request: Request, deps: SummaryDependencies, origin: string): Promise<Response> {
  if (!deps.enabled) return summaryFailure("unavailable");
  // Browser same-origin GETs need not carry Origin. Refuse cross-site or wrong-host requests.
  const suppliedOrigin = request.headers.get("origin");
  if (request.method !== "GET" || !origin || new URL(request.url).origin !== origin || suppliedOrigin !== null && suppliedOrigin !== origin || request.headers.get("sec-fetch-site") === "cross-site" || new URL(request.url).search) return summaryFailure("forbidden");
  try {
    const result = await getAdminSummary(deps);
    return result.ok ? Response.json(result, { headers: HEADERS }) : summaryFailure(result.code);
  } catch { return summaryFailure("unavailable"); }
}


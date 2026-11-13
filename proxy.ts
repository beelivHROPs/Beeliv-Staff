import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/lib/server/auth/config";
import { parseSetup } from "@/lib/auth/setup-wire";
import { canVisit, readAccess, type AuthApp } from "@/lib/server/auth/policy";
import { RateFailure, rejectRpcRateLimit } from "@/lib/server/auth/rate";

const publicSegments = new Set(["login","invite","forgot-password","reset-password","access-denied","account-suspended","first-setup"]);
/**
 * Page visits (a browser asking for HTML) get the designed "temporarily unavailable" screen, rewritten so the URL stays
 * the same and the status code is kept. API / script requests keep the short JSON answer.
 */
function blocked(request: NextRequest, status: number, error: string, extra: Record<string, string> = {}) {
  const headers = { "Cache-Control": "private, no-store", ...extra };
  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) return NextResponse.rewrite(new URL("/unavailable", request.url), { status, headers });
  return NextResponse.json({ error }, { status, headers });
}
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const first = path.split("/")[1];
  const app: AuthApp = first === "client" ? "client" : first === "admin" ? "admin" : "talent";
  const next = () => {
    const forwarded = new Headers(request.headers);
    // Overwrite hostile values; never forward the raw invitation token/path.
    forwarded.set("x-beeliv-staff-surface", first === "staff" && publicSegments.has(path.split("/")[2]) ? "public-auth" : "protected");
    return NextResponse.next({ request: { headers: forwarded } });
  };
  if (publicSegments.has(path.split("/")[2])) return next();
  // Preserve authorised development design previews while schema is pending; never bypass in production.
  if (process.env.AUTH_BACKEND_ENABLED !== "true" && process.env.NODE_ENV !== "production") return next();
  let response = next();
  response.headers.set("Cache-Control", "private, no-store");
  try {
    const config = authConfig(app);
    if (request.nextUrl.origin !== config.origin) return blocked(request, 403, "This area is not available.");
    const persist = request.cookies.get(config.rememberName)?.value === "true";
    const client = createServerClient(config.url, config.key, {
      cookieOptions: { name: config.cookieName, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          for (const { name, value } of values) request.cookies.set(name, value);
          response = next();
          response.headers.set("Cache-Control", "private, no-store");
          for (const { name, value, options } of values) response.cookies.set(name, value, { ...options, domain: undefined, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", ...(value ? { maxAge: persist ? 60*60*24*30 : undefined, expires: undefined } : {}) });
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || !data.user.email_confirmed_at) {
      const login = app === "talent" ? "/login" : `/${app}/login`;
      const redirect = NextResponse.redirect(new URL(`${login}?next=${encodeURIComponent(path+request.nextUrl.search)}`, config.origin));
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      redirect.headers.set("Cache-Control", "private, no-store");
      return redirect;
    }
    const { data: context, error: contextError } = await client.rpc("auth_access_context", { p_app: app });
    if (contextError) throw new Error("unavailable");
    rejectRpcRateLimit(context);
    if (!canVisit(readAccess(context, app), path)) {
      const { data: rawSetup, error: setupError } = await client.rpc("auth_setup_context", { p_app: app });
      if (setupError) throw new Error("unavailable");
      rejectRpcRateLimit(rawSetup);
      const setup = parseSetup({ ok: true, setup: rawSetup }, app);
      if (setup.ok && setup.setup.state !== "suspended") {
        const setupPath = app === "admin" ? "/admin/setup" : app === "client" ? "/client/setup" : "/staff";
        const ownSetupPath = app === "talent" ? "/staff/setup" : setupPath;
        if (path === setupPath || path === ownSetupPath || path.startsWith(ownSetupPath + "/") || (app === "talent" && path === "/staff/documents")) return response;
        const redirect = NextResponse.redirect(new URL(setupPath, config.origin));
        for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
        redirect.headers.set("Cache-Control", "private, no-store");
        return redirect;
      }
      return blocked(request, 403, "This area is not available.");
    }
    return response;
  } catch (error) {
    if (error instanceof RateFailure) return blocked(request, 429, "Please wait before trying again.", { "Retry-After": String(error.retryAfterSeconds) });
    return blocked(request, 503, "This area is temporarily unavailable.");
  }
}
export const config = { matcher: ["/applicant/:path*", "/staff/:path*", "/client/:path*", "/admin/:path*"] };


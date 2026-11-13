import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authConfig } from "./config";
import type { AuthApp } from "./policy";

export async function sessionClient(app: AuthApp, remember?: boolean, readOnly = false) {
  const config = authConfig(app);
  const store = await cookies();
  const persist = remember ?? store.get(config.rememberName)?.value === "true";
  return createServerClient(config.url, config.key, {
    cookieOptions: { name: config.cookieName, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => {
        // Server Components cannot write cookies; proxy/route handlers own refresh persistence.
        if (readOnly) return;
        for (const { name, value, options } of values) store.set(name, value, { ...options, domain: undefined, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", ...(value ? { maxAge: persist ? 60 * 60 * 24 * 30 : undefined, expires: undefined } : {}) });
        if (remember !== undefined) store.set(config.rememberName, String(remember), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
      },
    },
  });
}
export function adminClient(app: AuthApp) {
  const config = authConfig(app); const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret?.startsWith("sb_secret_")) throw new Error("auth_unconfigured");
  return createClient(config.url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

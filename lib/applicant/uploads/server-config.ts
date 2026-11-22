import "server-only";
import { createHmac } from "node:crypto";
import { authConfig } from "@/lib/server/auth/config";
import { sessionClient } from "@/lib/server/auth/session";

export type UploadProviderConfig =
  | { mode: "live"; storageOrigin: string; sessionScope: string }
  | { mode: "preview" }
  | { mode: "unavailable" };

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const READY = ["PRIVATE_DOCUMENTS_BACKEND_ENABLED", "PRIVATE_DOCUMENTS_SCHEMA_READY", "PRIVATE_DOCUMENTS_STORAGE_READY", "PRIVATE_DOCUMENTS_SCANNER_READY"] as const;
const PRODUCTION_STORAGE_ORIGIN = "https://lrkeihyqeuuxscmjxtqn.supabase.co";

/** Server decides preview/live/unavailable. Scope reveals neither UID nor session ID. */
export async function applicantUploadConfig(preview: boolean): Promise<UploadProviderConfig> {
  if (preview && process.env.NODE_ENV !== "production") return { mode: "preview" };
  if (!READY.every(name => process.env[name] === "true")) return { mode: "unavailable" };
  try {
    const configured = authConfig("talent");
    if (process.env.NODE_ENV === "production" && configured.url !== PRODUCTION_STORAGE_ORIGIN) return { mode: "unavailable" };
    const secret = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 32) return { mode: "unavailable" };
    const client = await sessionClient("talent", undefined, true);
    const { data, error } = await client.auth.getClaims();
    const claims = data?.claims;
    if (error || typeof claims?.sub !== "string" || !UUID.test(claims.sub) || typeof claims.session_id !== "string" || !UUID.test(claims.session_id)
      || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000) return { mode: "unavailable" };
    const sessionScope = createHmac("sha256", secret).update("applicant-upload-session-v1\0").update(claims.sub).update("\0").update(claims.session_id).digest("hex");
    return { mode: "live", storageOrigin: configured.url, sessionScope };
  } catch { return { mode: "unavailable" }; }
}

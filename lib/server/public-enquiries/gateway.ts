import "server-only";
import type { EnquiryDependencies, Receipt, Submission } from "./handler";

export function getEnquiryDependencies(): EnquiryDependencies {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const rateLimitSecret = process.env.PUBLIC_ENQUIRY_RATE_LIMIT_SECRET;
  const origins = (process.env.PUBLIC_ENQUIRY_ORIGINS ?? "").split(",").map(v => v.trim()).filter(Boolean);
  if (!url || !secret || !rateLimitSecret || rateLimitSecret.length < 32 || !origins.length || process.env.PUBLIC_ENQUIRIES_ENABLED !== "true") throw new Error("unconfigured");
  const project = new URL(url);
  if (project.protocol !== "https:" || !project.hostname.endsWith(".supabase.co") || project.pathname !== "/" || project.username || project.password || project.search || project.hash) throw new Error("unconfigured");
  if (!secret.startsWith("sb_secret_")) throw new Error("unconfigured");
  for (const origin of origins) if (new URL(origin).origin !== origin) throw new Error("unconfigured");
  return {
    origins,
    rateLimitSecret,
    async save(submission: Submission): Promise<Receipt> {
      const response = await fetch(`${project.origin}/rest/v1/rpc/submit_public_enquiry`, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
        headers: { apikey: secret, "Content-Type": "application/json" },
        body: JSON.stringify({ p_key: submission.idempotencyKey, p_kind: submission.kind, p_payload: submission.payload, p_payload_hash: submission.payloadHash, p_subject_hash: submission.subjectHash }),
      });
      if (!response.ok) throw new Error("upstream_unavailable");
      const result: unknown = await response.json();
      if (!result || typeof result !== "object") throw new Error("invalid_response");
      const r = result as Record<string, unknown>;
      if (r.ok === true && typeof r.reference === "string" && /^BLV-ENQ-\d{4}-\d{6,}$/.test(r.reference)) return { ok: true, reference: r.reference };
      if (r.ok === false && r.code === "conflict") return { ok: false, code: "conflict" };
      if (r.ok === false && r.code === "rate_limited" && typeof r.retryAfterSeconds === "number" && Number.isFinite(r.retryAfterSeconds) && r.retryAfterSeconds > 0 && r.retryAfterSeconds <= 900) return { ok: false, code: "rate_limited", retryAfterSeconds: Math.ceil(r.retryAfterSeconds) };
      throw new Error("invalid_response");
    },
  };
}

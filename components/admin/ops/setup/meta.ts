/** Setup route slugs. Lives outside the client component so the server page can use it. */
export const SETUP_HREF = "/admin/ops/setup";
export const SETUP_SLUGS = ["company", "invitations", "approvals", "notifications", "roles"] as const;
export type SetupSlug = (typeof SETUP_SLUGS)[number];
export const isSetupSlug = (v: string): v is SetupSlug => (SETUP_SLUGS as readonly string[]).includes(v);

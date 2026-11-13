"use client";

import { seedLiveAdminIdentity, type AdminIdentityId } from "@/lib/admin/ops/identity";

/**
 * Hands the SERVER-verified Admin role to the browser before the shell renders, so the menu, route guard and
 * Home match the signed-in person instead of the prototype default (HR officer). Rendered above AdminShell by
 * app/admin/(business)/layout.tsx only when the real auth backend is live. Seeding happens during render
 * (idempotent, browser-only), so children read the real role on their first client render.
 */
export function AdminLiveIdentity({ id }: { id: AdminIdentityId }) {
  seedLiveAdminIdentity(id);
  return null;
}

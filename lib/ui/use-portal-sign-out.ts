"use client";

import { useRouter } from "next/navigation";
import { confirmAction, type ConfirmOptions } from "@/components/applicant/ConfirmDialog";
import { toast } from "@/components/ui/toast";
import { authPaths } from "@/lib/auth/portals";
import { signOut } from "@/lib/auth/service";
import type { Portal } from "@/lib/auth/types";
import { useAuthLive } from "./auth-live";

/**
 * Shared sign-out for the four shells.
 *  - Preview/mock mode (auth backend not live): unchanged, confirm then router.push("/").
 *  - Live mode: confirm, then end the real session via signOut(portal); only navigate to that app's
 *    sign-in page after the server confirms. On failure show an error toast and offer a retry dialog;
 *    never pretend success.
 */
export function usePortalSignOut(portal: Portal, confirm: ConfirmOptions, ask: (o: ConfirmOptions) => Promise<boolean> = confirmAction) {
  const router = useRouter();
  const live = useAuthLive();
  return async () => {
    if (!(await ask(confirm))) return;
    if (!live) {
      router.push("/");
      return;
    }
    for (;;) {
      const result = await signOut(portal);
      if (result.ok) {
        // Hard navigation so no client-side state from the ended session survives.
        window.location.assign(authPaths(portal).loginPath);
        return;
      }
      toast.add({ type: "error", title: "Couldn't sign you out", description: "You are still signed in. Check your connection and try again." });
      const retry = await ask({ ...confirm, title: "We couldn't sign you out", description: "You are still signed in. Try again?", confirmLabel: "Try again", cancelLabel: "Stay signed in" });
      if (!retry) return;
    }
  };
}

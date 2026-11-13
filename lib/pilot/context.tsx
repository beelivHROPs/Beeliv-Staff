"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isPilotHiddenRoute } from "./menu";

/**
 * Carries the server-decided pilot-menu flag to the client menus, search and Home cards. The value comes from the
 * (business) layouts (lib/pilot/server.ts); the browser never decides it. Default is OFF so a component rendered
 * outside a provider (tests, previews) behaves as before.
 */
const PilotMenuContext = createContext(false);

export function usePilotMenu(): boolean {
  return useContext(PilotMenuContext);
}

/** True when the pilot menu is on AND this route/href is a later-stage screen. */
export function usePilotHidden(): (hrefOrPath: string) => boolean {
  const on = usePilotMenu();
  return useCallback((h: string) => on && isPilotHiddenRoute(h), [on]);
}

const COOKIE = "bv_pilot_menu";

/** LOCAL ONLY (the server renders it only when BEELIV_ENV is local): ?pilot=on|off|default sets a cookie the server reads. */
function PilotDevSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("pilot");
    if (v !== "on" && v !== "off" && v !== "default") return;
    document.cookie = v === "default" ? `${COOKIE}=; path=/; max-age=0; samesite=lax` : `${COOKIE}=${v}; path=/; samesite=lax`;
    url.searchParams.delete("pilot");
    router.replace(url.pathname + url.search + url.hash);
    router.refresh();
  }, [pathname, router]);
  return null;
}

export function PilotMenuProvider({ on, devSwitch = false, children }: { on: boolean; devSwitch?: boolean; children: React.ReactNode }) {
  return (
    <PilotMenuContext.Provider value={on}>
      {devSwitch ? <PilotDevSwitch /> : null}
      {children}
    </PilotMenuContext.Provider>
  );
}

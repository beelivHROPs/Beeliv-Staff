import "server-only";
import { cookies } from "next/headers";
import { beelivEnv, pilotMenuEnv } from "@/lib/env/sample-data";

/**
 * SERVER ONLY. Whether the pilot menu is on for this render, decided on the server (BEELIV_PILOT_MENU via
 * lib/env/resolve.ts). Only when BEELIV_ENV is local may a developer override it with the `bv_pilot_menu` cookie
 * (set by opening any screen with ?pilot=on, ?pilot=off or ?pilot=default); staging and production ignore the cookie.
 * No secret is involved and nothing but a boolean reaches the browser.
 */
export const PILOT_COOKIE = "bv_pilot_menu";

export async function pilotMenuState(): Promise<{ on: boolean; devSwitch: boolean }> {
  // Lead 2026-11-24: "just copy the view done in the localhost". The live sites always use the full approved layouts
  // (the pilot hides no screens any more), so outside local development the pilot menu is OFF whatever the setting says.
  if (beelivEnv() !== "local") return { on: false, devSwitch: false };
  const base = pilotMenuEnv();
  const v = (await cookies()).get(PILOT_COOKIE)?.value;
  return { on: v === "on" ? true : v === "off" ? false : base, devSwitch: true };
}

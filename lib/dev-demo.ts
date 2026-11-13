/**
 * DEV-ONLY fixture switch: `?demo=<name>` on a setup route shows a state that
 * cannot be reached from mock data alone (conflict, unknown outcome, waiting
 * for Beeliv, MFA device states). It never fakes a success: a demo can only
 * show a blocked or waiting state.
 *
 * SERVER-DECIDED (AUTH-014): the browser cannot turn demos on. The app layouts
 * render `data-bv-demo="on"` only when lib/dev-demo-flag.ts says so (preview
 * mode AND not a production build; always off when authMode() is live, even
 * with NODE_ENV=development). Without that attribute this returns null.
 *
 * REMOVE this file, dev-demo-flag.ts, the layout attributes and every
 * `getDemo()` call at go-live (see HANDOFF-LOG).
 */
export function getDemo(): string | null {
  if (typeof window === "undefined") return null;
  if (!document.querySelector('[data-bv-demo="on"]')) return null;
  return new URLSearchParams(window.location.search).get("demo");
}

/**
 * Client app image slots. Every picture in the Client app is a slot that real
 * Beeliv / outlet photography drops into: the backend may supply `imageUrl`
 * per outlet (Outlet.imageUrl); until then the approved Beeliv hospitality
 * placeholders below are used (brief section 33). No external stock images.
 *
 * PLACEHOLDERS: reused from the public site's approved photography.
 */
import type { Outlet } from "./types";

export const CLIENT_ART = {
  /** Default outlet cover when nothing else applies. */
  outletFallback: "/images/editorial/dining.jpg",
  /** Placeholder covers picked by outlet id so each outlet looks distinct (still approved Beeliv imagery). */
  outletPlaceholders: ["/images/editorial/dining.jpg", "/images/business/hero.jpg", "/images/about/dining.jpg"],
} as const;

/** Cover photo for an outlet: its own image, else a stable approved placeholder. */
export function outletImage(outlet: Pick<Outlet, "id" | "imageUrl"> | null | undefined): string {
  if (!outlet) return CLIENT_ART.outletFallback;
  if (outlet.imageUrl) return outlet.imageUrl;
  let n = 0;
  for (const ch of outlet.id) n += ch.charCodeAt(0);
  return CLIENT_ART.outletPlaceholders[n % CLIENT_ART.outletPlaceholders.length];
}

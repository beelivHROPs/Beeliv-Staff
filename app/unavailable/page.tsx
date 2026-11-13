import type { Metadata } from "next";
import localFont from "next/font/local";
import { UnavailableClient } from "./UnavailableClient";
import "../(public)/public-site.css";

/**
 * Shown (via a proxy REWRITE, so the address bar keeps the page the person asked for) when a page in the Admin, Client,
 * Staff or Applicant areas can't be checked right now: sign-in service unreachable or not configured, wrong origin,
 * rate limit or no access. Page visits get this designed screen; API and script requests still get the short JSON
 * answer. Uses the approved "Something went wrong" (500) design, set up locally like app/error.tsx.
 */
const newsreader = localFont({ src: [{ path: "../fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

export const metadata: Metadata = { title: { absolute: "Temporarily unavailable | Beeliv Hospitality" }, robots: { index: false } };

export default function UnavailablePage() {
  return (
    <div className={`public-site ${newsreader.variable}`}>
      <UnavailableClient />
    </div>
  );
}

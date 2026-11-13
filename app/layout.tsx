import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toast";
import { ScrollToTop } from "@/components/shared/ScrollToTop";
import { ScrollDebug } from "@/components/shared/ScrollDebug";
import { isProductionEnv } from "@/lib/env/sample-data";
import { authMode } from "@/lib/auth/mode";
import { AuthLiveProvider } from "@/lib/ui/auth-live";
import "./globals.css";

// App-wide (dashboards + everything except the new marketing site): Inter
// for headings, Karla for body — project-lead, 2026-09-16: "make sure the
// dashboards only use inter and the new body font only and no other fonts."
// Archivo/Bodoni Moda (beeliv.co's real display/logo fonts) are scoped to
// just the marketing-site draft's own layout instead (app/demo/
// marketing-site/layout.tsx), not applied here — they were briefly global
// but that pulled the dashboards off Inter too, which this reverts.
// Karla itself stays global: --font-sans had no concrete value defined
// anywhere before this (a real gap — see prior commit), so body text had
// been silently falling back to the browser default; Karla is the fix,
// independent of which heading font is active.
const interHeading = localFont({ src: [{ path: "./fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-heading", display: "swap", adjustFontFallback: "Arial" });
// Desktop (768px and up) keeps the original pair: Newsreader headings + Karla body (see globals.css).
const desktopSerif = localFont({ src: [{ path: "./fonts/newsreader-latin.woff2", weight: "200 800", style: "normal" }], variable: "--font-serif-d", display: "swap", adjustFontFallback: "Times New Roman" });
const desktopSans = localFont({ src: [{ path: "./fonts/karla-latin.woff2", weight: "200 800", style: "normal" }], variable: "--font-sans-d", display: "swap", adjustFontFallback: "Arial" });
const karlaBody = localFont({ src: [{ path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-sans", display: "swap", adjustFontFallback: "Arial" });

// Non-production environments (local, staging) are never indexed; production keeps the default behaviour.
export function generateMetadata(): Metadata {
  return {
    title: {
      default: "Beeliv HR/Ops",
      template: "%s | Beeliv",
    },
    description: "Beeliv Hospitality HR, Recruitment & Operations platform.",
    ...(isProductionEnv() ? {} : { robots: { index: false, follow: false } }),
  };
}

// The app never declared it's light-only, so Android Chrome's "Force Dark"
// auto-inverts the whole page — including skeleton/shimmer loaders, which
// go from light-gray-on-white to near-black-on-black and look broken/stuck
// rather than loading (project-lead: "still tripping with the old shimmer
// loader" — a phone screenshot showing exactly this). This tells the
// browser not to auto-invert; app/globals.css's `:root` also sets the
// matching CSS `color-scheme: light` for browsers that read it directly.
export const viewport: Viewport = {
  colorScheme: "only light",
};

/**
 * Dark mode used to switch on only after the app had loaded, so every refresh
 * painted light first (a white flash and a white skeleton). This runs in the
 * page head before anything is drawn: for the Staff and Client pages it reads the
 * saved choice and sets the same flags lib/shared/theme.ts sets later. The keys
 * and flag names must match that file.
 */
const THEME_BOOT = `(function(){try{var p=location.pathname,d=document.documentElement,a=[["/client","client-app","bv-client-dark","clientTheme"],["/staff","staff-app","bv-staff-dark","staffTheme"],["/admin","admin-app","bv-admin-dark","adminTheme"]];for(var i=0;i<a.length;i++){var x=a[i];if(p===x[0]||p.indexOf(x[0]+"/")===0){d.classList.add(x[1]);var v=localStorage.getItem(x[2]);if(v==="1"||(v==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))d.dataset[x[3]]="dark";}}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interHeading.variable} ${karlaBody.variable} ${desktopSerif.variable} ${desktopSans.variable} h-full antialiased`}
      // The head script may add theme flags before React loads.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ScrollToTop />
        <AuthLiveProvider live={authMode() === "live"}>{children}</AuthLiveProvider>
        <Toaster />
        {isProductionEnv() || process.env.NODE_ENV === "production" ? null : <ScrollDebug />}
      </body>
    </html>
  );
}

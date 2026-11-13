import localFont from "next/font/local";

/**
 * Applicant dashboard serif (Newsreader). Defined here, not in the layout, so
 * layers that render outside the layout's wrapper (the More sheet and the
 * phone date sheet are portalled to <body>) can add `newsreader.variable`
 * too — otherwise `.ap-serif` headings in them fall back to the sans font.
 * See app/applicant/layout.tsx for why this dashboard uses Newsreader.
 */
export const newsreader = localFont({ src: [{ path: "../../app/fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

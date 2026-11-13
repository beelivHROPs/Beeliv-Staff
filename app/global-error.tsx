"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import localFont from "next/font/local";
import { Error500Body } from "@/components/public/Error500Body";
import { MotionRoot } from "@/components/public/MotionRoot";
import "./globals.css";
import "./(public)/public-site.css";

/**
 * Last-resort error page for crashes in the ROOT layout itself (Next.js
 * global-error convention — it replaces the root layout, so it brings its own
 * <html>/<body>, global styles and fonts). Shows the same APPROVED 500 design
 * as app/error.tsx and app/(public)/error.tsx, so no visitor ever sees
 * Next.js's default error screen or an old design.
 */
const karla = localFont({ src: [{ path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-sans", display: "swap", adjustFontFallback: "Arial" });
const newsreader = localFont({ src: [{ path: "./fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${karla.variable} ${newsreader.variable}`}>
      <body>
        <title>Something went wrong | Beeliv Hospitality</title>
        <div className="public-site">
          <MotionRoot>
            <Error500Body retry={retry} digest={error.digest} />
          </MotionRoot>
        </div>
      </body>
    </html>
  );
}

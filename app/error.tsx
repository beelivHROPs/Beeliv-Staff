"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import localFont from "next/font/local";
import { Error500Body } from "@/components/public/Error500Body";
import { MotionRoot } from "@/components/public/MotionRoot";
import "./(public)/public-site.css";

/**
 * Root error boundary — shows the APPROVED 500 design (Error500-Desktop/Mobile,
 * components/public/Error500Body.tsx), the same screen app/(public)/error.tsx
 * renders. This one catches errors that happen above the route groups (e.g.
 * in a group's layout, or while the dev server is restarting), where
 * (public)/layout.tsx isn't mounted — so it recreates that layout's scope
 * here: the `.public-site` token wrapper, the Newsreader font variable and
 * MotionRoot. (Previously this file had its own unapproved purple design.)
 *
 * As of Next.js 16.3 the stable recovery prop is `retry`.
 */
const newsreader = localFont({ src: [{ path: "./fonts/noto-sans-latin.woff2", weight: "100 900", style: "normal" }], variable: "--font-newsreader", display: "swap", adjustFontFallback: "Arial" });

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`public-site ${newsreader.variable}`}>
      <MotionRoot>
        <Error500Body retry={retry} digest={error.digest} />
      </MotionRoot>
    </div>
  );
}

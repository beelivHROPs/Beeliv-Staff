"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Error500Body } from "@/components/public/Error500Body";

/**
 * Route-group-scoped error boundary for the public marketing site (and the
 * nested (auth) group it wraps - see app/(public)/layout.tsx's contents).
 *
 * Why here and not only at app/error.tsx: `error.js` wraps everything below
 * it in the segment tree but does NOT wrap the layout.js in its own segment
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * error.md). A root-level app/error.tsx sits alongside the ROOT layout, so
 * activating it replaces everything below the root layout - including
 * app/(public)/layout.tsx (Newsreader font variable, public-site.css's
 * `.public-site` token scope, MotionRoot). This file sits one level lower,
 * inside the (public) group, so (public)/layout.tsx stays mounted and the
 * Error500-Desktop/Mobile.dc.html screen renders with the right fonts,
 * colours and chrome. The pre-existing root app/error.tsx is untouched and
 * still catches errors outside this group (the five dashboard route trees),
 * which have no wireframe coverage here and use a different shell entirely.
 *
 * As of Next.js 16.3 the stable recovery prop is `retry` (stable since
 * v16.3.0 per error.md's Version History), matching the existing root
 * app/error.tsx's own convention.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <Error500Body retry={retry} digest={error.digest} />;
}

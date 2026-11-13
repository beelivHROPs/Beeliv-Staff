import type { Metadata } from "next";
import { NotFoundBody } from "@/components/public/NotFoundBody";

/**
 * Catches `notFound()` calls thrown from inside the (public) route tree
 * (e.g. app/(public)/jobs/[id]/page.tsx for an unknown job id). Per
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * not-found.md, Next.js walks up from the segment that threw looking for
 * the nearest not-found.tsx - this one is nested inside app/(public)/
 * layout.tsx, so it inherits the Newsreader font, the `.public-site` token
 * scope and MotionRoot from there for free. See app/not-found.tsx (the root
 * boundary, for URLs that match no route at all - (public)/layout.tsx never
 * mounts for those) for the counterpart that sets those up itself.
 */
export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return <NotFoundBody />;
}

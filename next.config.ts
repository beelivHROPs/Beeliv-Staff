import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { resolveEnvironment } from "./lib/env/resolve";
import { parseDeployApp, redirectsFor } from "./lib/deploy/app-target";

// Which ONE app this deployment serves (beeliv-deploy.json, committed only in the Admin / Client / Staff repos).
// Absent here, so local development serves everything. See lib/deploy/app-target.ts.
const deployApp = (() => {
  try {
    return existsSync("beeliv-deploy.json") ? parseDeployApp(JSON.parse(readFileSync("beeliv-deploy.json", "utf8")).app) : null;
  } catch {
    return null;
  }
})();

// Non-production environments (local, staging) also say noindex in a response header, on top of the page metadata.
const nonProduction = resolveEnvironment(process.env).env !== "production";

const nextConfig: NextConfig = {
  // Lets a fast local preview (next build + next start) live beside the running dev server without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Don't advertise the framework in the X-Powered-By response header —
  // project-lead direction: keep the tech stack from being fingerprinted
  // via a plain response-header check.
  poweredByHeader: false,
  async redirects() {
    return redirectsFor(deployApp);
  },
  // Security headers on every route (security audit 2026-10-05). The inline theme-boot script in
  // app/layout.tsx means a full script CSP needs per-request nonces (dynamic rendering), so that is a
  // later step; frame-ancestors/X-Frame-Options stop the login and recovery pages being framed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          ...(nonProduction ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
          // Camera is used by "Take photo"; nothing else needs a device permission.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
        ],
      },
      // Invitation links carry a one-time token in the path: send NO Referer at all from these pages
      // (the global origin-only policy above is the default everywhere else). Later entries override
      // the same header key from the "/:path*" rule; every other security and noindex header still applies.
      ...["/invite/:token*", "/admin/invite/:token*", "/client/invite/:token*", "/staff/invite/:token*"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
  // Dev-only: the floating "N" route badge sat on top of the applicant
  // dashboard's mobile bottom nav (Home tab). Compile/runtime errors still
  // surface with it off. Irrelevant to production builds.
  devIndicators: false,
  // Allows loading dev JS chunks when testing on a real phone over the LAN
  // (http://192.168.1.132:3000/...) — without this, Next.js silently blocks
  // cross-origin requests to dev resources, so the page loads but never
  // hydrates: no client component is interactive (hamburger nav, the
  // "How it works" scroll animation, etc. all appear broken but aren't —
  // JS just never ran). Dev-only setting; irrelevant to production builds.
  // "*.trycloudflare.com" covers the Cloudflare quick-tunnel URL used to
  // demo this dev server publicly (a new random subdomain every time the
  // tunnel restarts) — same "loads but never hydrates" failure mode as the
  // LAN-IP case above, just a different origin.
  allowedDevOrigins: ["192.168.1.132", "192.168.1.194", "172.20.10.2", "*.trycloudflare.com"],
  // images.unsplash.com: stock photos for the homepage hero's avatar stack
  // (components/shared/AvatarStack.tsx) — explicit project-lead override
  // (2026-09-04) of an earlier decision to keep that stack illustrated-only.
  // Real, commercially-licensed (Unsplash License) stock photos, not real
  // Beeliv people — flagged in that component's own comment as needing
  // replacement before any real client-facing use.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // i.postimg.cc: the Beeliv logo (project-lead direction, 2026-09-04) —
      // referenced by URL directly rather than a local /public file, so a
      // browser that cached the old local file at the same path isn't stuck
      // showing it. See components/shared/PublicHeader.tsx and every other
      // logo call site for the actual URL.
      { protocol: "https", hostname: "i.postimg.cc" },
    ],
  },
};

export default nextConfig;

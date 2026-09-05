import type { NextConfig } from "next";

// Trimmed relative to the original monorepo's next.config.ts: no image
// remotePatterns needed here — this app never references images.unsplash.com
// (that's the public homepage's AvatarStack, which lives in Beeliv-Client)
// or i.postimg.cc (vestigial; the logo is the local /public file below).
const nextConfig: NextConfig = {};

export default nextConfig;

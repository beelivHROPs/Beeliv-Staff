/**
 * How an SOP link is shown inside the Staff reader. Links only: nothing is hosted
 * here. Known video and document hosts are turned into their privacy-friendly embed
 * form; anything else that is not a plain https document or page is not framed and
 * the reader offers "Open in a new tab" instead.
 *
 * Security: only https; the embed host is one of a small fixed allow-list (below)
 * or the person's own direct .pdf / web-page link, always in a sandboxed frame
 * with no referrer. The server must still allow these hosts in CSP `frame-src`
 * (open decision, see docs/contracts/frontend-backend-needs-2026-10-17.md).
 */
import { safeHttpsUrl } from "@/lib/staff/sops/derive";
import type { SopKind } from "@/lib/staff/sops/types";

export type Embed = {
  /** video = 16:9 player; frame = tall reading frame for documents and pages. */
  mode: "video" | "frame";
  src: string;
  /** Host shown in the quiet "from ..." line. */
  host: string;
  /** Hosts in our allow-list may keep scripts and their own origin; everything else is locked down. */
  trusted: boolean;
};

/** The small allow-list of embed hosts (the hosts of the URLs we generate). */
export const EMBED_HOSTS = ["www.youtube-nocookie.com", "player.vimeo.com", "drive.google.com", "docs.google.com"] as const;

const YT_ID = /^[\w-]{6,20}$/;

function youtube(u: URL): string | null {
  const h = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (h === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (h === "youtube.com" || h === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && YT_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

function vimeo(u: URL): string | null {
  const h = u.hostname.replace(/^www\./, "");
  if (h !== "vimeo.com" && h !== "player.vimeo.com") return null;
  const m = u.pathname.match(/(\d{5,12})(?:\/([0-9a-f]{6,12}))?\/?$/);
  if (!m) return null;
  return `https://player.vimeo.com/video/${m[1]}?dnt=1${m[2] ? `&h=${m[2]}` : ""}`;
}

function google(u: URL): { src: string; video: boolean } | null {
  if (u.hostname === "drive.google.com") {
    const m = u.pathname.match(/^\/file\/d\/([\w-]+)/) ?? (u.pathname === "/open" ? [null, u.searchParams.get("id")] : null);
    return m && m[1] ? { src: `https://drive.google.com/file/d/${m[1]}/preview`, video: false } : null;
  }
  if (u.hostname === "docs.google.com") {
    const m = u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
    if (!m) return null;
    return { src: `https://docs.google.com/${m[1]}/d/${m[2]}/${m[1] === "presentation" ? "embed" : "preview"}`, video: false };
  }
  return null;
}

/** Returns how to show this link, or null when it cannot be shown inside the reader. */
export function embedFor(rawUrl: string, kind: SopKind): Embed | null {
  const href = safeHttpsUrl(rawUrl);
  if (!href) return null;
  // Dev-only sample PDF from our own public/dev-samples folder (accepted by safeHttpsUrl in development only).
  if (href.startsWith("/dev-samples/")) return { mode: "frame", src: href, host: "Beeliv sample file", trusted: false };
  const u = new URL(href);

  const yt = youtube(u);
  if (yt) return { mode: "video", src: yt, host: "YouTube", trusted: true };
  const vm = vimeo(u);
  if (vm) return { mode: "video", src: vm, host: "Vimeo", trusted: true };
  const g = google(u);
  if (g) return { mode: kind === "video" ? "video" : "frame", src: g.src, host: u.hostname === "drive.google.com" ? "Google Drive" : "Google Docs", trusted: true };

  // A video link on a host we do not know cannot be played safely here.
  if (kind === "video") return null;

  const isPdf = u.pathname.toLowerCase().endsWith(".pdf");
  if (isPdf || kind === "page" || kind === "document") return { mode: "frame", src: href, host: u.hostname.replace(/^www\./, ""), trusted: false };
  return null;
}

/** Sandbox flags per trust level. Untrusted frames never get the app's origin, top navigation or downloads. */
export const SANDBOX_TRUSTED = "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";
export const SANDBOX_OPEN = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

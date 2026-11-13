/**
 * Pure helpers for sharing a link (no browser APIs, so they can be unit tested with plain node).
 */
export type SharePayload = { title: string; text: string; url: string };

/**
 * The clean link to share: origin + path only. Tracking parameters, ?pilot / ?demo and the #fragment are dropped.
 * A signed-in Applicant job page (/applicant/jobs/x) shares the public job page (/jobs/x), which anyone can open.
 */
export function canonicalShareUrl(href: string): string {
  try {
    const u = new URL(href);
    let path = u.pathname.replace(/^\/applicant\/jobs\//, "/jobs/");
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return `${u.origin}${path}`;
  } catch {
    return href;
  }
}

/** The short human line shown with the link. */
export function jobShareText(role: string, company: string, location?: string): string {
  const where = location ? `, ${location}` : "";
  return `${role} at ${company}${where}: apply on Beeliv`;
}

export type ShareTarget = { id: "whatsapp" | "email" | "sms" | "telegram" | "facebook" | "linkedin" | "x"; label: string; href: string; external: boolean };

const enc = encodeURIComponent;

/** One link per destination. Everything is percent-encoded (spaces, ampersands, non-ASCII). */
export function buildShareTargets({ title, text, url }: SharePayload): ShareTarget[] {
  const both = `${text} ${url}`;
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(both)}`, external: true },
    { id: "email", label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(both)}`, external: false },
    { id: "sms", label: "Messages", href: `sms:?&body=${enc(both)}`, external: false },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, external: true },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, external: true },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, external: true },
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, external: true },
  ];
}

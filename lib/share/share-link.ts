import { canonicalShareUrl, type SharePayload } from "./share-urls";

/**
 * Share a link the way every other site does: the browser's own share sheet (Web Share API).
 * That API exists only in a secure context (https or localhost) and must run inside a click, so:
 *  - call shareLink() straight from the click handler, with nothing awaited before it;
 *  - "unsupported" means the browser has no native sheet here (desktop browsers without it, http test addresses):
 *    the caller opens the in-app ShareSheet instead of silently copying.
 */
export type ShareResult = "shared" | "dismissed" | "unsupported";

export function shareableUrl(url?: string): string {
  return canonicalShareUrl(url ?? window.location.href);
}

export function shareLink(opts: { title: string; text?: string; url?: string }): Promise<ShareResult> {
  const data: ShareData = { title: opts.title, text: opts.text ?? opts.title, url: shareableUrl(opts.url) };
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return Promise.resolve("unsupported");
  try {
    if (typeof navigator.canShare === "function" && !navigator.canShare(data)) return Promise.resolve("unsupported");
  } catch {
    return Promise.resolve("unsupported");
  }
  // navigator.share is called synchronously here, still inside the person's click.
  return navigator.share(data).then(
    () => "shared" as const,
    (e: unknown) => (e instanceof DOMException && e.name === "AbortError" ? ("dismissed" as const) : ("unsupported" as const)),
  );
}

/** Copy text: clipboard API, then the old copy command. Returns false if neither worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      // A clipboard request that never settles (page not focused) must not block the fallback.
      await Promise.race([navigator.clipboard.writeText(text), new Promise((_, no) => window.setTimeout(no, 1200))]);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// ---- open/close state of the in-app sheet (one sheet per page) ----
export type SheetState = { payload: SharePayload; anchor: { top: number; left: number; right: number; bottom: number } | null } | null;
let sheet: SheetState = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const shareSheetStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  get: () => sheet,
  getServer: (): SheetState => null,
  close() {
    sheet = null;
    emit();
  },
  open(payload: SharePayload) {
    const a = typeof document !== "undefined" ? document.activeElement : null;
    const r = a instanceof HTMLElement && a !== document.body ? a.getBoundingClientRect() : null;
    sheet = { payload, anchor: r ? { top: r.top, left: r.left, right: r.right, bottom: r.bottom } : null };
    emit();
  },
};

/**
 * Click handler body for every Share button: native sheet first, in-app sheet when there is none.
 * Call it directly from onClick (no await before it).
 */
export async function shareOrOpenSheet(opts: { title: string; text: string; url?: string }): Promise<ShareResult> {
  const result = await shareLink(opts);
  if (result === "unsupported") shareSheetStore.open({ title: opts.title, text: opts.text, url: shareableUrl(opts.url) });
  return result;
}

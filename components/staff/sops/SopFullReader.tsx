"use client";

/**
 * Full-screen SOP reader (project lead decision, 2026-10-19). The SOPs are still LINKS
 * (nothing is hosted, https only, no quizzes, badges or streaks); this screen shows them
 * inside the app, one after another, in the order of the person's own list: what is still
 * to read first (soonest due), then what they have read, grouped by topic.
 *
 * - Video links play in an embedded player, documents and pages in a framed viewer
 *   (see embed.ts for the allow-list). A link that cannot be shown gets a calm
 *   message and an "Open in a new tab" pill.
 * - Opening an item records the read receipt through the existing hook (openSop).
 * - Chrome: close, title and type icon, "N of M" with a thin bar, and a sticky bar with
 *   Previous / Next. On the last item Next becomes "I've read this" and, when the SOP
 *   needs a sign-off, opens the existing sign-off dialog.
 * - Keyboard: arrows move, Esc closes, Tab stays inside. Motion respects reduced motion.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, ExternalLink, Search, ShieldCheck, X } from "@/components/applicant/icons";
import { useSopLibrary } from "@/lib/staff/hooks";
import { SOP_KIND_LABEL, byDue, isOpenItem, safeHttpsUrl, sopStatus } from "@/lib/staff/sops/derive";
import type { SopItem } from "@/lib/staff/sops/types";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Dot, Sk, StateCard } from "../kit";
import { SANDBOX_OPEN, SANDBOX_TRUSTED, embedFor, type Embed } from "./embed";
import { KIND_ICON, recordOpen, signOff } from "./SopParts";

const LIST = "/staff/sops-training";

/** Assigned first (soonest due), then the rest by topic. Computed once so the order does not jump while reading. */
function readingOrder(items: SopItem[]): string[] {
  const open = items.filter(isOpenItem).sort(byDue);
  const done = items.filter((s) => !isOpenItem(s)).sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  return [...open, ...done].map((s) => s.id);
}

const FRAME = "fixed inset-0 z-[100] flex flex-col bg-(--ap-bg) text-(--ap-ink)";

function Frame({ label, children, onClose }: { label: string; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className={FRAME}>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-(--ap-line) bg-(--ap-surface,#fff) px-3 min-[768px]:px-6">
        <CloseButton onClose={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 min-[768px]:p-6">
        <div className="mx-auto max-w-[760px]">{children}</div>
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-autofocus
      aria-label="Close reader"
      onClick={onClose ?? (() => router.push(LIST))}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-ink) transition-colors hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none"
    >
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}

export function SopFullReader({ id }: { id: string }) {
  const lib = useSopLibrary();
  if (lib.status === "loading") return <ReaderSkeleton />;
  if (lib.status === "error") {
    return (
      <Frame label="Reader">
        <ErrorPanel title="We couldn't load this SOP" retry={lib.retry} />
      </Frame>
    );
  }
  const items = lib.data ?? [];
  if (!items.some((s) => s.id === id)) {
    return (
      <Frame label="Reader">
        <StateCard
          icon={Search}
          title="We can't find that SOP"
          text="It may have been archived or reassigned. Go back to see what is assigned to you."
          action={
            <ActionPill href={LIST} variant="purple" compact arrow={false} className="w-full justify-center">
              Back to your SOPs
            </ActionPill>
          }
        />
      </Frame>
    );
  }
  return <Reader items={items} startId={id} />;
}

export function ReaderSkeleton() {
  return (
    <div className={FRAME} aria-busy="true" aria-label="Loading the reader">
      <h1 className="sr-only">Reader</h1>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-(--ap-line) bg-(--ap-surface,#fff) px-3 min-[768px]:px-6">
        <Sk className="size-11 rounded-full" />
        <Sk className="h-6 w-48" />
      </div>
      <div className="min-h-0 flex-1 p-4 min-[768px]:p-6">
        <Sk className="mx-auto aspect-video w-full max-w-[960px]" />
      </div>
      <div className="flex h-[84px] shrink-0 items-center gap-3 border-t border-(--ap-line) bg-(--ap-surface,#fff) px-3">
        <Sk className="h-12 flex-1 rounded-full" />
        <Sk className="h-12 flex-1 rounded-full" />
      </div>
    </div>
  );
}

function Reader({ items, startId }: { items: SopItem[]; startId: string }) {
  const router = useRouter();
  const [order] = useState(() => readingOrder(items));
  const [idx, setIdx] = useState(() => Math.max(0, order.indexOf(startId)));
  const box = useRef<HTMLDivElement>(null);
  const opened = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);

  const list = order.map((oid) => items.find((s) => s.id === oid)).filter((s): s is SopItem => !!s);
  const total = list.length;
  const item = list[Math.min(idx, total - 1)];
  const last = idx >= total - 1;
  const embed = embedFor(item.url, item.kind);
  const Kind = KIND_ICON[item.kind];

  const close = () => router.push(LIST);
  const go = (to: number) => setIdx(Math.max(0, Math.min(total - 1, to)));

  // Opening an item records the read receipt (once per item in this visit).
  useEffect(() => {
    if (opened.current.has(item.id)) return;
    opened.current.add(item.id);
    recordOpen(item);
  }, [item]);

  // Keep the address in step so a refresh or a shared link lands on the same item.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `${LIST}/${item.id}`);
  }, [item.id]);

  // Keyboard, focus and scroll lock. Only keys that belong to the reader are handled.
  const stateRef = useRef({ idx, total, go, close });
  useEffect(() => {
    stateRef.current = { idx, total, go, close };
  });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const inside = (t: EventTarget | null) => !(t instanceof Node) || t === document.body || el.contains(t);
    function onKey(e: KeyboardEvent) {
      if (!inside(e.target) || e.defaultPrevented) return;
      const s = stateRef.current;
      const field = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "Escape") {
        e.preventDefault();
        s.close();
      } else if (!field && e.key === "ArrowRight" && s.idx < s.total - 1) {
        e.preventDefault();
        s.go(s.idx + 1);
      } else if (!field && e.key === "ArrowLeft" && s.idx > 0) {
        e.preventDefault();
        s.go(s.idx - 1);
      } else if (e.key === "Tab") {
        const f = [...el!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])')].filter((n) => n.getClientRects().length > 0);
        if (f.length === 0) return;
        const first = f[0];
        const lastEl = f[f.length - 1];
        const at = document.activeElement;
        if (e.shiftKey && (at === first || !el!.contains(at))) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && (at === lastEl || !el!.contains(at))) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  const status = sopStatus(item);
  const needsSignOff = item.needsSignOff && !item.signedOff;

  async function finish() {
    setBusy(true);
    try {
      if (needsSignOff) {
        const ok = await signOff(item);
        if (!ok) return;
      }
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={`Reading: ${item.title}`} className={FRAME}>
      <header className="shrink-0 border-b border-(--ap-line) bg-(--ap-surface,#fff)">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-3 min-[768px]:px-6">
          <CloseButton onClose={close} />
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet)">
            <Kind className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[17px] font-bold">{item.title}</h1>
            <p className="truncate text-[14px] text-(--ap-muted)">
              {item.category} · {SOP_KIND_LABEL[item.kind]}
              {item.minutes ? ` · ${item.minutes} min` : ""}
            </p>
          </div>
          <p className="shrink-0 text-[14px] font-semibold text-(--ap-ink-2) tabular-nums" aria-live="polite">
            {idx + 1} of {total}
          </p>
        </div>
        <div role="progressbar" aria-label="Reading progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={idx + 1} className="h-1 bg-(--ap-line-2)">
          <div className="h-full rounded-r-full bg-(--ap-violet) transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-[1100px] flex-col gap-4 p-3 min-[768px]:p-6">
          {status !== "new" && item.needsSignOff ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {needsSignOff ? <Dot tone="warn">Needs your sign-off</Dot> : <Dot tone="ok">Signed off</Dot>}
              {needsSignOff && !last ? (
                <ActionPill variant="outline" compact arrow={false} icon={Check} onClick={() => void signOff(item)}>
                  Sign off now
                </ActionPill>
              ) : null}
            </div>
          ) : null}
          <Stage key={item.id} embed={embed} item={item} />
          {item.description ? <p className={`w-full text-[16px] leading-relaxed text-(--ap-ink-2) ${embed?.mode === "video" ? "mx-auto max-w-[960px]" : ""}`}>{item.description}</p> : null}
        </div>
      </main>

      <footer className="shrink-0 border-t border-(--ap-line) bg-(--ap-surface,#fff) px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] min-[768px]:px-6">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 min-[768px]:justify-between">
          <ActionPill variant="outline" compact arrow={false} icon={ChevronLeft} disabled={idx === 0} onClick={() => go(idx - 1)} className="max-[767px]:flex-1">
            Previous
          </ActionPill>
          {last ? (
            <ActionPill variant="dark" compact icon={Check} loading={busy} onClick={() => void finish()} className="max-[767px]:flex-1">
              I&apos;ve read this
            </ActionPill>
          ) : (
            <ActionPill variant="dark" compact onClick={() => go(idx + 1)} className="max-[767px]:flex-1">
              Next
            </ActionPill>
          )}
        </div>
      </footer>
    </div>
  );
}

/** The content area: player or frame when the link can be shown, a calm message when it cannot. */
function Stage({ embed, item }: { embed: Embed | null; item: SopItem }) {
  const href = safeHttpsUrl(item.url);
  // Never frame our own origin with the sandbox flags relaxed: send it to a new tab instead.
  const devSample = !!href && href.startsWith("/dev-samples/");
  const sameOrigin = !devSample && !!href && typeof window !== "undefined" && new URL(href).host === window.location.host;
  if (!embed || !href || sameOrigin) {
    return (
      <div className="mx-auto w-full max-w-[560px] pt-4">
        <StateCard
          icon={href ? ExternalLink : CircleAlert}
          title={href ? "This one opens in its own tab" : "This link isn't available"}
          text={href ? "It can't be shown inside the app, so we'll open it for you. Come back here when you're done." : "Beeliv hasn't shared a working link for this SOP yet. Please ask your supervisor."}
          action={
            href ? (
              <ActionPill href={href} external variant="purple" compact icon={ExternalLink} arrow={false} className="w-full justify-center">
                Open in a new tab
              </ActionPill>
            ) : undefined
          }
        />
      </div>
    );
  }
  const video = embed.mode === "video";
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2">
      {/* One frame height for every kind of item (video, PDF, page), so Previous/Next never changes the layout: about 64% of the screen, capped. */}
      <div className={`flex h-[min(64dvh,680px)] min-h-[340px] items-center justify-center overflow-hidden rounded-[22px] border border-(--ap-line) ${video ? "bg-black max-[767px]:h-auto max-[767px]:min-h-0" : "bg-white"}`}>
        <iframe
          src={embed.src}
          title={`${item.title} (${embed.host})`}
          sandbox={devSample ? undefined : embed.trusted ? SANDBOX_TRUSTED : SANDBOX_OPEN}
          // Trusted video hosts need the site origin as the referrer (YouTube refuses to play with none: error 153); the path is never sent.
          referrerPolicy={embed.trusted ? "strict-origin-when-cross-origin" : "no-referrer"}
          allow={video ? "fullscreen; picture-in-picture; encrypted-media" : undefined}
          allowFullScreen={video}
          // Video: 16:9 as large as fits inside the shared frame height. Document or page: fills the whole frame.
          // (Width is the smaller of the frame width and 16:9 of the frame height; the height then follows the aspect ratio, so it is never stretched.)
          className={video ? "aspect-video w-[min(100%,calc(min(64dvh,680px)*16/9))] border-0 bg-black max-[767px]:w-full" : "size-full border-0 bg-white"}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="flex min-w-0 items-center gap-2 text-[14px] text-(--ap-muted)">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">From {embed.host}</span>
        </p>
        <ActionPill href={href} external variant="ghost" compact icon={ExternalLink} arrow={false}>
          Open in a new tab
        </ActionPill>
      </div>
    </div>
  );
}

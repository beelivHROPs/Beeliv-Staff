"use client";

/**
 * "Request received" screen (Request-Sent-Desktop / Request-Sent-Mobile.dc.html).
 *
 * Desktop (>= wf-d, 820px): header, then a two-column split - illustration slot
 * on the left, all text content (eyebrow, headline, line, reference card, two
 * buttons) on the right, vertically centred against the illustration's height
 * - and the footer. This is a confirmed, deliberate deviation from the
 * wireframe's centred-column desktop layout for this screen only; every other
 * screen still follows its board as drawn. Below wf-d: header and the original
 * single centred column (illustration on top, text stacked below), no footer
 * (the mobile wireframe has none) - unchanged by the desktop split above.
 *
 * The reference card shows what the form stored for this tab in sessionStorage
 * (need labels, headcount, location; never contact details). Opened directly,
 * with nothing submitted, it shows the wireframe's own bracketed sample line.
 * The reference itself stays "[BLV-0000]" until the backend issues one.
 * Nothing on this screen creates an account or signs anyone in.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { Btn, Reveal } from "@/components/public/kit";
import { SlotImage } from "@/components/public/SlotImage";
import { DUR, EASE } from "@/components/public/motion";
import { IMAGE_SLOTS } from "@/lib/public-site/assets";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import {
  NEEDS,
  REQUEST_NAV_ACTIVE,
  REQUEST_ROUTES,
  SENT,
} from "@/lib/public-site/request-content";
import { parseSent, readSentRaw, type SentInfo } from "@/lib/public-site/request-draft";

const subscribe = () => () => {};
/** null on the server (and during hydration): the client has not read storage yet. */
const serverSnapshot = (): string | null => null;

function summaryLine(info: SentInfo): string {
  const labels = NEEDS.filter((n) => info.needs.includes(n.id)).map((n) => n.summary);
  const parts = [labels.join(", ")];
  if (info.headcount) parts.push(`${info.headcount} ${info.headcount === 1 ? "role" : "roles"}`);
  if (info.location) parts.push(info.location);
  return parts.filter(Boolean).join(" · ");
}

/**
 * The "Success / All done" illustration slot (wireframe: dashed 28px-radius box,
 * tinted radial gradient with a small outlined cube). Mobile keeps the
 * wireframe's own 420x280-equivalent proportions (full width x 220). Desktop
 * (xl) resizes it to fill the new left column (project-lead-directed split,
 * see file header) - full column width, a generous fixed height so it reads
 * as the dominant left-hand element the right-hand text column centres
 * against - without rebuilding the slot itself. Until the real file is set in
 * lib/public-site/assets.ts (IMAGE_SLOTS.requestSuccess) the slot shows that
 * placeholder box; the wireframe's "ILLUSTRATION ..." note is a design-tool
 * label and is not rendered.
 */
function SuccessIllustration() {
  const hasSrc = IMAGE_SLOTS.requestSuccess.src !== null;
  return (
    <motion.div
      data-ps-reveal
      className="relative -mx-5 h-[260px] w-[calc(100%+40px)] shrink-0 wf-d:mx-0 wf-d:h-auto wf-d:aspect-[3/2] wf-d:w-full"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DUR.base, ease: EASE }}
    >
      {hasSrc ? (
        <SlotImage
          slot="requestSuccess"
          fit="contain"
          className="absolute inset-0 mix-blend-multiply"
          sizes="(min-width: 820px) 680px, 100vw"
          priority
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-[28px] border-[1.5px] border-dashed border-[#B9A6C8] p-4"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(91,8,123,.10), rgba(91,8,123,.02) 65%)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5B087B"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM12 12 20 7.5M12 12v9M12 12 4 7.5" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

export function RequestSent({ skeleton = false }: { skeleton?: boolean }) {
  const raw = useSyncExternalStore(subscribe, readSentRaw, serverSnapshot);
  const hydrated = raw !== null;
  const info = raw ? parseSent(raw) : null;
  const summary = info ? summaryLine(info) : SENT.summaryPlaceholder;
  const reference = info?.reference ?? SENT.referencePlaceholder;

  // The submit button that led here is gone: put focus on the new heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!skeleton) headingRef.current?.focus({ preventScroll: true });
  }, [skeleton]);

  return (
    <MenuProvider>
      <div className="au-shell flex min-h-[calc(100dvh/var(--ps-zoom,1))] flex-col">
        <PageHeader activeHref={REQUEST_NAV_ACTIVE} />
        {/*
          Mobile/tablet (below xl): unchanged single centred column (flex-col,
          items-center, text-center) - illustration on top, text stacked below.
          Desktop (xl+): a two-track grid - illustration left, text right -
          with `items-center` now centring the shorter text column against the
          illustration's (taller) row height. Confirmed desktop-only deviation
          from the wireframe's centred-column layout for this screen; see file
          header note.
        */}
        <main className="mx-auto flex w-full max-w-[calc(1440*var(--u))] grow flex-col items-center gap-[22px] px-5 pt-14 pb-12 text-center wf-d:grid wf-d:grid-cols-[calc(680*var(--u))_minmax(0,1fr)] wf-d:gap-x-16 wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(48*var(--u))] wf-d:pb-[calc(96*var(--u))] wf-d:text-left">
          <SuccessIllustration />
          {/*
            `contents` below wf-d: this wrapper disappears from the box tree, so
            its children are direct flex items of <main> and the mobile layout
            is byte-for-byte what it was before (same gap, same stacking order).
            At xl it becomes the grid's second (text) column, a flex column
            whose own content height `items-center` on <main> centres against
            the illustration column.
          */}
          <div className="contents wf-d:flex wf-d:flex-col wf-d:items-start wf-d:gap-[22px]">
            <Reveal when="mount" y={12} delay={stagger(1, 0.25)}>
              <Eyebrow className="!text-[12px]">{SENT.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(2, 0.25)}>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="ps-serif max-w-[16ch] outline-none [--fs-d:59] [--fs-m:30]"
              >
                <T>{SENT.title}</T>
              </h1>
            </Reveal>
            <Reveal when="mount" y={16} delay={stagger(3, 0.25)}>
              <p className="ps-bd max-w-[46ch]">
                <T>{SENT.body}</T>
              </p>
            </Reveal>

            <Reveal when="mount" y={16} delay={stagger(4, 0.25)} className="w-full wf-d:w-[460px]">
              <div className="ps-cd flex flex-col gap-1.5 px-[22px] py-[18px] text-left">
                <span className="ps-sm !text-[13px]">
                  <T>{SENT.referenceLabel}</T>{" "}
                  <b className="text-(--ink)">
                    <T>{reference}</T>
                  </b>
                </span>
                <span
                  className={`text-[15px] transition-opacity duration-500 ${hydrated || skeleton ? "opacity-100" : "opacity-0"}`}
                >
                  <T>{summary}</T>
                </span>
              </div>
            </Reveal>

            <Reveal
              when="mount"
              y={16}
              delay={stagger(5, 0.25)}
              className="flex w-full flex-col gap-3 wf-d:w-auto wf-d:flex-row wf-d:gap-[14px]"
            >
              <Btn href={REQUEST_ROUTES.home} label={SENT.backHome} variant="bp" hero className="!h-12" />
              <Btn href={REQUEST_ROUTES.services} label={SENT.services} variant="bo" className="!h-12" />
            </Reveal>
          </div>
        </main>
        <div className="hidden wf-d:block">
          <SiteFooter />
        </div>
      </div>
    </MenuProvider>
  );
}

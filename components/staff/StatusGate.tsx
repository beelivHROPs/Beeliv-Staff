import Image from "next/image";
import type { ReactNode } from "react";
import { ActionPill } from "./kit";

/**
 * Full-page account state (invitation needed / expired, suspended,
 * deactivated, no staff access). The colour follows how serious the state is
 * (project lead: "the text should be highlighted depending on these critical
 * states"): a coloured top stripe, status chip and "What to do next" callout.
 *   action  = violet (something to do)   warn     = amber (expired)
 *   critical = rose (suspended)          neutral  = grey (inactive / waiting)
 */
export type GateTone = "action" | "warn" | "critical" | "neutral";

const TONE: Record<GateTone, { stripe: string; chip: string; box: string; ink: string }> = {
  action: { stripe: "bg-(--ap-violet)", chip: "bg-(--ap-tint) text-(--ap-violet)", box: "border-(--ap-violet) bg-(--ap-tint)", ink: "text-(--ap-violet)" },
  warn: { stripe: "bg-(--ap-warn)", chip: "bg-(--ap-warn-bg) text-(--ap-warn)", box: "border-(--ap-warn) bg-(--ap-warn-bg)", ink: "text-(--ap-warn)" },
  critical: { stripe: "bg-(--ap-rose)", chip: "bg-(--ap-rose-bg) text-(--ap-rose)", box: "border-(--ap-rose) bg-(--ap-rose-bg)", ink: "text-(--ap-rose)" },
  neutral: { stripe: "bg-(--ap-faint)", chip: "bg-(--ap-line-2) text-(--ap-ink-2)", box: "border-(--ap-faint) bg-(--ap-line-2)", ink: "text-(--ap-ink-2)" },
};

export function StatusGate({
  tone,
  image,
  icon: Icon,
  chip,
  title,
  lead,
  next,
  primary,
  secondary,
}: {
  tone: GateTone;
  /** Illustration room (STAFF_ART.*); null shows the empty branded room. */
  image: string | null;
  icon: (props: { className?: string; "aria-hidden"?: boolean | "true" }) => ReactNode;
  chip: string;
  title: string;
  lead: string;
  /** The highlighted "What to do next" text. */
  next: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  const t = TONE[tone];
  return (
    <div className="mx-auto max-w-[920px] pt-4 min-[768px]:pt-10">
      <section className="ap-card relative grid overflow-hidden rounded-[22px] p-0 min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <span className={`absolute inset-x-0 top-0 z-[1] h-1 ${t.stripe}`} aria-hidden="true" />
        {/* Illustration room */}
        <div className="relative h-[200px] bg-(--ap-tint) min-[768px]:h-auto min-[768px]:min-h-[380px]">
          {image ? (
            // Transparent illustrations sit whole on the tint (never cropped).
            <Image src={image} alt="" fill sizes="(max-width: 767px) 100vw, 440px" className="object-contain p-3 min-[768px]:p-5" priority />
          ) : (
            // Empty illustration room until the art is supplied.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(rgba(105,84,200,.16)_1px,transparent_1px)] [background-size:14px_14px]" aria-hidden="true">
              <span className={`flex size-16 items-center justify-center rounded-2xl bg-white/80 shadow-(--ap-shadow) ${t.ink}`}>
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <span className="text-[12px] font-bold tracking-[.14em] text-(--ap-faint) uppercase">Illustration</span>
            </div>
          )}
        </div>

        <div className="flex flex-col p-5 min-[768px]:p-8">
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold tracking-[.08em] uppercase ${t.chip}`}>
            <Icon className="size-3.5" aria-hidden="true" />
            {chip}
          </span>
          <h1 className="mt-3 text-[28px] leading-tight font-bold text-(--ap-ink) min-[768px]:text-[32px]">{title}</h1>
          <p className="ap-bd mt-2">{lead}</p>

          <div className={`mt-4 rounded-[14px] border-l-4 px-4 py-3 ${t.box}`} role={tone === "critical" ? "alert" : undefined}>
            <b className={`block text-[14px] font-bold ${t.ink}`}>What to do next</b>
            <p className="mt-0.5 text-[15px] leading-[1.55] text-(--ap-ink)">{next}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 max-[480px]:flex-col">
            <ActionPill href={primary.href} variant="dark" fit className="max-[480px]:w-full">
              {primary.label}
            </ActionPill>
            {secondary ? (
              <ActionPill href={secondary.href} variant="outline" fit arrow={false} className="max-[480px]:w-full">
                {secondary.label}
              </ActionPill>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

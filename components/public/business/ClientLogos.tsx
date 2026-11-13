import Image from "next/image";
import { CLIENT_LOGOS } from "@/lib/public-site/assets";
import { CLIENTS } from "@/lib/public-site/content";
import { Reveal } from "@/components/public/kit";
import { Eyebrow, T } from "@/components/public/primitives";

/**
 * "Trusted by 20+ hospitality businesses" (Business-*.dc.html "CLIENT
 * LOGOS" - unlabelled on the mobile board but present, same section). Unlike
 * Home's ClientMarquee, this is a plain static grid (6 cols desktop / 3
 * mobile), not a raised overlapping card and not auto-scrolling - the
 * wireframe draws it as an ordinary section, so it is not built on top of
 * ClientMarquee.
 */
export function ClientLogos() {
  return (
    <section className="flex flex-col gap-4 px-5 py-12 wf-d:gap-6 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(80*var(--u))]">
      <Reveal className="flex flex-col gap-4 wf-d:gap-6">
        <Eyebrow className="!text-(--muted-text)">{CLIENTS.label}</Eyebrow>
        <div className="grid grid-cols-3 gap-3 wf-d:grid-cols-6 wf-d:gap-7">
          {CLIENTS.names.map((name) => {
            const src = CLIENT_LOGOS[name] ?? null;
            return (
              <div key={name} className="ps-logo">
                {src ? (
                  <span className="relative block h-full w-full">
                    <Image src={src} alt={name} fill sizes="200px" className="object-contain" />
                  </span>
                ) : (
                  <T>{name}</T>
                )}
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

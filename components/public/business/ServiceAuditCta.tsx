import { SERVICE_AUDIT_CTA } from "@/lib/public-site/business-content";
import { Btn, Reveal } from "@/components/public/kit";
import { T } from "@/components/public/primitives";
import { BuildingIcon } from "@/components/public/icons";

/**
 * "Start with a service audit" (Business-*.dc.html "SERVICE AUDIT CTA"):
 * purple-gradient closing panel - headline on one side, body copy / CTA /
 * phone number on the other. Desktop: side by side. Mobile: stacked.
 */
export function ServiceAuditCta() {
  return (
    <section
      className="flex flex-col gap-6 px-5 py-16 text-white wf-d:flex-row wf-d:items-center wf-d:justify-between wf-d:gap-16 wf-d:px-[calc(96*var(--u))] wf-d:py-[calc(110*var(--u))]"
      style={{ background: "var(--purple-gradient)" }}
    >
      <Reveal>
        <h2 className="ps-serif max-w-none [--fs-d:67] [--fs-m:30] wf-d:max-w-[13ch]">
          <T>{SERVICE_AUDIT_CTA.headlineLead}</T>{" "}
          <span className="text-(--antique-gold)">
            <T>{SERVICE_AUDIT_CTA.headlineAccent}</T>
          </span>
        </h2>
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col items-start gap-4">
        <p className="max-w-none text-[15px] leading-[1.5] text-white/80 wf-d:max-w-[34ch] wf-d:text-base">
          <T>{SERVICE_AUDIT_CTA.body}</T>
        </p>
        <Btn href={SERVICE_AUDIT_CTA.cta.href} label={SERVICE_AUDIT_CTA.cta.label} variant="bw" hero icon={<BuildingIcon size={18} />} className="!h-12" />
        <p className="text-[15px] text-white/80">
          <T>{SERVICE_AUDIT_CTA.phoneLead}</T>{" "}
          <a href={SERVICE_AUDIT_CTA.phoneHref} className="!text-white/80 hover:!text-white">
            <T>{SERVICE_AUDIT_CTA.phone}</T>
          </a>
        </p>
      </Reveal>
    </section>
  );
}

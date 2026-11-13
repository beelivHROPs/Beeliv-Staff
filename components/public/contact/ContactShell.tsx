import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/public/PageHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MenuProvider } from "@/components/public/SiteHeader";
import { SlotImage } from "@/components/public/SlotImage";
import { Reveal, SoftLink } from "@/components/public/kit";
import { Eyebrow, T, stagger } from "@/components/public/primitives";
import { LocationPinIcon, MailIcon, PhoneIcon } from "@/components/public/icons";
import { CONTACT_HERO, CONTACT_INFO, CONTACT_NAV_ACTIVE } from "@/lib/public-site/contact-content";

/**
 * Contact page frame (Contact-Desktop / Contact-Mobile.dc.html): standard
 * header, "How can we help?" hero, then a form + contact-details layout that
 * differs by breakpoint -
 *  - Desktop (>= 820px): form card + a details aside (optional staff photo,
 *    email/phone/office, socials) side by side.
 *  - Mobile: form full width, then a separate white "Contact Info" section
 *    below it (no photo - the wireframe draws none there).
 * `children` is the form column: the live form, or its skeleton.
 */
export function ContactShell({ children }: { children: ReactNode }) {
  return (
    <MenuProvider>
      {/* `au-shell` only supplies the shared error-colour variables. */}
      <div className="au-shell">
        <PageHeader activeHref={CONTACT_NAV_ACTIVE} />
        <main className="mx-auto max-w-[calc(1440*var(--u))]">
          {/* Hero */}
          <section className="flex flex-col gap-3.5 px-5 pt-11 pb-7 wf-d:grid wf-d:grid-cols-[minmax(0,1fr)_calc(460*var(--u))] wf-d:items-end wf-d:gap-[calc(96*var(--u))] wf-d:px-[calc(96*var(--u))] wf-d:pt-[calc(110*var(--u))] wf-d:pb-[calc(64*var(--u))]">
            <div className="flex flex-col gap-3.5 wf-d:gap-[22px]">
              <Reveal when="mount" y={12}>
                <Eyebrow className="!text-[11px] wf-d:!text-[12px]">{CONTACT_HERO.eyebrow}</Eyebrow>
              </Reveal>
              <Reveal when="mount" y={16} delay={stagger(1)}>
                <h1 className="ps-serif [--fs-d:67] [--fs-m:30]">
                  <T>{CONTACT_HERO.titleLead}</T>{" "}
                  <span className="ps-hl-b italic">
                    <T>{CONTACT_HERO.titleAccent}</T>
                  </span>
                </h1>
              </Reveal>
            </div>
            <Reveal when="mount" y={16} delay={stagger(2)}>
              <p className="ps-bd !text-[17px]">
                <span className="hidden wf-d:inline">
                  <T>{CONTACT_HERO.bodyDesktop}</T>
                </span>
                <span className="wf-d:hidden">
                  <T>{CONTACT_HERO.bodyMobile}</T>
                </span>
              </p>
            </Reveal>
          </section>

          {/* Form + desktop aside */}
          <section className="px-5 pb-12 wf-d:grid wf-d:grid-cols-[minmax(0,1fr)_calc(400*var(--u))] wf-d:items-start wf-d:gap-12 wf-d:px-[calc(96*var(--u))] wf-d:pb-[calc(120*var(--u))]">
            <div>{children}</div>

            <aside className="hidden flex-col gap-7 wf-d:flex">
              <Reveal>
                <SlotImage
                  slot="contactStaff"
                  className="h-[260px] rounded-[20px] bg-white"
                  fit="contain-bottom"
                  sizes="400px"
                />
              </Reveal>
              <Reveal delay={stagger(1)} className="flex flex-col gap-6">
                <ContactInfoBlock />
              </Reveal>
            </aside>
          </section>

          {/* Mobile-only contact info section */}
          <section className="flex flex-col gap-5 bg-white px-5 py-12 wf-d:hidden">
            <ContactInfoBlock mobile />
          </section>
        </main>
        <SiteFooter />
      </div>
    </MenuProvider>
  );
}

function ContactInfoBlock({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <ContactInfoIcon icon={MailIcon} />
        <div className="flex flex-col gap-1.5">
          <Eyebrow className="!text-[11px] !text-(--muted-text)">{CONTACT_INFO.email.label}</Eyebrow>
          <a href={CONTACT_INFO.email.href} className="text-[17px] !text-(--ink) wf-d:text-[18px]">
            <T>{CONTACT_INFO.email.value}</T>
          </a>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <ContactInfoIcon icon={PhoneIcon} />
        <div className="flex flex-col gap-1.5">
          <Eyebrow className="!text-[11px] !text-(--muted-text)">{CONTACT_INFO.phone.label}</Eyebrow>
          <a href={CONTACT_INFO.phone.href} className="text-[17px] !text-(--ink) wf-d:text-[18px]">
            <T>{CONTACT_INFO.phone.value}</T>
          </a>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <ContactInfoIcon icon={LocationPinIcon} />
        <div className="flex flex-col gap-1.5">
          <Eyebrow className="!text-[11px] !text-(--muted-text)">{CONTACT_INFO.office.label}</Eyebrow>
          <div className="text-[17px] leading-[1.5] text-(--ink) wf-d:text-[18px]">
            <T>{CONTACT_INFO.office.city}</T>
            {!mobile && CONTACT_INFO.office.address && (
              <>
                <br />
                <span className="ps-sm">
                  <T>{CONTACT_INFO.office.address}</T>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {CONTACT_INFO.socials.length > 0 && (
        <>
      {!mobile && <div className="ps-hr" />}
      <div className="flex gap-5">
        {CONTACT_INFO.socials.map((s) => (
          <SoftLink key={s.label} href={s.href} className="ps-ln">
            <T>{s.label}</T>
          </SoftLink>
        ))}
      </div>
        </>
      )}
    </>
  );
}

/**
 * Small rounded-square icon chip to the left of each Email/Phone/Office row,
 * per the project lead's reference screenshot. Reuses the same
 * icon-chip pattern already established elsewhere on the site (Home's
 * "Verified businesses" trust-item chips in JobsTeaser.tsx - 36px, rounded
 * 10px corner, `rgba(91,8,123,.08)` purple tint).
 */
function ContactInfoIcon({
  icon: Icon,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; stroke?: string; className?: string }>;
}) {
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(91,8,123,.08)]">
      <Icon size={18} strokeWidth={1.7} stroke="var(--beeliv-purple)" />
    </span>
  );
}

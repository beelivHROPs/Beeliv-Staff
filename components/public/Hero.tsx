import Image from "next/image";
import { HERO_AVATARS } from "@/lib/public-site/assets";
import { HERO, WHO_WE_SERVE } from "@/lib/public-site/content";
import { cn } from "@/lib/utils";
import { HeroHeadline, HeroMobileHeader, PillarIndicator } from "./HeroParts";
import { BuildingIcon, PeopleIcon, WhoWeServeIcon } from "./icons";
import { Btn, Float, Reveal, SoftLink, TextLink } from "./kit";
import { DesktopHeader } from "./SiteHeader";
import { SlotImage } from "./SlotImage";
import { T, u } from "./primitives";
import { HeroSculptForm } from "./HeroSculptForm";

/** Overlapping avatar stack (placeholder circles until photos are supplied). */
function AvatarStack({
  count,
  size,
  overlap,
  ring,
  colors,
}: {
  count: number;
  size: number;
  overlap: number;
  ring: string;
  colors: string[];
}) {
  return (
    <div className="flex">
      {Array.from({ length: count }).map((_, i) => {
        const src = HERO_AVATARS[i] ?? null;
        return (
          <span
            key={i}
            className="relative block shrink-0 overflow-hidden rounded-full"
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -overlap,
              background: colors[i % colors.length],
              border: `2px solid ${ring}`,
            }}
          >
            {src && <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------ DESKTOP -------------------------------- */

function HeroDesktop({ skeleton }: { skeleton: boolean }) {
  return (
    <section className="relative hidden bg-white wf-d:block">
      {/* Lounge photograph: full-bleed right side, behind cutout + form. */}
      <SlotImage
        slot="heroPhoto"
        placeholderClassName="ps-img ps-img-dk"
        className="absolute top-0 right-0 h-full"
        style={{ width: "min(55.5556%, calc(50% + 80px))" }}
        parallax={32}
        sizes="55vw"
        priority
      />

      {/* Stage: the wireframe's 1440 x 920 composition, scaled as one unit,
          at a shorter 1440 x 780 aspect ratio (project-lead direction: the
          920-tall board was pushing the CTAs/trust line below the fold on a
          typical laptop viewport once real photos were wired in - the
          wireframe's own height is not sacred here). Every child below is
          still positioned in %/calc() against THIS box, so the whole
          composition scales down as one unit. */}
      <div
        className="relative z-[1] mx-auto"
        style={{
          width: "100%",
          aspectRatio: "1440 / 780",
          // Below ~1140px the 1440x780 box gets too short for the text stack
          // (it would run under ClientMarquee's overlap), so it keeps a floor.
          minHeight: "var(--hero-min-h, 0px)",
        }}
      >
        <HeroSculptForm />

        {/* Woman cutout (desktop PNG): bottom-anchored, breaks the white/photo edge. */}
        <Reveal
          when="mount"
          y={60}
          delay={0.35}
          className="hero-cutout absolute z-[2] [@media(min-width:960px)_and_(max-width:1179.98px)]:!left-[53%]"
          style={{
            // Nudged left from the wireframe's 53.4722% so her shoulder/arm
            // reads into roughly the composition's horizontal center
            // (project-lead reference mockup), without the box's left edge
            // passing the text column's right edge (~51.81%).
            left: "45%",
            top: "16.3043%",
            width: "32.6389%",
            height: "83.6957%",
          }}
        >
          <SlotImage
            slot="heroCutout"
            fit="contain-bottom"
            placeholderClassName="ps-img-dash"
            className="h-full w-full"
            parallax={20}
            sizes="33vw"
            priority
            style={{ borderRadius: "50% 50% 0 0 / 30.519% 30.519% 0 0" }}
          />
        </Reveal>

        <DesktopHeader />

        {/* Text column. Top offset and internal gaps are tightened from the
            wireframe's 19.5652%/26px (and the headline stepped down from
            67px) so the whole stack clears ClientMarquee's fixed -76px
            desktop overlap (wf-d:-mt-[calc(76*var(--u))]) at this shorter
            stage height - at the original values the trust line ended up
            hidden behind that card once the hero got shorter. Top was
            17% right after the stage shrank (headline/CTAs/trust line sat
            too close to the header); nudged back down to 20% for more
            breathing room - still clears the trust line above the fold at
            1440x800/900 with margin before ClientMarquee's overlap. */}
        <div
          className="absolute z-[4] flex flex-col"
          style={{ left: "6.6667%", top: "20%", width: "45.1389%", gap: u(18) }}
        >
          <Reveal when="mount" delay={0.1} className="ps-eb">
            <T>{HERO.eyebrow}</T>
          </Reveal>
          <HeroHeadline
            lead={HERO.headlineLead}
            accent={HERO.headlineAccent}
            accentClassName="ps-hl"
            className="ps-serif [--fs-d:54]"
            skeleton={skeleton}
          />
          <Reveal when="mount" delay={0.55}>
            <p className="ps-bd" style={{ maxWidth: "46ch" }}>
              <T>{HERO.body}</T>
            </p>
          </Reveal>
          <Reveal when="mount" delay={0.65} className="flex flex-wrap gap-x-2.5 gap-y-3 pt-2 min-[1100px]:gap-x-4">
            <Btn
              href={HERO.primaryCta.href}
              label={HERO.primaryCta.label}
              variant="bp"
              hero
              icon={<BuildingIcon size={18} />}
              className="!h-12"
            />
            <Btn
              href={HERO.secondaryCta.href}
              label={HERO.secondaryCta.label}
              variant="bo"
              className="!h-12 !px-5 min-[1100px]:!px-7"
            />
          </Reveal>
          <Reveal when="mount" delay={0.75} className="flex items-center gap-4 pt-3">
            <AvatarStack
              count={4}
              size={40}
              overlap={10}
              ring="#fff"
              colors={["#E8E5EE", "rgba(255,255,255,.72)"]}
            />
            <p className="ps-sm" style={{ maxWidth: "30ch" }}>
              <T>{HERO.trustLine}</T>
            </p>
          </Reveal>
        </div>

        {/* Skilled Hospitality Talent card. Hidden below 1180px (matches the
            01/02/03 rail's own threshold just below): at narrower desktop
            widths - iPad portrait 1024, Surface Duo Open 1114, Kiosk 1080,
            "request desktop site" on a phone (~980-1024) - its right-anchored
            position lands on top of the woman's face in the photo (project
            lead, 2026-10-01). The headline/CTAs/trust line stand on their
            own without it; it returns once there's room to sit clear of her. */}
        <Float
          delay={1}
          className="absolute z-[5] hidden min-[1180px]:block"
          // The card's text is fixed-size (15/13px) so the card must not shrink
          // below the wireframe's 250px or the title re-wraps to 3 lines right
          // after the desktop switch (820px). Its right edge stays where the wireframe puts it (73.6111% +
          // 17.3611% = 90.9722%); any extra width grows leftwards, away from
          // the 01/02/03 indicator.
          style={{
            // min(): below ~1440 the 01/02/03 rail (right-anchored, ~116px incl.
            // gap) would otherwise touch the card, so the card yields to it.
            left: "calc(min(90.9722%, 100% - 116px) - max(17.3611%, 250px))",
            top: "27.1739%",
            width: "max(17.3611%, 250px)",
          }}
        >
          <div
            className="ps-cd flex gap-3.5 p-5"
            style={{ boxShadow: "0 12px 32px rgba(17,17,27,.12)" }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(91,8,123,.08)]">
              <PeopleIcon size={20} strokeWidth={1.8} className="text-(--beeliv-purple)" />
            </span>
            <div className="flex flex-col gap-1">
              <div className="text-[15px] font-semibold">
                <T>{HERO.talentCard.title}</T>
              </div>
              <div className="ps-sm !text-[13px]">
                <T>{HERO.talentCard.sub}</T>
              </div>
              <SoftLink href={HERO.talentCard.href} className="text-[13px] font-medium">
                <T>→</T>
              </SoftLink>
            </div>
          </div>
        </Float>

        {/* 01 People / 02 Systems / 03 Service indicator */}
        <Reveal
          when="mount"
          delay={1.1}
          className="absolute z-[5] hidden min-[1180px]:block"
          style={{ right: "1.3889%", top: "27.1739%", width: "5.8333%", minWidth: 88 }}
        >
          <PillarIndicator skeleton={skeleton} />
        </Reveal>

        {/* Our Story */}
        <Reveal
          when="mount"
          delay={1.15}
          className="absolute z-[5]"
          style={{ left: "min(86.1111%, calc(100% - 150px))", top: "60.8696%" }}
        >
          <TextLink
            href={HERO.storyLink.href}
            label={HERO.storyLink.label}
            className="!border-white/60 !pb-1.5 !text-[20px] !text-white"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------- MOBILE -------------------------------- */

function HeroMobile({ skeleton }: { skeleton: boolean }) {
  return (
    <section className="relative bg-(--deep-plum) pb-[46px] text-white wf-d:hidden">
      {/* Full-bleed hospitality/lounge photo (project-lead reference design,
          not the wireframe's composed woman+lounge crop - see assets.ts). */}
      <SlotImage
        slot="heroMobilePhoto"
        placeholderClassName="ps-img ps-img-dk"
        className="hero-mobile-photo absolute inset-x-0 top-0 h-[470px]"
        // Only shown below 820px (the desktop hero is shown above), so on wider screens this image takes no space.
        sizes="(min-width: 820px) 1px, 100vw"
        priority
      />
      {/* Scrim: photo dissolves into the plum so the headline stays legible. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[250px] h-[230px]"
        style={{ background: "linear-gradient(180deg, rgba(37,0,68,0) 0%, #250044 85%)" }}
      />

      <HeroMobileHeader />

      <div className="relative z-[5] flex flex-col gap-3.5 px-5 pt-[150px]">
        <Reveal when="mount" delay={0.1} className="ps-eb !text-(--antique-gold)">
          <T>{HERO.eyebrow}</T>
        </Reveal>
        <HeroHeadline
          lead={HERO.headlineLead}
          accent={HERO.headlineAccent}
          accentClassName="text-(--antique-gold)"
          className="ps-serif text-white"
          skeleton={skeleton}
        />

        <Reveal
          when="mount"
          delay={0.5}
          className="grid grid-cols-[minmax(0,1fr)_128px] items-center gap-3"
        >
          <p className="text-[17px] leading-[1.6] text-white/[.86]">
            <T>{HERO.body}</T>
          </p>
          <SoftLink
            href={HERO.talentCard.href}
            className="flex flex-col gap-1.5 rounded-[14px] bg-white/[.93] p-3 !text-(--ink)"
          >
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[rgba(91,8,123,.08)]">
              <PeopleIcon size={16} strokeWidth={1.8} className="text-(--beeliv-purple)" />
            </span>
            <span className="text-[12.5px] leading-[1.25] font-semibold">
              <T>{HERO.talentCard.title}</T>
            </span>
            <span className="text-[12px] leading-[1.35] text-(--muted-text)">
              <T>{HERO.talentCard.sub}</T>
            </span>
            <span className="ps-hl flex h-6 w-6 items-center justify-center self-end rounded-full border border-[rgba(91,8,123,.35)] text-xs">
              →
            </span>
          </SoftLink>
        </Reveal>

        <Reveal when="mount" delay={0.6} className="flex flex-col gap-2.5 pt-1.5">
          <Btn
            href={HERO.primaryCta.href}
            label={HERO.primaryCta.label}
            variant="bp"
            hero
            icon={<BuildingIcon size={18} />}
            className="!h-[52px] !text-[15px]"
          />
          <Btn
            href={HERO.secondaryCta.href}
            label={HERO.secondaryCta.label}
            variant="bo-w"
            className="!h-[46px] !gap-1.5 !px-2.5 !text-[15px]"
          />
        </Reveal>

        <Reveal when="mount" delay={0.7} className="flex items-center gap-3 pt-1">
          <AvatarStack
            count={5}
            size={30}
            overlap={8}
            ring="#250044"
            colors={["#5A5468", "#6B6479"]}
          />
          <p className="text-[12.5px] leading-[1.4] text-white/[.82]">
            <T>{HERO.trustLine}</T>
          </p>
        </Reveal>

        <Reveal when="mount" delay={0.8} className="mt-3.5">
          <nav
            aria-label="Who we serve"
            className="grid grid-cols-6 text-center text-[12px] leading-[1.25]"
          >
            {WHO_WE_SERVE.map((s, i) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col items-center gap-[7px] p-0.5 !text-white",
                  i > 0 && "border-l border-white/20",
                )}
              >
                <WhoWeServeIcon name={s.icon} size={22} strokeWidth={1.5} />
                <T>{s.label}</T>
              </div>
            ))}
          </nav>
        </Reveal>
      </div>
    </section>
  );
}

export function Hero({ skeleton = false }: { skeleton?: boolean }) {
  return (
    <>
      <HeroDesktop skeleton={skeleton} />
      <HeroMobile skeleton={skeleton} />
      {/* Marks the end of the hero; the sticky nav appears once it scrolls past. */}
      <div id="ps-hero-end" aria-hidden="true" className="h-0" />
    </>
  );
}

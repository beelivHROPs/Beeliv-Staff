import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react";
import { PHOSPHOR } from "./phosphor";
import { BedMark, BellMark, ChefHatMark, ClipboardMark, CocktailMark, CutleryMark, KeyMark, TillMark } from "./marks";

/**
 * Icon direction B, "Bold marks in tiles, restrained" (project lead, 2026-10-26).
 * A feature glyph (Fill / Bold / Duotone, or one of the eight Beeliv marks) on a rounded-square tint tile.
 * Use for: quick actions, notification leads, empty states, department and topic tiles, checklist steps.
 * Never in: navigation, buttons, inputs, tables, chips, status marks or number badges (those keep the thin line icons).
 *
 * Colours come only from the app's own --ap-* tokens (Applicant, Staff and their dark mode), so no app needs a variant.
 * One strong colour block per screen: use lavender and sage freely, plum (white glyph) for one lead tile, gold for
 * at most one accent tile per screen and never in notifications.
 */
export type TileTint = "lavender" | "sage" | "plum" | "gold";
export type TileSize = 40 | 44 | 48 | 56 | 84;
export type GlyphWeight = "fill" | "bold" | "duotone";

export type GlyphName =
  // Phosphor (MIT) general glyphs
  | "upload"
  | "profile"
  | "alert-bell"
  | "bookmark"
  | "shield"
  | "clock"
  | "calendar"
  | "medal"
  | "briefcase"
  | "search"
  | "bell"
  // Beeliv hospitality marks (original)
  | "chef-hat"
  | "cocktail"
  | "service-bell"
  | "cutlery"
  | "key"
  | "bed"
  | "till"
  | "clipboard";

type GlyphProps = SVGProps<SVGSVGElement>;
export type GlyphComponent = ComponentType<GlyphProps>;

const PHOSPHOR_KEY: Partial<Record<GlyphName, string>> = {
  upload: "file-arrow-up",
  profile: "user-circle",
  "alert-bell": "bell-ringing",
  bookmark: "bookmark-simple",
  shield: "shield-check",
  clock: "clock",
  calendar: "calendar-check",
  medal: "medal",
  briefcase: "briefcase",
  search: "magnifying-glass",
  bell: "bell",
};

const MARKS: Partial<Record<GlyphName, GlyphComponent>> = {
  "chef-hat": ChefHatMark,
  cocktail: CocktailMark,
  "service-bell": BellMark,
  cutlery: CutleryMark,
  key: KeyMark,
  bed: BedMark,
  till: TillMark,
  clipboard: ClipboardMark,
};

const cache = new Map<string, GlyphComponent>();

function phosphorGlyph(key: string, weight: GlyphWeight): GlyphComponent | null {
  const g = PHOSPHOR[key];
  if (!g) return null;
  const id = `${key}:${weight}`;
  const hit = cache.get(id);
  if (hit) return hit;
  let body: ReactNode;
  if (weight === "duotone" && g.regular && (g.duoBody || g.fill)) {
    body = (
      <>
        <path d={g.duoBody ?? g.fill} opacity="0.2" />
        <path d={g.regular} />
      </>
    );
  } else {
    const d = weight === "bold" ? (g.bold ?? g.fill ?? g.regular) : (g.fill ?? g.bold ?? g.regular);
    if (!d) return null;
    body = <path d={d} />;
  }
  function Glyph(props: GlyphProps) {
    return (
      <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
        {body}
      </svg>
    );
  }
  Glyph.displayName = `Glyph(${id})`;
  cache.set(id, Glyph);
  return Glyph;
}

/** The glyph component for a registry name, or null when the name is unknown. `weight` only affects Phosphor glyphs; the Beeliv marks are always solid. */
export function markFor(name: GlyphName, weight: GlyphWeight = "fill"): GlyphComponent | null {
  const mark = MARKS[name];
  if (mark) return mark;
  const key = PHOSPHOR_KEY[name];
  return key ? phosphorGlyph(key, weight) : null;
}

/** Tile background per tint. Opaque (mixed with the surface) so the knock-outs in the marks match the tile exactly. */
const TINT_BG: Record<TileTint, string> = {
  lavender: "color-mix(in srgb, var(--ap-lilac, #efe6f7) 85%, var(--ap-tint-soft, #fff))",
  sage: "color-mix(in srgb, var(--ap-ok, #15803d) 16%, var(--ap-ok-bg, #dcfce7))",
  plum: "var(--staff-fill, var(--client-fill, var(--admin-fill, var(--ap-violet, #5b087b))))",
  gold: "color-mix(in srgb, var(--ap-gold, #e0a82e) 24%, var(--ap-surface, #fff))",
};
const TINT_INK: Record<TileTint, string> = {
  lavender: "var(--ap-violet, #5b087b)",
  sage: "var(--ap-ok, #15803d)",
  plum: "#fff",
  gold: "var(--ap-warn, #8a5a00)",
};

const GLYPH_PX: Record<TileSize, number> = { 40: 24, 44: 26, 48: 28, 56: 30, 84: 48 };
const RADIUS: Record<TileSize, number> = { 40: 14, 44: 14, 48: 16, 56: 16, 84: 22 };

export interface BoldTileProps {
  glyph: GlyphName;
  tint?: TileTint;
  size?: TileSize;
  /** Phosphor weight: "fill" (default, lists), "bold" (quick actions), "duotone" (empty states and the gold accent). */
  weight?: GlyphWeight;
  className?: string;
}

export function BoldTile({ glyph, tint = "lavender", size = 48, weight = "fill", className = "" }: BoldTileProps) {
  const Glyph = markFor(glyph, weight);
  const style = {
    width: size,
    height: size,
    borderRadius: RADIUS[size],
    "--tile-bg": TINT_BG[tint],
    background: "var(--tile-bg)",
    "--cut": "var(--tile-bg)",
    color: TINT_INK[tint],
  } as CSSProperties;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} style={style} aria-hidden="true" data-bold-tile={tint}>
      {Glyph ? <Glyph width={GLYPH_PX[size]} height={GLYPH_PX[size]} /> : null}
    </span>
  );
}

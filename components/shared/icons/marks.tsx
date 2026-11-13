/**
 * The eight Beeliv hospitality marks (original drawings, 2026-10-25 icon preview, direction B).
 * 24 grid, solid shapes, 2px round joins and ends, currentColor. Used large, on a BoldTile (26 to 30px glyph).
 * Knock-outs (bell shine, clipboard tick) use `--cut`, which BoldTile sets to the tile's own colour.
 * Not for dense UI: navigation, buttons, tables and chips keep the thin line icons.
 */
import type { SVGProps } from "react";

export type MarkProps = SVGProps<SVGSVGElement>;

const CUT = "var(--cut, var(--ap-surface, #fff))";

function Svg(props: MarkProps) {
  const { children, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export function ChefHatMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M6.6 14.6A4.6 4.6 0 0 1 7.2 5.7 5 5 0 0 1 12 2.5a5 5 0 0 1 4.8 3.2 4.6 4.6 0 0 1 .6 8.9z" />
      <rect x="7" y="16.5" width="10" height="5" rx="1.75" />
    </Svg>
  );
}

export function CocktailMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M5 4.5h14L12 13z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="11" y="12" width="2" height="8" rx="1" />
      <rect x="7" y="19.5" width="10" height="2.25" rx="1.1" />
      <circle cx="17.2" cy="4.2" r="2" opacity=".45" />
    </Svg>
  );
}

export function BellMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 17.5a7.5 7.5 0 0 1 15 0z" />
      <rect x="2.75" y="18.75" width="18.5" height="2.5" rx="1.25" />
      <circle cx="12" cy="4.6" r="1.8" />
      <rect x="11" y="5" width="2" height="3" rx="1" />
      <path d="M7.6 14a4.8 4.8 0 0 1 2.8-2.9" style={{ stroke: CUT }} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function CutleryMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path d="M5 3.5v5.5a2.75 2.75 0 0 0 5.5 0V3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M7.75 11.5v8.75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M17.5 14.5V3.2c-2.7 1.4-3.9 4.6-3.9 8.1v3.2z" />
      <path d="M17.5 12V20.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function KeyMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M8 2.75a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5zm0 3.4a1.85 1.85 0 1 0 0 3.7 1.85 1.85 0 0 0 0-3.7z" />
      <path d="M11.8 11.8 20 20M16.4 16.4l2.6-2.6M19.2 19.2l1.9-1.9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function BedMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4" width="2.5" height="16" rx="1.25" />
      <rect x="2.5" y="13.5" width="19" height="4.5" rx="1.75" />
      <rect x="7" y="8.5" width="5" height="3.5" rx="1.75" opacity=".45" />
      <path d="M14 12v-1.5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2V12z" />
      <rect x="19" y="18" width="2.5" height="2.5" rx="1.25" />
    </Svg>
  );
}

export function TillMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <rect x="7.5" y="2.75" width="9" height="5.5" rx="1.75" opacity=".45" />
      <path
        fillRule="evenodd"
        d="M6.25 10h11.5A2.25 2.25 0 0 1 20 12.25v6.5A2.25 2.25 0 0 1 17.75 21H6.25A2.25 2.25 0 0 1 4 18.75v-6.5A2.25 2.25 0 0 1 6.25 10zM7 12.8v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zM7 16.8v1.6h10v-1.6z"
      />
    </Svg>
  );
}

export function ClipboardMark(props: MarkProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4.5" width="15" height="17" rx="3" />
      <rect x="8.5" y="2.25" width="7" height="4.5" rx="1.75" style={{ stroke: CUT }} strokeWidth="1.5" />
      <path d="m8.4 13.4 2.5 2.5 4.8-5" style={{ stroke: CUT }} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

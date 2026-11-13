/**
 * Overview hero background — the wireframe's own DECO artwork, copied
 * verbatim (beeliv-website/applicant/index.html, `var DECO`): soft lilac
 * circles, a white glow, two flowing violet lines, dot grids and small
 * violet/gold sparkles. Sits behind the hero content at 55% opacity
 * (wireframe `.hero-deco{opacity:.55}`), clipped to the hero's rounded frame.
 */
export function HeroDeco() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] opacity-55">
      <svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice" className="block size-full">
        <defs>
          <radialGradient id="ap-hg1" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ap-hg2" x1="0" x2="1">
            <stop offset="0" stopColor="#8A0AA3" stopOpacity="0" />
            <stop offset=".5" stopColor="#8A0AA3" stopOpacity=".22" />
            <stop offset="1" stopColor="#5B087B" stopOpacity=".05" />
          </linearGradient>
          <pattern id="ap-hdots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="#5B087B" opacity=".16" />
          </pattern>
        </defs>
        <circle cx="560" cy="250" r="190" fill="#E7D3F2" opacity=".75" />
        <circle cx="880" cy="-10" r="170" fill="#E9D8F4" opacity=".7" />
        <circle cx="700" cy="40" r="120" fill="url(#ap-hg1)" />
        <path d="M300 250C420 170 520 210 610 150S820 40 1000 90" fill="none" stroke="url(#ap-hg2)" strokeWidth="2" />
        <path d="M340 270C470 200 560 240 660 180S860 80 1000 130" fill="none" stroke="url(#ap-hg2)" strokeWidth="1.2" />
        <path d="M0 40C120 20 190 70 300 40" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
        <rect x="780" y="150" width="130" height="90" fill="url(#ap-hdots)" />
        <rect x="380" y="18" width="84" height="56" fill="url(#ap-hdots)" />
        <g fill="#8A0AA3" opacity=".45">
          <path d="M470 150l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
          <path d="M745 42l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".7" />
        </g>
        <g fill="#E0A82E" opacity=".8">
          <path d="M650 118l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" />
        </g>
        <circle cx="420" cy="215" r="5" fill="#fff" />
        <circle cx="930" cy="235" r="7" fill="#fff" opacity=".8" />
        <circle cx="522" cy="36" r="4" fill="#8A0AA3" opacity=".3" />
      </svg>
    </div>
  );
}

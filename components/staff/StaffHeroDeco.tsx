/**
 * Staff version of the Applicant hero background artwork (components/applicant/
 * HeroDeco.tsx): same composition - soft circles, glow, two flowing lines, dot
 * grids, small sparkles - recoloured to Indigo-Violet. Decoration only.
 */
export function StaffHeroDeco() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] opacity-60">
      <svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMid slice" className="block size-full">
        <defs>
          <radialGradient id="st-hg1" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="st-hg2" x1="0" x2="1">
            <stop offset="0" stopColor="#6954C8" stopOpacity="0" />
            <stop offset=".5" stopColor="#6954C8" stopOpacity=".22" />
            <stop offset="1" stopColor="#4F3AA8" stopOpacity=".05" />
          </linearGradient>
          <pattern id="st-hdots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="#4F3AA8" opacity=".16" />
          </pattern>
        </defs>
        <circle cx="560" cy="250" r="190" fill="#DDD6F3" opacity=".75" />
        <circle cx="880" cy="-10" r="170" fill="#E4DEF6" opacity=".7" />
        <circle cx="700" cy="40" r="120" fill="url(#st-hg1)" />
        <path d="M300 250C420 170 520 210 610 150S820 40 1000 90" fill="none" stroke="url(#st-hg2)" strokeWidth="2" />
        <path d="M340 270C470 200 560 240 660 180S860 80 1000 130" fill="none" stroke="url(#st-hg2)" strokeWidth="1.2" />
        <path d="M0 40C120 20 190 70 300 40" fill="none" stroke="#fff" strokeWidth="2" opacity=".7" />
        <rect x="780" y="150" width="130" height="90" fill="url(#st-hdots)" />
        <rect x="380" y="18" width="84" height="56" fill="url(#st-hdots)" />
        <g fill="#6954C8" opacity=".45">
          <path d="M470 150l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
          <path d="M745 42l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".7" />
        </g>
        <g fill="#E0A82E" opacity=".8">
          <path d="M650 118l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" />
        </g>
        <circle cx="420" cy="215" r="5" fill="#fff" />
        <circle cx="930" cy="235" r="7" fill="#fff" opacity=".8" />
        <circle cx="522" cy="36" r="4" fill="#6954C8" opacity=".3" />
      </svg>
    </div>
  );
}
